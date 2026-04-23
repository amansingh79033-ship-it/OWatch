import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { CloudWatchClient, GetMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Time drift detection - AWS requires time within 5 minutes of server time
let cachedTimeOffset: number | null = null;
const TIME_DRIFT_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

async function detectTimeDrift(): Promise<{ drift: number; valid: boolean }> {
  if (cachedTimeOffset !== null) {
    return { drift: cachedTimeOffset, valid: Math.abs(cachedTimeOffset) < TIME_DRIFT_THRESHOLD_MS };
  }
  
  try {
    const serverStartTime = Date.now();
    const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', { 
      method: 'GET'
    });
    const serverEndTime = Date.now();
    
    if (!response.ok) throw new Error('Time service unavailable');
    
    const data = await response.json();
    const remoteTime = new Date(data.datetime).getTime();
    const localMidpoint = serverStartTime + (serverEndTime - serverStartTime) / 2;
    
    cachedTimeOffset = localMidpoint - remoteTime;
    
    console.log(`Time drift detected: ${(cachedTimeOffset / 1000 / 60).toFixed(1)} minutes`);
    
    return { 
      drift: cachedTimeOffset, 
      valid: Math.abs(cachedTimeOffset) < TIME_DRIFT_THRESHOLD_MS 
    };
  } catch (error) {
    console.warn('Could not detect time drift:', error);
    cachedTimeOffset = 0;
    return { drift: 0, valid: true };
  }
}

