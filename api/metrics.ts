import { GetMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { getCWClient, detectTimeDrift } from './_lib/helpers';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const {
      namespace, metricName, dimensions,
      period = 300, hours = 6, start, end
    } = req.body;

    const client = getCWClient(req);
    const { drift } = await detectTimeDrift();

    // Convert ISO strings → Date, apply time-drift correction
    const endTime   = end
      ? new Date(new Date(end   as string).getTime() - drift)
      : new Date(Date.now() - drift);
    const startTime = start
      ? new Date(new Date(start as string).getTime() - drift)
      : new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    const command = new GetMetricDataCommand({
      MetricDataQueries: [{
        Id: 'm1',
        MetricStat: {
          Metric: { Namespace: namespace, MetricName: metricName, Dimensions: dimensions },
          Period: period,
          Stat: 'Average',
        },
        ReturnData: true,
      }],
      StartTime: startTime,
      EndTime: endTime,
    });

    const response = await client.send(command);
    const results  = response.MetricDataResults?.[0];
    if (!results) return res.json([]);

    const data = (results.Timestamps || [])
      .map((t, i) => ({ timestamp: t.getTime(), value: results.Values?.[i] || 0 }))
      .sort((a, b) => a.timestamp - b.timestamp);

    res.json(data);
  } catch (error: any) {
    console.error('CloudWatch Error:', error);
    res.status(500).json({ error: error.message });
  }
}
