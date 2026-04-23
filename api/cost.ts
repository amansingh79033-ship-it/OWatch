import { GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { getCEClient, getVal } from './_lib/helpers';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const client  = getCEClient(req);
    const rawTz   = getVal(req, 'x-timezone') || 'UTC';

    // Validate timezone, fall back to UTC if invalid
    const safeTimezone = (() => {
      try { Intl.DateTimeFormat(undefined, { timeZone: rawTz }); return rawTz; }
      catch { return 'UTC'; }
    })();

    // Compute today and yesterday in the user's local timezone
    const now        = new Date();
    const todayStr   = new Intl.DateTimeFormat('en-CA', { timeZone: safeTimezone }).format(now);
    const todayMs    = new Date(todayStr + 'T12:00:00Z').getTime();
    const yestStr    = new Intl.DateTimeFormat('en-CA', { timeZone: safeTimezone })
                         .format(new Date(todayMs - 24 * 60 * 60 * 1000));

    // Cost Explorer: Start inclusive, End exclusive → [yesterday, today) = yesterday's full day
    const command = new GetCostAndUsageCommand({
      TimePeriod: { Start: yestStr, End: todayStr },
      Granularity: 'DAILY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    });

    const response   = await client.send(command);
    const dailyCosts = response.ResultsByTime?.map(day => ({
      date:     day.TimePeriod?.Start,
      amount:   day.Total?.UnblendedCost?.Amount || '0',
      services: day.Groups
        ?.map(g => ({ name: g.Keys?.[0], amount: g.Metrics?.UnblendedCost?.Amount }))
        .sort((a, b) => Number(b.amount) - Number(a.amount))
    }));

    res.json(dailyCosts);
  } catch (error: any) {
    console.error('Cost Explorer Error:', error);
    res.status(500).json({ error: error.message });
  }
}
