import { DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { getEC2Client } from '../_lib/helpers';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const client   = getEC2Client(req);
    const command  = new DescribeInstancesCommand({});
    const response = await client.send(command);

    const instances = response.Reservations
      ?.flatMap(r => r.Instances || [])
      .map(i => ({
        instanceId: i.InstanceId,
        type:       i.InstanceType,
        state:      i.State?.Name,
        publicIp:   i.PublicIpAddress || 'N/A',
        launchTime: i.LaunchTime,
        tags:       i.Tags,
      }));

    res.json(instances || []);
  } catch (error: any) {
    console.error('EC2 Error:', error);
    res.status(500).json({ error: error.message });
  }
}
