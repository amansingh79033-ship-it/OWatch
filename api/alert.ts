import { PublishCommand } from '@aws-sdk/client-sns';
import { getSNSClient, getVal } from '../_lib/helpers';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { message, subject, type = 'sns' } = req.body;

    // ── Slack webhook ────────────────────────────────────────────
    if (type === 'slack') {
      const webhookUrl = getVal(req, 'x-slack-webhook', process.env.SLACK_WEBHOOK_URL);
      if (!webhookUrl) return res.status(400).json({ error: 'SLACK_WEBHOOK_URL is not configured.' });

      const slackRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `*${subject || 'CloudWatch Alert'}*\n${message}` })
      });
      if (!slackRes.ok) throw new Error('Slack webhook failed');
      return res.json({ success: true });
    }

    // ── SNS ──────────────────────────────────────────────────────
    const topicArn = getVal(req, 'x-aws-sns-topic', process.env.AWS_SNS_TOPIC_ARN);
    if (!topicArn) return res.status(400).json({ error: 'AWS_SNS_TOPIC_ARN is not configured.' });

    const client  = getSNSClient(req);
    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: message,
      Subject: subject || 'CloudWatch Insight Alert',
    });

    await client.send(command);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Alert Error:', error);
    res.status(500).json({ error: error.message });
  }
}
