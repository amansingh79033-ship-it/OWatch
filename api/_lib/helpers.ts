import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { CostExplorerClient } from '@aws-sdk/client-cost-explorer';
import { SNSClient } from '@aws-sdk/client-sns';
import { EC2Client } from '@aws-sdk/client-ec2';

const TIME_DRIFT_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Header helper — reads a custom header value, falling back to an env var
// ---------------------------------------------------------------------------
export const getVal = (req: any, key: string, fallback?: string): string | undefined => {
  const val = req.headers[key];
  const str = Array.isArray(val) ? val[0] : val;
  return str || fallback;
};

// ---------------------------------------------------------------------------
// Time drift detection — no in-memory cache (serverless = stateless)
// ---------------------------------------------------------------------------
export async function detectTimeDrift(): Promise<{ drift: number; valid: boolean }> {
  try {
    const t0 = Date.now();
    const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
    const t1 = Date.now();
    if (!response.ok) return { drift: 0, valid: true };
    const data = await response.json();
    const remote = new Date(data.datetime).getTime();
    const local = t0 + (t1 - t0) / 2;
    const drift = local - remote;
    return { drift, valid: Math.abs(drift) < TIME_DRIFT_THRESHOLD_MS };
  } catch {
    return { drift: 0, valid: true };
  }
}

// ---------------------------------------------------------------------------
// AWS client factories — prefer request headers, fall back to env vars
// ---------------------------------------------------------------------------
export const getCWClient = (req: any) => {
  const accessKeyId     = getVal(req, 'x-aws-key',    process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = getVal(req, 'x-aws-secret', process.env.AWS_SECRET_ACCESS_KEY);
  const region          = getVal(req, 'x-aws-region', process.env.AWS_REGION) || 'us-east-1';
  if (!accessKeyId || !secretAccessKey) throw new Error('AWS credentials are not configured.');
  return new CloudWatchClient({ region, credentials: { accessKeyId, secretAccessKey } });
};

export const getCEClient = (req: any) => {
  const accessKeyId     = getVal(req, 'x-aws-key',    process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = getVal(req, 'x-aws-secret', process.env.AWS_SECRET_ACCESS_KEY);
  if (!accessKeyId || !secretAccessKey) throw new Error('AWS credentials are not configured.');
  // Cost Explorer is a global service — always us-east-1
  return new CostExplorerClient({ region: 'us-east-1', credentials: { accessKeyId, secretAccessKey } });
};

export const getSNSClient = (req: any) => {
  const accessKeyId     = getVal(req, 'x-aws-key',    process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = getVal(req, 'x-aws-secret', process.env.AWS_SECRET_ACCESS_KEY);
  const region          = getVal(req, 'x-aws-region', process.env.AWS_REGION) || 'us-east-1';
  if (!accessKeyId || !secretAccessKey) throw new Error('AWS credentials are not configured.');
  return new SNSClient({ region, credentials: { accessKeyId, secretAccessKey } });
};

export const getEC2Client = (req: any) => {
  const accessKeyId     = getVal(req, 'x-aws-key',    process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = getVal(req, 'x-aws-secret', process.env.AWS_SECRET_ACCESS_KEY);
  const region          = getVal(req, 'x-aws-region', process.env.AWS_REGION) || 'us-east-1';
  if (!accessKeyId || !secretAccessKey) throw new Error('AWS credentials are not configured.');
  return new EC2Client({ region, credentials: { accessKeyId, secretAccessKey } });
};