// API: Get time drift status
app.get('/api/time-check', async (req, res) => {
  try {
    const { drift, valid } = await detectTimeDrift();
    res.json({
      driftMs: drift,
      driftMinutes: (drift / 1000 / 60).toFixed(1),
      isValid: valid,
      warning: valid ? null : `System time is ${Math.abs(drift / 1000 / 60).toFixed(1)} minutes ${drift > 0 ? 'behind' : 'ahead'} actual time.`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AWS Client Helper
const getVal = (req: any, key: string, fallback?: string): string | undefined => {
  const val = req.headers[key];
  const str = Array.isArray(val) ? val[0] : val;
  return str || fallback;
};

const getCWClient = (req: any) => {
  const accessKeyId = getVal(req, 'x-aws-key', process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = getVal(req, 'x-aws-secret', process.env.AWS_SECRET_ACCESS_KEY);
  const region = getVal(req, 'x-aws-region', process.env.AWS_REGION) || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials are not configured.');
  }

  return new CloudWatchClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
};

const getCEClient = (req: any) => {
  const accessKeyId = getVal(req, 'x-aws-key', process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = getVal(req, 'x-aws-secret', process.env.AWS_SECRET_ACCESS_KEY);

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials are not configured.');
  }

  return new CostExplorerClient({
    region: 'us-east-1', 
    credentials: { accessKeyId, secretAccessKey },
  });
};

const getSNSClient = (req: any) => {
  const accessKeyId = getVal(req, 'x-aws-key', process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = getVal(req, 'x-aws-secret', process.env.AWS_SECRET_ACCESS_KEY);
  const region = getVal(req, 'x-aws-region', process.env.AWS_REGION) || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials are not configured.');
  }

  return new SNSClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
};

const getEC2Client = (req: any) => {
  const accessKeyId = getVal(req, 'x-aws-key', process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = getVal(req, 'x-aws-secret', process.env.AWS_SECRET_ACCESS_KEY);
  const region = getVal(req, 'x-aws-region', process.env.AWS_REGION) || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials are not configured.');
  }

  return new EC2Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
};

// API: Fetch Metrics
app.post('/api/metrics', async (req, res) => {
  try {
    const { namespace, metricName, dimensions, period = 300, hours = 6, start, end } = req.body;
    const client = getCWClient(req);
    
    // Get time drift and apply correction
    const { drift } = await detectTimeDrift();
    
    // end/start come in as ISO strings from req.body, convert to Date then correct
    const endTime = end ? new Date(new Date(end as string).getTime() - drift) : new Date(Date.now() - drift);
    const startTime = start ? new Date(new Date(start as string).getTime() - drift) : new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    const command = new GetMetricDataCommand({
      MetricDataQueries: [
        {
          Id: 'm1',
          MetricStat: {
            Metric: {
              Namespace: namespace,
              MetricName: metricName,
              Dimensions: dimensions,
            },
            Period: period,
            Stat: 'Average',
          },
          ReturnData: true,
        },
      ],
      StartTime: startTime,
      EndTime: endTime,
    });

    const response = await client.send(command);
    const results = response.MetricDataResults?.[0];

    if (!results) {
      return res.json([]);
    }

    const data = (results.Timestamps || []).map((t, i) => ({
      timestamp: t.getTime(),
      value: results.Values?.[i] || 0,
    })).sort((a, b) => a.timestamp - b.timestamp);

    res.json(data);
  } catch (error: any) {
    console.error('CloudWatch Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Cost Monitoring — always last 24 hours (yesterday → today)
app.get('/api/cost', async (req, res) => {
  try {
    const client = getCEClient(req);
    const timezone = getVal(req, 'x-timezone') || 'UTC';

    // Compute today and yesterday in the user's timezone
    const safeTimezone = (() => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return timezone;
      } catch {
        return 'UTC';
      }
    })();

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: safeTimezone }).format(new Date());
    // yesterday = today minus 1 day
    const todayMs = new Date(todayStr + 'T12:00:00Z').getTime();
    const yesterdayStr = new Intl.DateTimeFormat('en-CA', { timeZone: safeTimezone }).format(new Date(todayMs - 24 * 60 * 60 * 1000));

    // Cost Explorer: Start inclusive, End exclusive — so Start=yesterday, End=today gives yesterday's data
    const command = new GetCostAndUsageCommand({
      TimePeriod: { Start: yesterdayStr, End: todayStr },
      Granularity: 'DAILY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    });

    const response = await client.send(command);
    
    const dailyCosts = response.ResultsByTime?.map(day => ({
      date: day.TimePeriod?.Start,
      amount: day.Total?.UnblendedCost?.Amount || "0",
      services: day.Groups?.map(g => ({
        name: g.Keys?.[0],
        amount: g.Metrics?.UnblendedCost?.Amount
      })).sort((a, b) => Number(b.amount) - Number(a.amount))
    }));

    res.json(dailyCosts);
  } catch (error: any) {
    console.error('Cost Explorer Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Fetch EC2 Instances
app.get('/api/ec2/instances', async (req, res) => {
  try {
    const client = getEC2Client(req);
    const command = new DescribeInstancesCommand({});
    const response = await client.send(command);
    
    const instances = response.Reservations?.flatMap(r => r.Instances || []).map(i => ({
      instanceId: i.InstanceId,
      type: i.InstanceType,
      state: i.State?.Name,
      publicIp: i.PublicIpAddress || 'N/A',
      launchTime: i.LaunchTime,
      tags: i.Tags
    }));

    res.json(instances || []);
  } catch (error: any) {
    console.error('EC2 Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Send Alert
app.post('/api/alert', async (req, res) => {
  try {
    const { message, subject, type = 'sns' } = req.body;
    
    if (type === 'slack') {
      const webhookUrl = getVal(req, 'x-slack-webhook', process.env.SLACK_WEBHOOK_URL);
      if (!webhookUrl) return res.status(400).json({ error: 'SLACK_WEBHOOK_URL is not configured.' });
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `*${subject || 'CloudWatch Alert'}*\n${message}` })
      });
      
      if (!response.ok) throw new Error('Slack webhook failed');
      return res.json({ success: true });
    }

    const topicArn = getVal(req, 'x-aws-sns-topic', process.env.AWS_SNS_TOPIC_ARN);

    if (!topicArn) {
      return res.status(400).json({ error: 'AWS_SNS_TOPIC_ARN is not configured.' });
    }

    const client = getSNSClient(req);
    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: message,
      Subject: subject || 'CloudWatch Insight Alert',
    });

    await client.send(command);
    res.json({ success: true });
  } catch (error: any) {
    console.error('SNS Error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
