import { detectTimeDrift } from './_lib/helpers';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { drift, valid } = await detectTimeDrift();
    res.json({
      driftMs: drift,
      driftMinutes: (drift / 1000 / 60).toFixed(1),
      isValid: valid,
      warning: valid
        ? null
        : `System time is ${Math.abs(drift / 1000 / 60).toFixed(1)} minutes ${drift > 0 ? 'behind' : 'ahead'} actual time.`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
