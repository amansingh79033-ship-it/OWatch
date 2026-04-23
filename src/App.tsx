import React, { useState, useEffect, useMemo } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { 
  Activity, 
  Plus, 
  RefreshCw, 
  AlertCircle,
  Clock,
  Trash2,
  Terminal,
  Save,
  ChevronRight,
  Zap,
  DollarSign,
  TrendingDown,
  Layers,
  Search,
  Maximize2,
  Minimize2,
  Settings,
  Lightbulb,
  Info,
  Leaf,
  Globe,
  ShieldCheck,
  Cpu,
  Radar as RadarIcon
} from 'lucide-react';
import { format } from 'date-fns';
import emailjs from 'emailjs-com';
import { cn } from './lib/utils';
import { LandingPage } from './components/LandingPage';
import { formatValue } from './lib/formatters';
import Papa from 'papaparse';
import { Upload, FileCode, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

interface AwsConfig {
  key: string;
  secret: string;
  region: string;
  snsTopic: string;
  slackWebhook: string;
}

interface MetricConfig {
  id: string;
  title: string;
  namespace: string;
  metricName: string;
  dimensions: { Name: string; Value: string }[];
  unit: string;
  color: string;
  alarmThreshold?: number;
  timeframe?: number;
}

const DEFAULT_METRICS: MetricConfig[] = [
  {
    id: 'ec2-cpu-agg',
    title: 'Aggregated EC2 - CPU',
    namespace: 'AWS/EC2',
    metricName: 'CPUUtilization',
    dimensions: [],
    unit: '%',
    color: '#ff9900',
  },
  {
    id: 'rds-cpu-agg',
    title: 'Aggregated RDS - CPU',
    namespace: 'AWS/RDS',
    metricName: 'CPUUtilization',
    dimensions: [],
    unit: '%',
    color: '#3fb950',
  },
  {
    id: 'ebs-write-ops',
    title: 'EBS Write Ops',
    namespace: 'AWS/EBS',
    metricName: 'VolumeWriteOps',
    dimensions: [],
    unit: 'Count',
    color: '#a371f7',
  },
  {
    id: 'nat-gateway-bytes',
    title: 'NAT Gateway Data Processed',
    namespace: 'AWS/NATGateway',
    metricName: 'BytesProcessed',
    dimensions: [],
    unit: 'Bytes',
    color: '#58a6ff',
  },
  {
    id: 'rds-read-iops',
    title: 'RDS Read IOPS',
    namespace: 'AWS/RDS',
    metricName: 'ReadIOPS',
    dimensions: [],
    unit: 'Count/Second',
    color: '#ff7b72',
  },
  {
    id: 'rds-write-iops',
    title: 'RDS Write IOPS',
    namespace: 'AWS/RDS',
    metricName: 'WriteIOPS',
    dimensions: [],
    unit: 'Count/Second',
    color: '#d29922',
  },
  {
    id: 'alb-resp',
    title: 'ALB Target Response Time',
    namespace: 'AWS/ApplicationELB',
    metricName: 'TargetResponseTime',
    dimensions: [],
    unit: 'Seconds',
    color: '#3fb950',
  },
  {
    id: 's3-size-agg',
    title: 'S3 Bucket Size',
    namespace: 'AWS/S3',
    metricName: 'BucketSizeBytes',
    dimensions: [{ Name: 'StorageType', Value: 'StandardStorage' }],
    unit: 'Bytes',
    color: '#ff9900',
  },
  {
    id: 'ec2-net-in',
    title: 'EC2 Network In',
    namespace: 'AWS/EC2',
    metricName: 'NetworkIn',
    dimensions: [],
    unit: 'Bytes',
    color: '#3fb950',
  },
  {
    id: 'ec2-net-out',
    title: 'EC2 Network Out',
    namespace: 'AWS/EC2',
    metricName: 'NetworkOut',
    dimensions: [],
    unit: 'Bytes',
    color: '#f85149',
  },
  {
    id: 'rds-connections',
    title: 'RDS Database Connections',
    namespace: 'AWS/RDS',
    metricName: 'DatabaseConnections',
    dimensions: [],
    unit: 'Count',
    color: '#8b949e',
  },
  {
    id: 'lambda-invocations',
    title: 'Lambda Invocations',
    namespace: 'AWS/Lambda',
    metricName: 'Invocations',
    dimensions: [],
    unit: 'Count',
    color: '#a371f7',
  },
  {
    id: 'lambda-errors',
    title: 'Lambda Errors',
    namespace: 'AWS/Lambda',
    metricName: 'Errors',
    dimensions: [],
    unit: 'Count',
    color: '#f85149',
  },
  {
    id: 'sqs-messages',
    title: 'SQS Messages Visible',
    namespace: 'AWS/SQS',
    metricName: 'ApproximateNumberOfMessagesVisible',
    dimensions: [],
    unit: 'Count',
    color: '#3fb950',
  },
  {
    id: 'dynamodb-latency',
    title: 'DynamoDB SuccessfulRequestLatency',
    namespace: 'AWS/DynamoDB',
    metricName: 'SuccessfulRequestLatency',
    dimensions: [],
    unit: 'Milliseconds',
    color: '#ff9900',
  },
  {
    id: 'cloudfront-requests',
    title: 'CloudFront Requests',
    namespace: 'AWS/CloudFront',
    metricName: 'Requests',
    dimensions: [],
    unit: 'Count',
    color: '#3fb950',
  },
  {
    id: 'elasticache-cpu',
    title: 'ElastiCache CPU Utilization',
    namespace: 'AWS/ElastiCache',
    metricName: 'CPUUtilization',
    dimensions: [],
    unit: '%',
    color: '#f85149',
  },
  {
    id: 'sns-published',
    title: 'SNS Messages Published',
    namespace: 'AWS/SNS',
    metricName: 'NumberOfMessagesPublished',
    dimensions: [],
    unit: 'Count',
    color: '#a371f7',
  },
];

export default function App() {
  const [metrics, setMetrics] = useState<MetricConfig[]>(() => {
    const saved = localStorage.getItem('cw_dash_metrics');
    return saved ? JSON.parse(saved) : DEFAULT_METRICS;
  });

  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem('cw_dash_refresh_interval');
    return saved ? JSON.parse(saved) : 5;
  });
  
  const [globalTimeframe, setGlobalTimeframe] = useState<number>(() => {
    const saved = localStorage.getItem('cw_dash_global_timeframe');
    return saved ? JSON.parse(saved) : 12;
  });
  
  const [data, setData] = useState<Record<string, any[]>>({});
  const [comparisonData, setComparisonData] = useState<Record<string, any[]>>({});
  const [comparisonPeriod, setComparisonPeriod] = useState<'none' | '1d' | '7d' | '30d'>('none');
  const [costData, setCostData] = useState<any[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'metrics' | 'cost' | 'settings'>('metrics');
  const [triggeredAlarms, setTriggeredAlarms] = useState<Record<string, boolean>>({});
  const [pendingAlert, setPendingAlert] = useState<{ metric: MetricConfig, value: number } | null>(null);
  const [ec2Instances, setEc2Instances] = useState<any[]>([]);
  const [opsLogs, setOpsLogs] = useState<{id: string, text: string, timestamp: Date}[]>([]);

  const addOpsLog = (text: string) => {
    setOpsLogs(prev => [{ id: Math.random().toString(36).substr(2, 9), text, timestamp: new Date() }, ...prev].slice(0, 50));
  };
  const [notifications, setNotifications] = useState<{id: string, message: string, type: 'error' | 'success'}[]>([]);
  const [showLanding, setShowLanding] = useState(true);
  const [timeDriftWarning, setTimeDriftWarning] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [csvLoaded, setCsvLoaded] = useState<{ name: string; fields: string[] } | null>(null);
  const [autoSyncPending, setAutoSyncPending] = useState<AwsConfig | null>(null);

  // Auto-sync when CSV is uploaded - fires after state settles
  useEffect(() => {
    if (!autoSyncPending) return;
    setAutoSyncPending(null);
    setSaveStatus('testing');
    setError(null);
    // Slight delay to ensure React has flushed the awsConfig state update
    const timer = setTimeout(async () => {
      try {
        await refreshAll(autoSyncPending);
        setSaveStatus('success');
        addNotification('Auto-sync successful! Dashboard connected.', 'success');
        setTimeout(() => setSaveStatus('idle'), 4000);
      } catch (err: any) {
        setSaveStatus('error');
        setError(err.message);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [autoSyncPending]);

  // Check time drift on mount
  useEffect(() => {
    const checkTimeDrift = async () => {
      try {
        const response = await fetch('/api/time-check');
        const data = await response.json();
        if (data.warning) {
          setTimeDriftWarning(data.warning);
          addNotification(`TIME DRIFT: ${data.warning}`, 'error');
        }
      } catch (err) {
        console.warn('Could not check time drift:', err);
      }
    };
    checkTimeDrift();
  }, []);

  const [awsConfig, setAwsConfig] = useState<AwsConfig>(() => {
    const saved = localStorage.getItem('cw_dash_aws_config');
    const defaults: AwsConfig = {
      key: '',
      secret: '',
      region: 'us-east-1',
      snsTopic: '',
      slackWebhook: ''
    };
    if (!saved) return defaults;
    try {
      return { ...defaults, ...JSON.parse(saved) };
    } catch {
      return defaults;
    }
  });

  // Clear all stored credentials and reset state
  const clearCredentials = () => {
    const empty: AwsConfig = { key: '', secret: '', region: 'us-east-1', snsTopic: '', slackWebhook: '' };
    localStorage.removeItem('cw_dash_aws_config');
    setAwsConfig(empty);
    setCsvLoaded(null);
    setSaveStatus('idle');
    setError(null);
    setData({});
    setCostData([]);
    setEc2Instances([]);
    addOpsLog('AUTH: Credentials cleared. Please upload a new CSV or enter credentials manually.');
    addNotification('Credentials cleared. Dashboard reset.', 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-uploaded
    e.target.value = '';

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const row = results.data[0] as any;
        if (!row) {
          setError('CSV file is empty or invalid');
          return;
        }

        console.log('CSV Parsed Row (raw):', row);

        // ── Normalised case-insensitive lookup ─────────────────────────────
        // Strips spaces, underscores, dashes, dots so that:
        //   AWS_ACCESS_KEY_ID / awsAccessKeyId / access key id  → all hit the same bucket
        const norm: Record<string, string> = {};
        Object.entries(row).forEach(([k, v]) => {
          const nk = k.toLowerCase().replace(/[\s_\-\.]+/g, '');
          norm[nk] = String(v ?? '').trim();
        });

        const pick = (...keys: string[]): string => {
          for (const k of keys) {
            const nk = k.toLowerCase().replace(/[\s_\-\.]+/g, '');
            if (norm[nk]) return norm[nk];
          }
          return '';
        };

        const rawKey = pick(
          'AWS_ACCESS_KEY_ID', 'access_key_id', 'accesskeyid', 'accessKey',
          'aws_key', 'awskey', 'keyid', 'key_id', 'access key id', 'access key',
          'aki', 'aws access key id'
        );
        const rawSecret = pick(
          'AWS_SECRET_ACCESS_KEY', 'secret_access_key', 'secretaccesskey', 'secretKey',
          'secret_key', 'secretkey', 'aws_secret', 'awssecret', 'secret',
          'access secret', 'secret access key', 'aws secret access key'
        );
        const rawRegion = pick(
          'AWS_REGION', 'region', 'aws_region', 'awsregion'
        ) || awsConfig.region || 'us-east-1';
        const rawSns = pick(
          'AWS_SNS_TOPIC_ARN', 'sns_topic_arn', 'snstopicarn', 'snsTopic',
          'sns', 'topic_arn', 'sns_arn'
        );
        const rawSlack = pick(
          'SLACK_WEBHOOK_URL', 'slack_webhook_url', 'slackwebhookurl', 'slackWebhook',
          'slack', 'webhook_url', 'slack_url'
        );

        console.log('CSV field detection:', {
          headers: Object.keys(row),
          detected: {
            key:    rawKey    ? `✓ found (${rawKey.substring(0, 8)}...)` : '✗ NOT FOUND',
            secret: rawSecret ? `✓ found (${rawSecret.substring(0, 4)}...)` : '✗ NOT FOUND',
            region: rawRegion,
          }
        });

        if (!rawKey || !rawSecret) {
          const foundHeaders = Object.keys(row).join(', ');
          setError(
            `Could not detect credentials in CSV.\n` +
            `Found columns: [${foundHeaders}]\n` +
            `Expected one of: AWS_ACCESS_KEY_ID / accessKey / key_id\n` +
            `                 AWS_SECRET_ACCESS_KEY / secretKey / secret`
          );
          addOpsLog(`CSV ERROR: Key/secret not found. Columns detected: ${foundHeaders}`);
          return;
        }

        const newConfig = {
          key: rawKey,
          secret: rawSecret,
          region: rawRegion || 'us-east-1',
          snsTopic: rawSns,
          slackWebhook: rawSlack
        };

        // Detect which fields were loaded
        const loadedFields: string[] = ['Access Key', 'Secret Key'];
        if (rawRegion && rawRegion !== 'us-east-1') loadedFields.push('Region');
        if (rawSns) loadedFields.push('SNS Topic');
        if (rawSlack) loadedFields.push('Slack Webhook');

        // 1. Persist to localStorage immediately (before state update)
        localStorage.setItem('cw_dash_aws_config', JSON.stringify(newConfig));

        // 2. Update React state - fills all text boxes
        setAwsConfig(newConfig);
        setSaveStatus('idle');
        setError(null);

        // 3. Show CSV loaded badge
        setCsvLoaded({ name: file.name, fields: loadedFields });
        addOpsLog(`CSV: Credentials loaded from ${file.name} [${loadedFields.join(', ')}]`);
        addNotification(`Credentials auto-filled from ${file.name}`, 'success');

        // 4. Auto-trigger test & sync using newConfig directly (bypass async state)
        setAutoSyncPending(newConfig);
      },
      error: (err) => {
        setError('Failed to parse CSV: ' + err.message);
      }
    });
  };

  // Timezone: user can manually select before syncing credentials
  const [userTimezone, setUserTimezone] = useState<string>(() => {
    return localStorage.getItem('cw_dash_timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  });

  useEffect(() => {
    localStorage.setItem('cw_dash_timezone', userTimezone);
  }, [userTimezone]);

  // Custom Query Form State
  const [newMetric, setNewMetric] = useState<Partial<MetricConfig>>({
    title: '',
    namespace: 'AWS/EC2',
    metricName: 'CPUUtilization',
    dimensions: [],
    unit: '%',
    color: '#58a6ff'
  });

  useEffect(() => {
    localStorage.setItem('cw_dash_metrics', JSON.stringify(metrics));
  }, [metrics]);

  useEffect(() => {
    localStorage.setItem('cw_dash_refresh_interval', JSON.stringify(refreshInterval));
  }, [refreshInterval]);

  useEffect(() => {
    localStorage.setItem('cw_dash_global_timeframe', JSON.stringify(globalTimeframe));
  }, [globalTimeframe]);

  useEffect(() => {
    localStorage.setItem('cw_dash_aws_config', JSON.stringify(awsConfig));
  }, [awsConfig]);

  // Beyond-AWS Data Analysis
  const sustainabilityData = useMemo(() => {
    const runningInstances = ec2Instances.filter(i => i.state === 'running');
    let totalWatts = 0;
    runningInstances.forEach(inst => {
      const type = inst.type?.toLowerCase() || '';
      if (type.includes('xlarge')) totalWatts += 50;
      else if (type.includes('micro') || type.includes('small')) totalWatts += 10;
      else totalWatts += 25;
    });
    // Estimated gCO2 per kWh for average region ~300g
    const minsPassedToday = new Date().getHours() * 60 + new Date().getMinutes();
    const co2PerMin = (totalWatts / 1000) * (1/60) * 300;
    return {
      watts: totalWatts,
      co2Today: co2PerMin * minsPassedToday,
      efficiency: runningInstances.length > 0 ? ((totalWatts / (runningInstances.length * 50)) * 100).toFixed(1) : "0"
    };
  }, [ec2Instances]);

  const serviceBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    costData.forEach(day => {
      day.services?.forEach((s: any) => {
        breakdown[s.name] = (breakdown[s.name] || 0) + Number(s.amount);
      });
    });
    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [costData]);

  // Analysis modules for peak/low trends with comprehensive metrics analysis
  const analyzedMetrics = useMemo(() => {
    let peakCPU = 0;
    let avgCPU = 0;
    let minCPU = Infinity;
    let cpuSamples = 0;
    let peakNetIn = 0;
    let peakNetOut = 0;
    let avgNetIn = 0;
    let avgNetOut = 0;
    let netSamples = 0;
    let peakIOPSRead = 0;
    let peakIOPSWrite = 0;
    let peakLatency = 0;
    let peakMem = 0;
    let peakNetworkBytes = 0;
    let peakHour = 0;
    let peakHourValue = 0;
    let lowestHour = 0;
    let lowestHourValue = Infinity;
    let allCPUValues: number[] = [];
    let allNetValues: number[] = [];
    let varianceCPU = 0;
    let varianceNet = 0;
    
    Object.keys(data).forEach(metricId => {
      const metric = metrics.find(m => m.id === metricId);
      const points = data[metricId];
      if (!points || points.length === 0) return;
      
      if (metric?.metricName === 'CPUUtilization') {
        points.forEach(p => {
          const hour = new Date(p.timestamp).getHours();
          peakCPU = Math.max(peakCPU, p.value);
          minCPU = Math.min(minCPU, p.value);
          avgCPU += p.value;
          cpuSamples++;
          allCPUValues.push(p.value);
          
          if (p.value > peakHourValue) {
            peakHour = hour;
            peakHourValue = p.value;
          }
          if (p.value < lowestHourValue && p.value > 0) {
            lowestHour = hour;
            lowestHourValue = p.value;
          }
        });
      }
      
      if (metric?.metricName === 'NetworkIn') {
        points.forEach(p => {
          peakNetIn = Math.max(peakNetIn, p.value);
          avgNetIn += p.value;
          netSamples++;
          allNetValues.push(p.value);
          peakNetworkBytes = Math.max(peakNetworkBytes, p.value);
        });
      }
      
      if (metric?.metricName === 'NetworkOut') {
        points.forEach(p => {
          peakNetOut = Math.max(peakNetOut, p.value);
          avgNetOut += p.value;
          allNetValues.push(p.value);
          peakNetworkBytes = Math.max(peakNetworkBytes, p.value);
        });
      }

      if (metric?.metricName === 'BytesProcessed') {
        points.forEach(p => {
          peakNetworkBytes = Math.max(peakNetworkBytes, p.value);
        });
      }

      if (metric?.metricName === 'ReadIOPS' || metric?.metricName === 'WriteIOPS') {
        points.forEach(p => {
          if (metric?.metricName === 'ReadIOPS') {
            peakIOPSRead = Math.max(peakIOPSRead, p.value);
          } else {
            peakIOPSWrite = Math.max(peakIOPSWrite, p.value);
          }
        });
      }
      
      if (metric?.metricName === 'TargetResponseTime' || metric?.metricName === 'SuccessfulRequestLatency') {
        points.forEach(p => {
          peakLatency = Math.max(peakLatency, p.value);
        });
      }
    });
    
    // Calculate variance for load diversity analysis
    if (allCPUValues.length > 0) {
      const meanCPU = avgCPU / cpuSamples;
      allCPUValues.forEach(v => {
        varianceCPU += Math.pow(v - meanCPU, 2);
      });
      varianceCPU = Math.sqrt(varianceCPU / allCPUValues.length);
    }
    
    if (allNetValues.length > 0) {
      const meanNet = avgNetIn / (netSamples || 1);
      allNetValues.forEach(v => {
        varianceNet += Math.pow(v - meanNet, 2);
      });
      varianceNet = Math.sqrt(varianceNet / allNetValues.length);
    }
    
    // Calculate load diversity ratio (0-100%)
    const loadDiversity = allCPUValues.length > 1 
      ? (varianceCPU / (avgCPU || 1)) * 100 
      : 0;
    
    return {
      peakCPU: cpuSamples > 0 ? peakCPU : 0,
      avgCPU: cpuSamples > 0 ? avgCPU / cpuSamples : 0,
      minCPU: cpuSamples > 0 && minCPU !== Infinity ? minCPU : 0,
      peakNetIn,
      peakNetOut,
      avgNetIn: netSamples > 0 ? avgNetIn / netSamples : 0,
      peakIOPSRead,
      peakIOPSWrite,
      peakLatency,
      peakNetworkBytes,
      peakHour,
      lowestHour,
      loadDiversity: Math.min(loadDiversity, 100),
      varianceCPU,
      varianceNet
    };
  }, [data, metrics]);

  const preciseRecommendations = useMemo(() => {
    const recs: any[] = [];
    const totalCost = serviceBreakdown.reduce((sum, s) => sum + s.value, 0);

    // Nothing to optimize if no cost data yet
    if (totalCost === 0) {
      return {
        list: [], potentialSavings: 0, forecastedCost: 0,
        savingsPercentage: "0", dailyCost: 0,
        monthlyCost: 0, monthlySavings: 0,
        analysis: { peakHour: 0, lowestHour: 0, loadDiversity: 0, avgCPU: 0, peakCPU: 0, minCPU: 0 }
      };
    }

    // Resolve per-service costs (flexible name matching for CE output)
    const svc = (keywords: string[]) =>
      serviceBreakdown.find(s => keywords.some(k => s.name?.toLowerCase().includes(k.toLowerCase())))?.value || 0;
    const ec2Cost   = svc(['AmazonEC2', 'EC2']);
    const rdsCost   = svc(['Amazon RDS', 'RDS']);
    const s3Cost    = svc(['Amazon S3', 'S3']);
    const lambdaCost = svc(['Lambda']);
    const cfCost    = svc(['CloudFront']);
    const eksCost   = svc(['EKS', 'Kubernetes']);
    const natCost   = svc(['NatGateway', 'NAT']);
    const otherCost = Math.max(0, totalCost - ec2Cost - rdsCost - s3Cost - lambdaCost - cfCost - eksCost - natCost);

    const hasCPU = analyzedMetrics.peakCPU > 0;
    const hasNet = analyzedMetrics.peakNetworkBytes > 0;
    const loadVar = analyzedMetrics.loadDiversity;
    const peakHStr = `${analyzedMetrics.peakHour}:00`;
    const lowHStr  = `${analyzedMetrics.lowestHour}:00`;
    const rdsConns = Math.max(...(data['rds-connections']?.map((p: any) => p.value) || [0]));

    let potentialSavings = 0;

    const push = (rec: any) => { recs.push(rec); if (rec.savings > 0) potentialSavings += rec.savings; };
    const fmt = (v: number) => v.toFixed(2);

    // ═══════════════════════════════════════════════════
    // 1. EC2 — always fires when ec2Cost > 0
    // ═══════════════════════════════════════════════════
    if (ec2Cost > 0) {
      if (hasCPU && analyzedMetrics.peakCPU < 20 && analyzedMetrics.avgCPU < 10) {
        // Severely over-provisioned
        const rate = 0.55;
        const sav = ec2Cost * rate;
        push({
          title: 'Aggressive EC2 Downsize (2-3 Tiers)',
          impact: '55% EC2 REDUCTION',
          type: 'cost', risk: 'LOW',
          savings: sav,
          desc: `CPU ANALYSIS — Peak: ${analyzedMetrics.peakCPU.toFixed(1)}%, Avg: ${analyzedMetrics.avgCPU.toFixed(1)}%, Min: ${analyzedMetrics.minCPU.toFixed(1)}%. You are paying for ${(100 / (analyzedMetrics.avgCPU || 1)).toFixed(0)}× capacity. Downsize 2–3 instance tiers immediately.`,
          formula: `$${fmt(ec2Cost)} (EC2/day) × 55% downsize rate = $${fmt(sav)}/day → $${fmt(sav * 30)}/mo savings`
        });
      } else if (hasCPU && analyzedMetrics.peakCPU < 40) {
        const rate = 0.35;
        const sav = ec2Cost * rate;
        push({
          title: 'EC2 Reserved Instance Conversion',
          impact: '35% EC2 REDUCTION',
          type: 'cost', risk: 'LOW',
          savings: sav,
          desc: `CPU ANALYSIS — Peak: ${analyzedMetrics.peakCPU.toFixed(1)}% at ${peakHStr}, Avg: ${analyzedMetrics.avgCPU.toFixed(1)}%. Convert On-Demand → 1-yr Reserved for predictable baseline load.`,
          formula: `$${fmt(ec2Cost)} (EC2/day) × 35% Reserved rate = $${fmt(sav)}/day → $${fmt(sav * 30)}/mo savings`
        });
      } else if (hasCPU && analyzedMetrics.peakCPU > 80) {
        push({
          title: 'URGENT: EC2 Scale-Out (ASG)',
          impact: 'AVAILABILITY RISK',
          type: 'performance', risk: 'HIGH',
          savings: 0,
          desc: `CRITICAL — Peak CPU ${analyzedMetrics.peakCPU.toFixed(1)}% at ${peakHStr}. Without ASG auto-scaling this breaches the availability threshold. No cost savings here — preventing downtime.`,
          formula: 'N/A — reliability action, no direct savings'
        });
        // Still capture Reserved savings even at high CPU
        const sav = ec2Cost * 0.20;
        push({
          title: 'EC2 1-Year Reserved Instance',
          impact: '20% EC2 REDUCTION',
          type: 'cost', risk: 'LOW',
          savings: sav,
          desc: `Even at peak utilization, committing to 1-yr Reserved pricing saves 20% over On-Demand with zero architecture change.`,
          formula: `$${fmt(ec2Cost)} (EC2/day) × 20% Reserved discount = $${fmt(sav)}/day → $${fmt(sav * 30)}/mo savings`
        });
      } else {
        // No CPU data OR moderate utilization — apply baseline Reserved rate
        const rate = hasCPU ? 0.25 : 0.30;
        const label = hasCPU ? '25%' : '30%';
        const sav = ec2Cost * rate;
        push({
          title: `EC2 Reserved Instance Plan (${label})`,
          impact: `${label} EC2 REDUCTION`,
          type: 'cost', risk: 'LOW',
          savings: sav,
          desc: hasCPU
            ? `CPU ANALYSIS — Peak: ${analyzedMetrics.peakCPU.toFixed(1)}%, Avg: ${analyzedMetrics.avgCPU.toFixed(1)}%. Healthy utilization. 1-yr Reserved Instance optimal.`
            : `EC2 daily spend: $${fmt(ec2Cost)}. Industry baseline: 1-yr Reserved Instance saves 30–40% over On-Demand. Applied conservative 30%.`,
          formula: `$${fmt(ec2Cost)} (EC2/day) × ${label} Reserved rate = $${fmt(sav)}/day → $${fmt(sav * 30)}/mo savings`
        });
      }

      // Spot Fleet (add-on) — applies when load varies OR when no CPU data (assume variable)
      if (loadVar > 15 || !hasCPU) {
        const spotRate = 0.20; // 40% of EC2 on spot × 70% spot discount ≈ 20%
        const sav = ec2Cost * spotRate;
        push({
          title: 'Spot Fleet for Variable Workloads',
          impact: '20% ADDITIONAL EC2',
          type: 'cost', risk: 'LOW',
          savings: sav,
          desc: loadVar > 15
            ? `LOAD DIVERSITY: ${loadVar.toFixed(1)}% CPU variance. Peak ${peakHStr} / lowest ${lowHStr}. Shift burst capacity to Spot — 60% Reserved (stable) + 40% Spot (flexible).`
            : 'Batch / stateless workloads are ideal Spot candidates. Industry average: 40% of fleet on Spot at 70% discount = 28% gross reduction, net ~20% after mix.',
          formula: `$${fmt(ec2Cost)} × 40% (spot portion) × 70% (spot discount) ≈ $${fmt(sav)}/day → $${fmt(sav * 30)}/mo savings`
        });
      }

      // Scheduled scale-down when variance is visible
      if (loadVar > 20 || (!hasCPU && ec2Cost > 0)) {
        const sav = ec2Cost * 0.15;
        push({
          title: 'Scheduled Scale-Down (Off-Peak Hours)',
          impact: '15% OFF-PEAK SAVINGS',
          type: 'cost', risk: 'LOW',
          savings: sav,
          desc: hasCPU
            ? `PATTERN: Peak ${peakHStr}, trough ${lowHStr}, ${loadVar.toFixed(1)}% variance. Reduce fleet by 50% during ~8 idle hours per day.`
            : 'Standard practice: reduce EC2 capacity to 50% during 8 off-peak hrs/day.',
          formula: `$${fmt(ec2Cost)} × 50% scale-down × 8h/24h = $${fmt(sav)}/day → $${fmt(sav * 30)}/mo savings`
        });
      }
    }

    // ═══════════════════════════════════════════════════
    // 2. RDS — always fires when rdsCost > 0
    // ═══════════════════════════════════════════════════
    if (rdsCost > 0) {
      if (rdsConns > 100) {
        const sav = rdsCost * 0.05;
        push({
          title: 'RDS Proxy — Connection Pooling',
          impact: 'PERFORMANCE + 5% COST',
          type: 'performance', risk: 'HIGH',
          savings: sav,
          desc: `HIGH LOAD: ${rdsConns} active connections. RDS Proxy pools connections at the application layer, reduces CPU overhead and prevents connection exhaustion.`,
          formula: `$${fmt(rdsCost)} (RDS/day) × 5% CPU overhead savings = $${fmt(sav)}/day → $${fmt(sav * 30)}/mo savings`
        });
      } else if (rdsConns < 20 && rdsCost > 50) {
        const sav = rdsCost * 0.25;
        push({
          title: 'RDS Right-Sizing (Low Utilisation)',
          impact: '25% RDS REDUCTION',
          type: 'cost', risk: 'MEDIUM',
          savings: sav,
          desc: `LOW UTILISATION: Only ${rdsConns} connections on a high-tier RDS instance (cost $${fmt(rdsCost)}/day). Downgrade to db.t4g.medium — same IOPS, 25% lower cost.`,
          formula: `$${fmt(rdsCost)} (RDS/day) × 25% right-sizing rate = $${fmt(sav)}/day → $${fmt(sav * 30)}/mo savings`
        });
      } else {
        // Baseline: Reserved Instance for RDS
        const sav = rdsCost * 0.28;
        push({
          title: 'RDS 1-Year Reserved Instance',
          impact: '28% RDS REDUCTION',
          type: 'cost', risk: 'LOW',
          savings: sav,
          desc: `RDS daily spend: $${fmt(rdsCost)}. AWS 1-yr Reserved pricing yields 28% savings over On-Demand with zero performance impact.`,
          formula: `$${fmt(rdsCost)} (RDS/day) × 28% Reserved rate = $${fmt(sav)}/day → $${fmt(sav * 30)}/mo savings`
        });
      }
    }

    // ═══════════════════════════════════════════════════
    // 3. S3 — always fires when s3Cost > 0
    // ═══════════════════════════════════════════════════
    if (s3Cost > 0) {
      const sav = s3Cost * 0.40;
      push({
        title: 'S3 Intelligent-Tiering',
        impact: '40% STORAGE REDUCTION',
        type: 'cost', risk: 'LOW',
        savings: sav,
        desc: `S3 daily spend: $${fmt(s3Cost)}. Enable Intelligent-Tiering for objects >128 KB — auto-moves to cheapest storage class with zero retrieval delay.`,
        formula: `$${fmt(s3Cost)} (S3/day) × 40% tiering savings = $${fmt(sav)}/day → $${fmt(sav * 30)}/mo savings`
      });
    }

    // ═══════════════════════════════════════════════════
    // 4. Lambda — always fires when lambdaCost > 0
    // ═══════════════════════════════════════════════════
    if (lambdaCost > 0) {
      const sav = lambdaCost * 0.20;
      push({
        title: 'Lambda Power Tuning',
        impact: '20% LAMBDA REDUCTION',
        type: 'cost', risk: 'LOW',
        savings: sav,
        desc: `Lambda daily spend: $${fmt(lambdaCost)}. AWS Lambda Power Tuning Tool finds the optimal memory/vCPU allocation. Over-provisioned memory = wasted cost.`,
        formula: `$${fmt(lambdaCost)} (Lambda/day) × 20% tuning savings = $${fmt(sav)}/day → $${fmt(sav * 30)}/mo savings`
      });
    }

    // ═══════════════════════════════════════════════════
    // 5. NAT Gateway — always fires when natCost > 0
    // ═══════════════════════════════════════════════════
    if (natCost > 0) {
      const sav = natCost * 0.50;
      push({
        title: 'VPC Endpoints — Replace NAT Gateway',
        impact: '50% NAT REDUCTION',
        type: 'cost', risk: 'LOW',
        savings: sav,
        desc: `NAT Gateway daily spend: $${fmt(natCost)}. AWS-to-AWS traffic (S3, DynamoDB, Secrets Manager) via NAT Gateway is 5–8× more expensive than VPC Interface Endpoints.`,
        formula: `$${fmt(natCost)} (NAT/day) × 50% traffic shift to endpoints = $${fmt(sav)}/day → $${fmt(sav * 30)}/mo savings`
      });
    }

    // ═══════════════════════════════════════════════════
    // 6. Network egress (metric-driven)
    // ═══════════════════════════════════════════════════
    if (hasNet && analyzedMetrics.peakNetworkBytes > 50_000_000) {
      const sav = totalCost * 0.08;
      push({
        title: 'VPC Endpoint Implementation',
        impact: '8% TOTAL COST',
        type: 'cost', risk: 'LOW',
        savings: sav,
        desc: `NETWORK PEAK: ${(analyzedMetrics.peakNetworkBytes / 1e6).toFixed(1)} MB at ${peakHStr}. PrivateLink endpoints for S3/DynamoDB cut data-transfer latency 60% and egress charges.`,
        formula: `$${fmt(totalCost)} (total/day) × 8% egress savings = $${fmt(sav)}/day → $${fmt(sav * 30)}/mo savings`
      });
    } else if (natCost === 0 && totalCost > 100) {
      // Flat 5% baseline egress recommendation
      const sav = totalCost * 0.05;
      push({
        title: 'VPC Endpoints (Baseline Recommendation)',
        impact: '5% EGRESS REDUCTION',
        type: 'cost', risk: 'LOW',
        savings: sav,
        desc: `Any AWS account with $${fmt(totalCost)}/day spend likely has AWS-to-AWS data transfer costs. VPC Interface Endpoints eliminate internet-routing charges.`,
        formula: `$${fmt(totalCost)} (total/day) × 5% baseline egress = $${fmt(sav)}/day → $${fmt(sav * 30)}/mo savings`
      });
    }

    // ═══════════════════════════════════════════════════
    // 7. CloudFront — always fires when cfCost > 0
    // ═══════════════════════════════════════════════════
    if (cfCost > 0) {
      const sav = cfCost * 0.15;
      push({
        title: 'CloudFront Cache-Hit Ratio Optimisation',
        impact: '15% CDN REDUCTION',
        type: 'cost', risk: 'LOW',
        savings: sav,
        desc: `CloudFront daily spend: $${fmt(cfCost)}. Raise cache TTLs, enable Origin Shield, and tune cache behaviours. Each 10% cache-hit improvement ≈ 10% origin-traffic cost reduction.`,
        formula: `$${fmt(cfCost)} (CF/day) × 15% cache improvement = $${fmt(sav)}/day → $${fmt(sav * 30)}/mo savings`
      });
    }

    // ═══════════════════════════════════════════════════
    // Cap total savings at 65% of daily spend (realistic ceiling)
    // ═══════════════════════════════════════════════════
    const cappedSavings    = Math.min(potentialSavings, totalCost * 0.65);
    const monthlyCost      = totalCost * 30;
    const monthlyOptimised = (totalCost - cappedSavings) * 30;
    const monthlySavings   = cappedSavings * 30;

    return {
      list: recs,
      potentialSavings: cappedSavings,
      forecastedCost: totalCost - cappedSavings,
      savingsPercentage: totalCost > 0 ? ((cappedSavings / totalCost) * 100).toFixed(1) : '0',
      dailyCost: totalCost,
      monthlyCost,
      monthlyOptimised,
      monthlySavings,
      analysis: {
        peakHour: analyzedMetrics.peakHour, lowestHour: analyzedMetrics.lowestHour,
        loadDiversity: analyzedMetrics.loadDiversity, avgCPU: analyzedMetrics.avgCPU,
        peakCPU: analyzedMetrics.peakCPU, minCPU: analyzedMetrics.minCPU
      }
    };
  }, [serviceBreakdown, analyzedMetrics, data]);

  const costChartData = useMemo(() => {
    return costData.map(day => {
      const entry: any = { date: day.date };
      day.services?.forEach((s: any) => {
        entry[s.name] = Number(s.amount);
      });
      return entry;
    });
  }, [costData]);

  const uniqueServices = useMemo(() => {
    const services = new Set<string>();
    costData.forEach(day => day.services?.forEach((s: any) => services.add(s.name)));
    return Array.from(services).sort();
  }, [costData]);

  const riskRadarData = useMemo(() => [
    { subject: 'Performance', A: 85, fullMark: 100 },
    { subject: 'Cost Efficiency', A: 65, fullMark: 100 },
    { subject: 'Reliability', A: 92, fullMark: 100 },
    { subject: 'Security', A: 78, fullMark: 100 },
    { subject: 'Sustainability', A: 45, fullMark: 100 },
  ], []);

  // ── KPI summary derived from real CloudWatch metric data ──────────────
  const kpiStats = useMemo(() => {
    const invocations  = data['lambda-invocations'] || [];
    const lambdaErr    = data['lambda-errors']      || [];
    const latency      = data['alb-resp']           || [];
    const rdsConn      = data['rds-connections']    || [];
    const ec2Cpu       = data['ec2-cpu-agg']        || [];
    const rdsCpu       = data['rds-cpu-agg']        || [];
    const netIn        = data['ec2-net-in']         || [];
    const netOut       = data['ec2-net-out']        || [];
    const rdsRd        = data['rds-read-iops']      || [];
    const rdsWr        = data['rds-write-iops']     || [];
    const cfReq        = data['cloudfront-requests']|| [];

    const totalReqs = invocations.reduce((s, p) => s + p.value, 0)
                    + cfReq.reduce((s, p) => s + p.value, 0);
    const totalErr  = lambdaErr.reduce((s, p) => s + p.value, 0);
    const errRate   = totalReqs > 0 ? (totalErr / totalReqs) * 100 : 0;

    const avgLatMs  = latency.length > 0
      ? Math.round(latency.reduce((s, p) => s + p.value, 0) / latency.length * 1000)
      : 0;

    const lastConn    = rdsConn.length   > 0 ? Math.round(rdsConn[rdsConn.length - 1].value) : 0;
    const lastEC2CPU  = ec2Cpu.length    > 0 ? parseFloat(ec2Cpu[ec2Cpu.length - 1].value.toFixed(1)) : 0;
    const lastRdsCPU  = rdsCpu.length    > 0 ? parseFloat(rdsCpu[rdsCpu.length - 1].value.toFixed(1)) : 0;
    const totalNetIn  = netIn.reduce((s, p) => s + p.value, 0);
    const totalNetOut = netOut.reduce((s, p) => s + p.value, 0);
    const avgRdRd     = rdsRd.length > 0 ? Math.round(rdsRd.reduce((s, p) => s + p.value, 0) / rdsRd.length) : 0;
    const avgRdWr     = rdsWr.length > 0 ? Math.round(rdsWr.reduce((s, p) => s + p.value, 0) / rdsWr.length) : 0;
    const reqTrend    = invocations.length >= 2
      ? invocations[invocations.length - 1].value - invocations[invocations.length - 2].value : 0;

    const hasData = totalReqs > 0 || latency.length > 0 || rdsConn.length > 0 || ec2Cpu.length > 0;

    return {
      totalRequests: Math.round(totalReqs),
      availability:  parseFloat((100 - Math.min(errRate, 100)).toFixed(1)),
      avgLatMs,
      currentConnections: lastConn,
      currentEC2CPU:  lastEC2CPU,
      currentRdsCPU:  lastRdsCPU,
      totalNetInMB:   parseFloat((totalNetIn  / 1e6).toFixed(1)),
      totalNetOutMB:  parseFloat((totalNetOut / 1e6).toFixed(1)),
      avgReadIOPS:    avgRdRd,
      avgWriteIOPS:   avgRdWr,
      errorRate:      parseFloat(errRate.toFixed(2)),
      totalErrors:    Math.round(totalErr),
      reqTrend,
      hasData,
    };
  }, [data]);

  // ── Unified multi-series chart (EC2 CPU, RDS CPU, Net In/Out normalised) ─
  const unifiedChartData = useMemo(() => {
    const ec2Cpu = data['ec2-cpu-agg'] || [];
    const rdsCpu = data['rds-cpu-agg'] || [];
    const netIn  = data['ec2-net-in']  || [];
    const netOut = data['ec2-net-out'] || [];

    if (ec2Cpu.length === 0 && rdsCpu.length === 0) return [];

    const maxNetIn  = Math.max(...netIn.map(p  => p.value), 1);
    const maxNetOut = Math.max(...netOut.map(p => p.value), 1);
    const maxNet    = Math.max(maxNetIn, maxNetOut);

    const allTs = Array.from(
      new Set([...ec2Cpu, ...rdsCpu, ...netIn, ...netOut].map(p => p.timestamp))
    ).sort((a, b) => a - b);

    const getV = (arr: {timestamp: number; value: number}[], ts: number) => {
      const m = arr.find(p => p.timestamp === ts);
      return m !== undefined ? m.value : null;
    };

    return allTs.map(ts => ({
      timestamp:   ts,
      'EC2 CPU':   getV(ec2Cpu, ts),
      'RDS CPU':   getV(rdsCpu, ts),
      'Net In':    netIn.length  > 0 ? ((getV(netIn,  ts) ?? 0) / maxNet * 100) : null,
      'Net Out':   netOut.length > 0 ? ((getV(netOut, ts) ?? 0) / maxNet * 100) : null,
    }));
  }, [data]);

  const addNotification = (message: string, type: 'error' | 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const fetchEC2Instances = async (cfgOverride?: AwsConfig) => {
    const cfg = cfgOverride || awsConfig;
    addOpsLog(`NET: Refreshing EC2 Instance Table...`);
    try {
      const response = await fetch('/api/ec2/instances', {
        headers: {
          'x-aws-key': cfg.key,
          'x-aws-secret': cfg.secret,
          'x-aws-region': cfg.region
        }
      });
      if (!response.ok) throw new Error('EC2 fetch failed');
      const data = await response.json();
      setEc2Instances(data);
    } catch (err) {
      console.error('EC2 fetch error:', err);
    }
  };

  const sendAlert = async (metric: MetricConfig, value: number) => {
    addOpsLog(`ALERT: Triggering cross-channel notification stack for ${metric.title}`);
    const valStr = formatValue(value, metric.unit);
    const message = `Threshold breached for ${metric.title}: ${valStr} (THR: ${metric.alarmThreshold})`;
    const subject = `ALARM: ${metric.title}`;

    // Visual notification
    addNotification(`CRITICAL: ${metric.title} is breaching trust!`, 'error');

    // Use setTimeout for browser compatibility (process.nextTick is Node-only)
    setTimeout(async () => {
      try {
        // 1. SNS
        if (awsConfig.snsTopic) {
          await fetch('/api/alert', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-aws-key': awsConfig.key,
              'x-aws-secret': awsConfig.secret,
              'x-aws-region': awsConfig.region,
              'x-aws-sns-topic': awsConfig.snsTopic
            },
            body: JSON.stringify({ message, subject, type: 'sns' })
          });
        }

        // 2. Slack
        if (awsConfig.slackWebhook) {
          await fetch('/api/alert', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'x-slack-webhook': awsConfig.slackWebhook 
            },
            body: JSON.stringify({ message, subject, type: 'slack' })
          });
        }

        // 3. EmailJS
        if (typeof (window as any).emailjs !== 'undefined') {
          (window as any).emailjs.send("service_id", "template_id", {
            metric: metric.title,
            value: valStr,
            threshold: metric.alarmThreshold
          }, "user_id").catch(console.error);
        }
        
        addNotification(`External alerts dispatched successfully`, 'success');
      } catch (error) {
        console.error('Alert error:', error);
      }
    });
  };

  const fetchMetricData = async (metric: MetricConfig, cfgOverride?: AwsConfig) => {
    const cfg = cfgOverride || awsConfig;
    addOpsLog(`NET: Fetching ${metric.title} [${metric.namespace}]`);
    setLoading(prev => ({ ...prev, [metric.id]: true }));
    try {
      const getMetric = async (start?: string, end?: string) => {
        const response = await fetch('/api/metrics', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-aws-key': cfg.key,
            'x-aws-secret': cfg.secret,
            'x-aws-region': cfg.region
          },
          body: JSON.stringify({
            namespace: metric.namespace,
            metricName: metric.metricName,
            dimensions: metric.dimensions,
            hours: globalTimeframe,
            start,
            end
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to fetch metrics');
        }
        return response.json();
      };

      const result = await getMetric();
      setData(prev => ({ ...prev, [metric.id]: result }));

      // Fetch comparison if enabled
      if (comparisonPeriod !== 'none') {
        const offset = comparisonPeriod === '1d' ? 1 : comparisonPeriod === '7d' ? 7 : 30;
        const offsetMs = offset * 24 * 60 * 60 * 1000;
        const start = new Date(Date.now() - globalTimeframe * 60 * 60 * 1000 - offsetMs).toISOString();
        const end = new Date(Date.now() - offsetMs).toISOString();
        const compResult = await getMetric(start, end);
        setComparisonData(prev => ({ ...prev, [metric.id]: compResult }));
      } else {
        setComparisonData(prev => ({ ...prev, [metric.id]: [] }));
      }
      
      // Check for alarms
      if (metric.alarmThreshold !== undefined && result.length > 0) {
        const lastVal = result[result.length - 1].value;
        if (lastVal > metric.alarmThreshold) {
          if (!triggeredAlarms[metric.id]) {
            setPendingAlert({ metric, value: lastVal });
          }
        } else {
          setTriggeredAlarms(prev => ({ ...prev, [metric.id]: false }));
        }
      }

      setError(null);
    } catch (err: any) {
      console.error(err);
      // Surface AWS credential errors more clearly
      const msg: string = err.message || '';
      if (msg.includes('signature') || msg.includes('SignatureDoesNotMatch')) {
        setError('AWS Secret Key is invalid or incorrect. Go to Settings > Clear Credentials, then re-upload your CSV.');
        addOpsLog(`AUTH FAIL: Signature mismatch on ${metric.title}. Check your AWS Secret Key.`);
      } else if (msg.includes('not configured') || msg.includes('credentials')) {
        setError('AWS credentials not configured. Upload your CSV in Settings.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(prev => ({ ...prev, [metric.id]: false }));
    }
  };

  const fetchCostData = async (cfgOverride?: AwsConfig) => {
    const cfg = cfgOverride || awsConfig;
    if (!cfg.key || !cfg.secret) return; // Don't call without credentials
    try {
      const response = await fetch('/api/cost', {
        headers: {
          'x-aws-key': cfg.key,
          'x-aws-secret': cfg.secret,
          'x-aws-region': cfg.region,
          'x-timezone': userTimezone
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Cost fetch failed' }));
        console.error('Cost fetch error:', errData.error);
        return;
      }
      const result = await response.json();
      setCostData(result);
    } catch (err) {
      console.error('Cost fetch error', err);
    }
  };

  const COLORS = ['#58a6ff', '#3fb950', '#ff9900', '#f85149', '#8b949e', '#79c0ff', '#56d364'];

  const updateMetricTimeframe = (id: string, hours: number) => {
    setMetrics(prev => prev.map(m => m.id === id ? { ...m, timeframe: hours } : m));
  };

  const handleAlertConfirm = () => {
    if (pendingAlert) {
      sendAlert(pendingAlert.metric, pendingAlert.value);
      setTriggeredAlarms(prev => ({ ...prev, [pendingAlert.metric.id]: true }));
      setPendingAlert(null);
    }
  };

  const handleAlertCancel = () => {
    if (pendingAlert) {
      // Mark as acknowledged so it doesn't pop up again immediately
      setTriggeredAlarms(prev => ({ ...prev, [pendingAlert.metric.id]: true }));
      setPendingAlert(null);
    }
  };

  const refreshAll = async (configOverride?: AwsConfig) => {
    const cfg = configOverride || awsConfig;
    addOpsLog(`SYS: Full dashboard synchronization initiated [T+0s]`);
    setIsRefreshing(true);
    const hasEC2Related = metrics.some(m => m.namespace === 'AWS/EC2' || m.namespace === 'AWS/ApplicationELB' || m.namespace === 'AWS/NetworkELB' || m.namespace === 'AWS/AutoScaling');
    
    // Guard: Check if AWS credentials are configured before making API calls
    if (!cfg.key || !cfg.secret) {
      addOpsLog(`AUTH: AWS credentials not configured. Please upload CSV or enter credentials.`);
      setError('AWS credentials not configured. Please upload your credentials CSV file.');
      setIsRefreshing(false);
      return;
    }
    
    try {
      await Promise.all([
        ...metrics.map(m => fetchMetricData(m, cfg)),
        fetchCostData(cfg),
        hasEC2Related ? fetchEC2Instances(cfg) : Promise.resolve()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Only start polling AFTER the user leaves the landing page
  useEffect(() => {
    if (showLanding) return;
    refreshAll();
    const interval = setInterval(refreshAll, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval, metrics.length, globalTimeframe, showLanding]);

  const handleAddMetric = () => {
    if (!newMetric.title || !newMetric.namespace || !newMetric.metricName) return;
    const metricToAdd: MetricConfig = {
      id: `m-${Date.now()}`,
      title: newMetric.title as string,
      namespace: newMetric.namespace as string,
      metricName: newMetric.metricName as string,
      dimensions: newMetric.dimensions || [],
      unit: newMetric.unit || '%',
      color: newMetric.color || '#58a6ff',
      alarmThreshold: newMetric.alarmThreshold
    };
    setMetrics(prev => [...prev, metricToAdd]);
    setNewMetric({ namespace: 'AWS/EC2', metricName: 'CPUUtilization', unit: '%', color: '#58a6ff', alarmThreshold: undefined });
  };

  const getInstanceSuggestions = (inst: any) => {
    const suggestions = [];
    const type = inst.type?.toLowerCase() || '';
    
    if (inst.state !== 'running') {
      suggestions.push("TERMINATE: Stopped instances still incur EBS costs. Terminate if obsolete.");
    } else {
      if (type.includes('xlarge') || type.includes('2xlarge')) {
        suggestions.push("RIGHTSIZE: Consider downsizing if peak CPU < 20%. Potential 50% savings.");
      }
      if (!type.startsWith('t3') && !type.startsWith('t4g') && !type.startsWith('t2')) {
        suggestions.push("T-FAMILY: Switch to T3/T4g burstable types for generic workloads (save ~40%).");
      }
      if (!type.startsWith('t4g') && !type.startsWith('m6g') && !type.startsWith('c6g')) {
        suggestions.push("GRAVITON: Migrate to ARM64 (Graviton) for 20% better price/performance.");
      }
    }
    suggestions.push("RESERVED: Commit to 1yr/3yr Savings Plan for up to 72% discount.");
    return suggestions;
  };

  const handleTestConnection = async () => {
    setSaveStatus('testing');
    setError(null);
    try {
      await refreshAll();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      setError(err.message);
    }
  };

  if (showLanding) {
    return <LandingPage onStart={() => setShowLanding(false)} />;
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans uppercase select-none">
      {/* Header */}
      <header className="h-auto md:h-[48px] bg-surface border-b border-border flex flex-col md:flex-row items-center justify-between px-4 py-2 md:py-0 shrink-0 shadow-sm z-20 gap-3">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <div className="bg-aws-orange text-black px-1.5 py-0.5 rounded text-[10px] font-extrabold">AWS</div>
            <span className="font-semibold text-[12px] tracking-tight">CloudWatch Metrics Explorer</span>
          </div>
          
          <nav className="flex h-full ml-4">
            <button 
              onClick={() => setActiveTab('metrics')}
              className={cn(
                "px-4 h-full text-[11px] font-semibold border-b-2 transition-colors",
                activeTab === 'metrics' ? "border-blue text-white" : "border-transparent text-text-muted hover:text-text"
              )}
            >
              Metrics
            </button>
            <button 
              onClick={() => setActiveTab('cost')}
              className={cn(
                "px-4 h-full text-[11px] font-semibold border-b-2 transition-colors flex items-center gap-2",
                activeTab === 'cost' ? "border-blue text-white" : "border-transparent text-text-muted hover:text-text"
              )}
            >
              <DollarSign size={12} />
              Cost & Opts
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={cn(
                "px-4 h-full text-[11px] font-semibold border-b-2 transition-colors flex items-center gap-2",
                activeTab === 'settings' ? "border-blue text-white" : "border-transparent text-text-muted hover:text-text"
              )}
            >
              <Settings size={12} />
              Settings
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {error && (
            <div className="flex items-center gap-1 text-[#f85149] px-2 py-0.5 text-[10px] border border-[#f85149]/30 bg-[#f85149]/10 rounded">
              <AlertCircle size={10} />
              <span className="max-w-[150px] truncate">{error}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 bg-bg px-2 py-1 rounded border border-border">
            <span className="text-[9px] font-mono text-text-muted">Interval</span>
            <select 
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-[10px] font-mono outline-none cursor-pointer text-blue p-0 h-auto appearance-none"
            >
              {[5, 10, 30, 60, 300].map(v => (
                <option key={v} value={v} className="bg-surface text-text">{v}s</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-bg px-2 py-1 rounded border border-border">
            <span className="text-[9px] font-mono text-text-muted">Time</span>
            <select 
              value={globalTimeframe}
              onChange={(e) => setGlobalTimeframe(Number(e.target.value))}
              className="bg-transparent text-[10px] font-mono outline-none cursor-pointer text-blue p-0 h-auto appearance-none"
            >
              <option value={1} className="bg-surface text-text">Real-Time</option>
              <option value={6} className="bg-surface text-text">6H</option>
              <option value={12} className="bg-surface text-text">12H</option>
              <option value={24} className="bg-surface text-text">24H</option>
              <option value={48} className="bg-surface text-text">2D</option>
              <option value={168} className="bg-surface text-text">7D</option>
            </select>
          </div>

          <button 
            onClick={refreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#21262d] border border-border text-text text-[11px] rounded-md hover:bg-[#30363d] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} className={cn(isRefreshing && "animate-spin")} />
            <span>{isRefreshing ? 'Syncing' : 'Sync'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
        {/* Sidebar */}
        <aside className="w-full md:w-[260px] bg-surface border-b md:border-b-0 md:border-r border-border p-4 flex flex-col gap-6 shrink-0 overflow-y-auto no-scrollbar max-h-[300px] md:max-h-full">
          {activeTab === 'metrics' ? (
            <>
              <div className="bg-bg/40 border border-border/60 rounded-xl p-5 backdrop-blur-sm transition-all hover:bg-bg/60">
                <div className="text-[10px] text-text-muted font-bold tracking-[0.2em] mb-4 flex items-center gap-2 opacity-80">
                  <Clock size={12} className="text-blue" />
                  TIME-SERIES COMPARISON
                </div>
                <select 
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-[11px] outline-none text-blue focus:border-blue/60 transition-all font-mono"
                  value={comparisonPeriod}
                  onChange={(e) => setComparisonPeriod(e.target.value as any)}
                >
                  <option value="none">REAL-TIME STREAM</option>
                  <option value="1d">VS YESTERDAY (-24H)</option>
                  <option value="7d">VS LAST WEEK (-7D)</option>
                  <option value="30d">VS LAST MONTH (-30D)</option>
                </select>
                <div className="mt-3 flex items-center gap-2 px-1">
                  <div className="w-1 h-1 rounded-full bg-blue"></div>
                  <p className="text-[8px] text-text-muted font-medium leading-none uppercase tracking-widest">
                    Trend Overlay Engine Active
                  </p>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-text-muted font-bold tracking-widest mb-3 flex items-center gap-2">
                  <Terminal size={12} />
                  Custom Query Editor
                </div>
                <div className="bg-bg border border-border rounded-lg p-3 flex flex-col gap-3">
                  <input 
                    placeholder="Monitor Title..."
                    className="bg-transparent border-b border-border text-[11px] py-1 outline-none text-white focus:border-blue transition-colors"
                    value={newMetric.title || ''}
                    onChange={e => setNewMetric(p => ({ ...p, title: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-text-muted">Namespace</label>
                      <input 
                        className="bg-surface border border-border rounded px-2 py-1 text-[10px] outline-none"
                        value={newMetric.namespace || ''}
                        onChange={e => setNewMetric(p => ({ ...p, namespace: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-text-muted">Metric</label>
                      <input 
                        className="bg-surface border border-border rounded px-2 py-1 text-[10px] outline-none"
                        value={newMetric.metricName || ''}
                        onChange={e => setNewMetric(p => ({ ...p, metricName: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-text-muted">Dimensions (Key=Val,Key2=Val2)</label>
                    <input 
                      placeholder="e.g. InstanceId=i-123"
                      className="bg-surface border border-border rounded px-2 py-1 text-[10px] outline-none"
                      value={newMetric.dimensions?.map(d => `${d.Name}=${d.Value}`).join(',') || ''}
                      onChange={e => {
                        const pairs = e.target.value.split(',').filter(Boolean);
                        const dims = pairs.map(p => {
                          const [Name, Value] = p.split('=');
                          return { Name: (Name || '').trim(), Value: (Value || '').trim() };
                        });
                        setNewMetric(p => ({ ...p, dimensions: dims }));
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-text-muted">Color Hash</label>
                    <div className="flex gap-2">
                      <input 
                        className="flex-1 bg-surface border border-border rounded px-2 py-1 text-[10px] outline-none"
                        value={newMetric.color || ''}
                        onChange={e => setNewMetric(p => ({ ...p, color: e.target.value }))}
                      />
                      <div className="w-6 h-6 rounded border border-border" style={{ backgroundColor: newMetric.color || 'transparent' }}></div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-text-muted">Alarm Threshold (Value to trigger SNS/Email)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 80"
                      className="bg-surface border border-border rounded px-2 py-1 text-[10px] outline-none"
                      value={newMetric.alarmThreshold || ''}
                      onChange={e => setNewMetric(p => ({ ...p, alarmThreshold: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                  </div>
                  <button 
                    onClick={handleAddMetric}
                    className="mt-2 w-full py-1.5 bg-blue text-black font-bold text-[10px] rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-blue/20"
                  >
                    <Plus size={12} />
                    Run Query
                  </button>
                </div>
              </div>
              
              <div>
                <div className="text-[10px] text-text-muted font-bold tracking-widest mb-3 flex items-center gap-2">
                  <Activity size={12} />
                  Active Monitors ({metrics.length})
                </div>
                <div className="flex flex-col gap-1">
                  {metrics.map(m => (
                    <div key={m.id} className="group p-2 bg-bg/50 border border-transparent hover:border-border hover:bg-bg rounded transition-all cursor-default">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color, boxShadow: `0 0 8px ${m.color}88` }}></div>
                        <span className="text-[11px] font-semibold text-text truncate flex-1">{m.title}</span>
                        <button 
                          onClick={() => setMetrics(prev => prev.filter(item => item.id !== m.id))}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/5 rounded"
                        >
                          <Trash2 size={10} className="text-text-muted hover:text-[#f85149]" />
                        </button>
                      </div>
                      <div className="text-[9px] text-text-muted mt-1 font-mono uppercase truncate opacity-60">
                        {m.namespace} / {m.metricName}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : activeTab === 'cost' ? (
            <>
              <div>
                <div className="text-[10px] text-text-muted font-bold tracking-widest mb-3 flex items-center gap-2">
                  <Lightbulb size={12} className="text-blue" />
                  AI Recommendations
                  <span className="ml-auto text-[8px] font-bold bg-blue/10 border border-blue/20 text-blue px-1.5 py-0.5 rounded-full">
                    {preciseRecommendations.list.length}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {preciseRecommendations.list.length === 0 ? (
                    <div className="p-3 bg-bg/50 border border-border rounded-lg text-[10px] text-text-muted italic leading-relaxed">
                      Connect AWS credentials and sync data to generate AI-powered cost recommendations.
                    </div>
                  ) : (
                    preciseRecommendations.list.slice(0, 3).map((rec, i) => (
                      <div
                        key={i}
                        className={cn(
                          'p-3 rounded-lg border',
                          rec.type === 'reliability' ? 'bg-red-900/10 border-red-900/20' :
                          rec.type === 'performance' ? 'bg-blue/10 border-blue/20' :
                          'bg-green/10 border-green/20'
                        )}
                      >
                        <div className={cn(
                          'flex items-center gap-2 font-bold text-[10px] tracking-wide mb-1',
                          rec.type === 'reliability' ? 'text-red-400' :
                          rec.type === 'performance' ? 'text-blue' : 'text-green'
                        )}>
                          <Zap size={11} />
                          {rec.title}
                        </div>
                        <p className="text-[10px] leading-relaxed text-text line-clamp-3">{rec.desc}</p>
                        {rec.savings > 0 && (
                          <div className="mt-2 text-[9px] font-bold text-green">
                            Savings: +${rec.savings.toFixed(2)}/day
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-text-muted font-bold tracking-widest mb-3 flex items-center gap-2">
                  <Layers size={12} />
                  Cost Summary
                </div>
                <div className="flex flex-col gap-2 text-[10px] border-l-2 border-border pl-3">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Daily Spend</span>
                    <span className="font-mono font-bold text-white">${preciseRecommendations.dailyCost?.toFixed(2) ?? '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Monthly Est.</span>
                    <span className="font-mono font-bold text-white">${preciseRecommendations.monthlyCost?.toFixed(2) ?? '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Optimised Target</span>
                    <span className="font-mono font-bold text-green">${preciseRecommendations.monthlyOptimised?.toFixed(2) ?? '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Potential Savings</span>
                    <span className="font-mono font-bold text-green">-${preciseRecommendations.monthlySavings?.toFixed(2) ?? '0.00'}/mo</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-[10px] text-text-muted font-bold tracking-widest mb-3 flex items-center gap-2">
                  <Settings size={12} />
                  AWS Configuration Overrides
                  {csvLoaded && (
                    <span className="ml-auto flex items-center gap-1 text-green text-[9px] font-bold bg-green/10 border border-green/30 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={9} /> CSV LOADED
                    </span>
                  )}
                </div>
                {csvLoaded && (
                  <div className="mb-3 p-2.5 bg-green/5 border border-green/20 rounded-lg">
                    <p className="text-[9px] text-green font-bold">{csvLoaded.name}</p>
                    <p className="text-[9px] text-text-muted mt-0.5">Auto-filled: {csvLoaded.fields.join(' \u00b7 ')}</p>
                  </div>
                )}
                {(awsConfig.key || awsConfig.secret) && (
                  <button
                    onClick={clearCredentials}
                    className="mb-3 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-[10px] font-bold text-[#f85149] border border-[#f85149]/30 bg-[#f85149]/5 hover:bg-[#f85149]/15 rounded-lg transition-colors"
                  >
                    <Trash2 size={11} />
                    Clear Stored Credentials &amp; Reset
                  </button>
                )}
                <div className="flex flex-col gap-4 bg-bg border border-border p-4 rounded-lg">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-muted font-bold tracking-wider">AWS Access Key</label>
                    <div className="relative">
                      <input 
                        type={showKey ? 'text' : 'password'}
                        placeholder="Leave empty for env default"
                        className={cn(
                          "w-full bg-surface border rounded px-3 py-1.5 text-[11px] outline-none text-white focus:border-blue transition-colors pr-8",
                          csvLoaded && awsConfig.key ? "border-green/50 bg-green/5" : "border-border"
                        )}
                        value={awsConfig.key || ''}
                        onChange={e => setAwsConfig(p => ({ ...p, key: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                      >
                        {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-muted font-bold tracking-wider">AWS Secret Key</label>
                    <div className="relative">
                      <input 
                        type={showSecret ? 'text' : 'password'}
                        placeholder="Leave empty for env default"
                        className={cn(
                          "w-full bg-surface border rounded px-3 py-1.5 text-[11px] outline-none text-white focus:border-blue transition-colors pr-8",
                          csvLoaded && awsConfig.secret ? "border-green/50 bg-green/5" : "border-border"
                        )}
                        value={awsConfig.secret || ''}
                        onChange={e => setAwsConfig(p => ({ ...p, secret: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                      >
                        {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-muted font-bold tracking-wider">AWS Region</label>
                    <input 
                      placeholder="e.g. us-east-1"
                      className="bg-surface border border-border rounded px-3 py-1.5 text-[11px] outline-none text-white focus:border-blue transition-colors"
                      value={awsConfig.region || ''}
                      onChange={e => setAwsConfig(p => ({ ...p, region: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-muted font-bold tracking-wider">SNS Topic ARN</label>
                    <input 
                      placeholder="arn:aws:sns:..."
                      className="bg-surface border border-border rounded px-3 py-1.5 text-[11px] outline-none text-white focus:border-blue transition-colors"
                      value={awsConfig.snsTopic || ''}
                      onChange={e => setAwsConfig(p => ({ ...p, snsTopic: e.target.value }))}
                    />
                  </div>
                  <p className="text-[9px] text-text-muted italic leading-relaxed">
                    * These settings are stored locally in your browser and used to override the server-side environment variables for the current session.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="text-[11px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                  <Upload size={12} className="text-blue" />
                  Bulk Credential Upload
                </div>
                <div className={cn(
                  "relative border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 transition-all group",
                  csvLoaded ? "border-green/50 bg-green/5" : "border-border hover:border-blue/50"
                )}>
                  <input 
                    type="file" 
                    accept=".csv,.xlsx" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  {csvLoaded ? (
                    <>
                      <div className="w-12 h-12 bg-green/10 border border-green/30 rounded-full flex items-center justify-center text-green">
                        <CheckCircle2 size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-[12px] font-bold text-green">Credentials Loaded!</p>
                        <p className="text-[10px] text-text-muted mt-1 truncate max-w-[140px]">{csvLoaded.name}</p>
                        <p className="text-[9px] text-green/70 mt-1">Auto-syncing dashboard…</p>
                      </div>
                      <p className="text-[9px] text-text-muted">Click to replace CSV</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center text-text-muted group-hover:text-blue transition-colors">
                        <FileCode size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-[12px] font-bold text-white">Drop .csv or .xlsx</p>
                        <p className="text-[10px] text-text-muted mt-1">AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, etc.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </aside>

        {/* Dashboard Grid */}
        <div className="flex-1 overflow-y-auto bg-bg p-3 md:p-5 no-scrollbar">
          {activeTab === 'metrics' ? (
            <div className="flex flex-col gap-6">
              {/* EC2 Infrastructure Overview Section (Dynamic) */}
              {ec2Instances.length > 0 && (
                <div className="bg-surface border border-border rounded-xl p-5 shadow-2xl overflow-hidden animate-in fade-in duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-blue rounded-full"></div>
                      <h2 className="text-xl font-bold tracking-tight">Active Infrastructure Components</h2>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-widest text-text-muted">
                      <span>Total: {ec2Instances.length}</span>
                      <span className="text-green">Running: {ec2Instances.filter(i => i.state === 'running').length}</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead>
                        <tr className="border-b border-border text-text-muted uppercase tracking-widest">
                          <th className="pb-3 pr-4">Instance ID</th>
                          <th className="pb-3 pr-4">Type</th>
                          <th className="pb-3 pr-4">ASG</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 pr-4 text-right">Public IP</th>
                          <th className="pb-3 pr-4 text-center">Optimise</th>
                          <th className="pb-3 text-right">Launched</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {ec2Instances.map((inst, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors group">
                            <td className="py-3 pr-4 font-bold text-blue group-hover:text-blue/80 transition-colors cursor-pointer">{inst.instanceId}</td>
                            <td className="py-3 pr-4 text-white opacity-80">{inst.type}</td>
                            <td className="py-3 pr-4 font-mono text-[9px]">
                              {inst.tags?.find((t: any) => t.Key === 'aws:autoscaling:groupName')?.Value || <span className="opacity-30">N/A</span>}
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-1.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", inst.state === 'running' ? "bg-green shadow-[0_0_8px_rgba(59,185,80,0.5)]" : "bg-yellow")} />
                                <span className={cn("font-bold uppercase text-[9px]", inst.state === 'running' ? "text-green" : "text-yellow")}>{inst.state}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-right font-mono text-text-muted select-text">{inst.publicIp}</td>
                            <td className="py-3 pr-4 text-center relative group/tip">
                              <div className="flex justify-center">
                                <button className="text-aws-orange hover:text-white transition-colors p-1 rounded-full bg-aws-orange/10">
                                  <Lightbulb size={14} />
                                </button>
                              </div>
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[#161b22] border border-border p-3 rounded-lg shadow-2xl opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all z-50 pointer-events-none">
                                <div className="flex items-center gap-2 mb-2 text-aws-orange border-b border-border/50 pb-1">
                                  <TrendingDown size={12} />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Savings Recommendations</span>
                                </div>
                                <div className="space-y-2">
                                  {getInstanceSuggestions(inst).map((s, idx) => (
                                    <div key={idx} className="flex gap-2 text-[9px] text-text leading-tight font-sans text-left">
                                      <div className="mt-1 w-1 h-1 rounded-full bg-blue shrink-0" />
                                      {s}
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 pt-2 border-t border-border/50 text-[8px] text-text-muted italic text-center">
                                  Estimates based on current AWS region pricing.
                                </div>
                                {/* Tooltip Arrow */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#161b22]" />
                              </div>
                            </td>
                            <td className="py-3 text-right text-text-muted italic">{format(new Date(inst.launchTime), 'MMM d, HH:mm')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Unified KPI Summary Row ─────────────────────────────────────── */}
              {kpiStats.hasData && (
                <div className="bg-surface border border-border rounded-xl p-5 shadow-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1.5 h-6 bg-blue rounded-full"></div>
                    <h2 className="text-lg font-bold tracking-tight">Application &amp; Backend Routes</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Total Requests */}
                    <div className="bg-bg/50 border border-border/40 rounded-lg p-4">
                      <span className="text-[9px] text-text-muted uppercase font-bold tracking-widest">Total Requests</span>
                      <div className="text-2xl font-mono font-bold text-white mt-1">
                        {kpiStats.totalRequests > 999 ? (kpiStats.totalRequests / 1000).toFixed(1) + 'K' : kpiStats.totalRequests}
                      </div>
                      {kpiStats.reqTrend !== 0 && (
                        <span className={cn("text-[9px] font-bold", kpiStats.reqTrend > 0 ? "text-green" : "text-red-400")}>
                          {kpiStats.reqTrend > 0 ? '↑' : '↓'} {Math.abs(kpiStats.reqTrend)} vs prev
                        </span>
                      )}
                    </div>
                    {/* Availability */}
                    <div className="bg-bg/50 border border-border/40 rounded-lg p-4">
                      <span className="text-[9px] text-text-muted uppercase font-bold tracking-widest">Availability</span>
                      <div className="text-2xl font-mono font-bold text-green mt-1">{kpiStats.availability}%</div>
                      <span className="text-[9px] text-text-muted">last {globalTimeframe}h</span>
                    </div>
                    {/* Avg Latency */}
                    <div className="bg-bg/50 border border-border/40 rounded-lg p-4">
                      <span className="text-[9px] text-text-muted uppercase font-bold tracking-widest">Avg Latency</span>
                      <div className="text-2xl font-mono font-bold text-blue mt-1">{kpiStats.avgLatMs}ms</div>
                      <span className="text-[9px] text-text-muted">ALB target response</span>
                    </div>
                    {/* DB Connections */}
                    <div className="bg-bg/50 border border-border/40 rounded-lg p-4">
                      <span className="text-[9px] text-text-muted uppercase font-bold tracking-widest">DB Connections</span>
                      <div className="text-2xl font-mono font-bold text-white mt-1">{kpiStats.currentConnections}</div>
                      <span className="text-[9px] text-text-muted">active sessions</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Infrastructure Health Overview ──────────────────────────────── */}
              {kpiStats.hasData && (
                <div className="bg-surface border border-border rounded-xl p-5 shadow-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1.5 h-6 bg-green rounded-full"></div>
                    <h2 className="text-lg font-bold tracking-tight">Infrastructure &amp; Cloud</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* EC2/ECS */}
                    <div className="bg-bg/40 border border-border/40 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-green animate-pulse"></div>
                        <span className="text-[10px] font-bold text-green uppercase tracking-wider">EC2/ECS Compute</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-text-muted">CPU util</span>
                          <div className="font-mono font-bold text-white">{kpiStats.currentEC2CPU}%</div>
                        </div>
                        <div>
                          <span className="text-text-muted">Net In</span>
                          <div className="font-mono font-bold text-blue">{kpiStats.totalNetInMB} MB</div>
                        </div>
                        <div>
                          <span className="text-text-muted">Net Out</span>
                          <div className="font-mono font-bold text-orange-400">{kpiStats.totalNetOutMB} MB</div>
                        </div>
                      </div>
                    </div>
                    {/* RDS */}
                    <div className="bg-bg/40 border border-border/40 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-green animate-pulse"></div>
                        <span className="text-[10px] font-bold text-green uppercase tracking-wider">RDS Database</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-text-muted">CPU</span>
                          <div className="font-mono font-bold text-white">{kpiStats.currentRdsCPU}%</div>
                        </div>
                        <div>
                          <span className="text-text-muted">Connections</span>
                          <div className="font-mono font-bold text-blue">{kpiStats.currentConnections}</div>
                        </div>
                        <div>
                          <span className="text-text-muted">Read IOPS</span>
                          <div className="font-mono font-bold text-green">{kpiStats.avgReadIOPS}</div>
                        </div>
                        <div>
                          <span className="text-text-muted">Write IOPS</span>
                          <div className="font-mono font-bold text-orange-400">{kpiStats.avgWriteIOPS}</div>
                        </div>
                      </div>
                    </div>
                    {/* Load Balancer */}
                    <div className="bg-bg/40 border border-border/40 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-green animate-pulse"></div>
                        <span className="text-[10px] font-bold text-green uppercase tracking-wider">Load Balancer</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-text-muted">Avg latency</span>
                          <div className="font-mono font-bold text-white">{kpiStats.avgLatMs}ms</div>
                        </div>
                        <div>
                          <span className="text-text-muted">Total req</span>
                          <div className="font-mono font-bold text-blue">{kpiStats.totalRequests > 999 ? (kpiStats.totalRequests / 1000).toFixed(1) + 'K' : kpiStats.totalRequests}</div>
                        </div>
                        <div>
                          <span className="text-text-muted">Error rate</span>
                          <div className={cn("font-mono font-bold", kpiStats.errorRate > 1 ? "text-red-400" : "text-green")}>
                            {kpiStats.errorRate}%
                          </div>
                        </div>
                        <div>
                          <span className="text-text-muted">Health</span>
                          <div className={cn("font-mono font-bold", kpiStats.availability >= 99.9 ? "text-green" : "text-yellow")}>
                            {kpiStats.availability >= 99.9 ? 'Healthy' : 'Degraded'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Unified Multi-Service Traffic Chart ─────────────────────────── */}
              {kpiStats.hasData && unifiedChartData.length > 0 && (
                <div className="bg-surface border border-border rounded-xl p-5 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-orange-400 rounded-full"></div>
                      <div>
                        <h2 className="text-lg font-bold tracking-tight">Traffic &amp; CPU Instance Count Correlation</h2>
                        <p className="text-[9px] text-text-muted">CPU utilisation vs network throughput over last {globalTimeframe}h</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] font-bold">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span> EC2 CPU</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green"></span> RDS CPU</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue"></span> Net In</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span> Net Out</span>
                    </div>
                  </div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={unifiedChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" strokeOpacity={0.3} />
                        <XAxis
                          dataKey="timestamp"
                          tick={{ fontSize: 9, fill: '#8b949e' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => format(new Date(v), 'MMM dd HH:mm')}
                        />
                        <YAxis tick={{ fontSize: 9, fill: '#8b949e' }} axisLine={false} tickLine={false} unit="%" />
                        <Tooltip
                          cursor={{ stroke: '#30363d', strokeWidth: 1 }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-[#161b22] border border-[#30363d] p-3 text-[10px] font-mono rounded shadow-2xl">
                                  <p className="text-blue font-bold border-b border-border pb-1 mb-2">{format(new Date(label as number), 'MMM dd HH:mm')}</p>
                                  {payload.map((e: any, i: number) => (
                                    <div key={i} className="flex justify-between gap-4">
                                      <span style={{ color: e.color }} className="opacity-70">{e.name}</span>
                                      <span className="font-bold">{e.value !== null ? e.value.toFixed(1) + '%' : '—'}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line type="monotone" dataKey="EC2 CPU" stroke="#ff9900" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <Line type="monotone" dataKey="RDS CPU" stroke="#3fb950" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <Line type="monotone" dataKey="Net In" stroke="#58a6ff" strokeWidth={1.5} dot={false} isAnimationActive={false} strokeDasharray="5 3" />
                        <Line type="monotone" dataKey="Net Out" stroke="#f85149" strokeWidth={1.5} dot={false} isAnimationActive={false} strokeDasharray="5 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── Error Tracking &amp; Code Quality ──────────────────────────────── */}
              {kpiStats.hasData && (data['lambda-errors'] || []).length > 0 && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="bg-surface border border-border rounded-xl p-5 shadow-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1.5 h-6 bg-red-400 rounded-full"></div>
                      <div>
                        <h2 className="text-lg font-bold tracking-tight">Error Rate Trend</h2>
                        <p className="text-[9px] text-text-muted">Lambda error counts over last {globalTimeframe}h</p>
                      </div>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data['lambda-errors']}>
                          <defs>
                            <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f85149" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#f85149" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" strokeOpacity={0.3} />
                          <XAxis
                            dataKey="timestamp"
                            tick={{ fontSize: 9, fill: '#8b949e' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => format(new Date(v), 'MMM dd HH:mm')}
                          />
                          <YAxis tick={{ fontSize: 9, fill: '#8b949e' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-[#161b22] border border-[#30363d] p-3 text-[10px] font-mono rounded shadow-2xl">
                                    <p className="text-red-400 font-bold">{format(new Date(label as number), 'MMM dd HH:mm')}</p>
                                    <p className="mt-1">Errors: <span className="font-bold text-white">{payload[0].value}</span></p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area type="monotone" dataKey="value" stroke="#f85149" fill="url(#errorGrad)" strokeWidth={2} isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-surface border border-border rounded-xl p-5 shadow-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1.5 h-6 bg-yellow rounded-full"></div>
                      <div>
                        <h2 className="text-lg font-bold tracking-tight">Top Recurring Errors</h2>
                        <p className="text-[9px] text-text-muted">Top error patterns sorted by frequency</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {data['lambda-errors']?.filter(p => p.value > 0)
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 5)
                        .map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-bg/40 border border-border/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-red-400/20 text-red-400 text-[8px] font-bold flex items-center justify-center">{i + 1}</span>
                            <span className="text-[10px] text-text-mono font-mono">Lambda invocation error</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-red-400">{Math.round(p.value)}</span>
                        </div>
                      ))}
                      {(data['lambda-errors'] || []).filter(p => p.value > 0).length === 0 && (
                        <p className="text-[10px] text-text-muted italic text-center py-8">No errors detected in this window.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Detailed Metric Cards (original grid) ───────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Metrics Grid */}
                {metrics.map((metric, idx) => (
                  <EnhancedMetricCard 
                    key={metric.id}
                    metric={metric}
                    data={data[metric.id] || []}
                    isLoading={loading[metric.id]}
                    fullWidth={idx === 0 && metrics.length % 2 !== 0}
                    globalTimeframe={globalTimeframe}
                    onGlobalTimeframeChange={setGlobalTimeframe}
                  />
                ))}
              </div>

              {/* Beyond AWS: Sustainable & Risk Analysis */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
                <div className="col-span-1 bg-surface border border-border rounded-xl p-6 shadow-2xl flex flex-col gap-6 relative overflow-hidden group">
                  <div className="absolute top-[-20%] right-[-10%] opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                    <Leaf size={240} className="text-green" />
                  </div>
                  
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <div className="flex items-center gap-2 text-green mb-1">
                        <Leaf size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Sustainability Tracker</span>
                      </div>
                      <h3 className="text-xl font-bold">Cloud Carbon Footprint</h3>
                    </div>
                    <div className="px-2 py-1 bg-green/10 border border-green/20 rounded text-[9px] text-green font-bold uppercase">Sustainable</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="bg-bg/40 border border-border/40 p-4 rounded-lg flex flex-col gap-1">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-tighter">Daily Carbon Impact</span>
                      <div className="text-2xl font-mono font-bold text-white">{sustainabilityData.co2Today.toFixed(1)}<span className="text-[10px] text-text-muted ml-1 font-sans uppercase">gCO₂e</span></div>
                    </div>
                    <div className="bg-bg/40 border border-border/40 p-4 rounded-lg flex flex-col gap-1">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-tighter">Energy Efficiency</span>
                      <div className="text-2xl font-mono font-bold text-green">{sustainabilityData.efficiency}%</div>
                    </div>
                  </div>

                  <div className="relative z-10 mt-auto pt-6 border-t border-border/20">
                    <div className="flex items-center justify-between text-[10px] text-text-muted italic mb-4">
                      <span>Telemetry source: Real-time instance footprint</span>
                      <span>Active load: {sustainabilityData.watts}W</span>
                    </div>
                    <div className="w-full bg-bg h-1.5 rounded-full overflow-hidden">
                      <div className="bg-green h-full" style={{ width: `${sustainabilityData.efficiency}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 bg-surface border border-border rounded-xl p-6 shadow-2xl flex flex-col relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2 text-purple-400 mb-1">
                        <RadarIcon size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Unified Risk Surface</span>
                      </div>
                      <h3 className="text-xl font-bold">Heuristic Assessment</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-mono font-bold text-purple-400">82.4</div>
                      <div className="text-[9px] text-text-muted uppercase font-bold tracking-widest">Global Stability Score</div>
                    </div>
                  </div>

                  <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={riskRadarData}>
                        <PolarGrid stroke="#30363d" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#8b949e', fontSize: 9 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name="SystemA"
                          dataKey="A"
                          stroke="#a855f7"
                          fill="#a855f7"
                          fillOpacity={0.5}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="col-span-1 bg-[#0d1117] border border-border rounded-xl shadow-2xl flex flex-col font-mono text-[10px] overflow-hidden">
                  <div className="bg-[#161b22] px-4 py-2 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green animate-pulse"></div>
                      <span className="text-white font-bold text-[9px] tracking-widest">LIVE OPS COMMAND STREAM</span>
                    </div>
                    <div className="flex gap-4 text-text-muted text-[8px] uppercase">
                      <span>CH: ENCRYPTED</span>
                      <span>LATENCY: 12ms</span>
                    </div>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto overflow-hidden custom-scrollbar bg-black/40">
                    {opsLogs.length === 0 ? (
                      <div className="text-text-muted italic opacity-50 flex items-center gap-2">
                        <span className="text-blue">{'>'}</span> System telemetry stream initializing...
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {opsLogs.map(log => (
                          <div key={log.id} className="flex gap-3 items-start animate-in fade-in slide-in-from-left-2 duration-300">
                             <span className="text-text-muted shrink-0 text-[8px] mt-0.5">{format(log.timestamp, 'HH:mm:ss.SSS')}</span>
                             <span className="text-blue shrink-0">{'>'}</span>
                             <span className={log.text.includes('ALERT') ? 'text-red-400 font-bold' : log.text.includes('NET') ? 'text-blue-400' : 'text-text-muted italic'}>
                               {log.text}
                             </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-[#161b22] px-4 py-1 border-t border-border flex items-center justify-between text-[8px] text-text-muted italic">
                    <span>CAPPED AT 50 ENTRIES</span>
                    <span>BUFFER 100% HEALTH</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'cost' ? (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="col-span-1 xl:col-span-2 bg-surface border border-border rounded-xl p-6 h-[400px] flex flex-col shadow-2xl relative">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-lg font-bold">Account Daily Expenditure</h2>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="px-2 py-0.5 rounded bg-blue/10 border border-blue/30 text-blue text-[9px] font-bold uppercase tracking-widest">
                          Last 24 Hours
                        </span>
                        <span className="text-[9px] text-text-muted font-mono">{userTimezone}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green font-mono">
                        ${serviceBreakdown.reduce((sum, s) => sum + s.value, 0).toFixed(2)}
                      </div>
                      <p className="text-[9px] text-text-muted uppercase font-bold tracking-widest">Selected Period Total</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 w-full min-h-0 bg-bg/20 rounded-lg p-4 border border-border/20">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={costChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#30363d" strokeOpacity={0.2} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 9, fill: '#8b949e' }} 
                          axisLine={false} 
                          tickLine={false} 
                          tickFormatter={(val) => format(new Date(val), 'MMM dd')}
                        />
                        <YAxis tick={{ fontSize: 9, fill: '#8b949e' }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                        <Tooltip 
                          cursor={{ stroke: '#30363d', strokeWidth: 1 }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-[#161b22] border border-[#30363d] p-3 text-[10px] font-mono rounded shadow-2xl min-w-[180px]">
                                  <p className="text-blue font-bold border-b border-border pb-1 mb-2">DATE: {label}</p>
                                  <div className="space-y-1">
                                    {payload.map((entry: any, i: number) => (
                                      <div key={i} className="flex justify-between items-center gap-4">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                          <span className="opacity-70">{entry.name}</span>
                                        </div>
                                        <span className="font-bold text-white">${Number(entry.value).toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 pt-1 border-t border-border flex justify-between font-bold text-green">
                                    <span>TOTAL</span>
                                    <span>${payload.reduce((sum: number, entry: any) => sum + Number(entry.value), 0).toFixed(2)}</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          align="right" 
                          iconType="circle"
                          content={({ payload }) => (
                            <div className="flex flex-wrap justify-end gap-3 mb-2">
                              {payload?.map((entry: any, index: number) => (
                                <div key={index} className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                  <span className="text-[8px] text-text-muted font-bold uppercase tracking-tighter">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        />
                        {uniqueServices.map((service, i) => (
                          <Line 
                            key={service}
                            type="monotone"
                            dataKey={service}
                            stroke={COLORS[i % COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 2, fill: COLORS[i % COLORS.length] }}
                            activeDot={{ r: 4 }}
                            isAnimationActive={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="bg-surface border border-border rounded-xl p-6 shadow-2xl flex-1 flex flex-col relative overflow-hidden backdrop-blur-md">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue/5 blur-[60px] rounded-full -mr-16 -mt-16"></div>
                    <div className="flex items-center justify-between mb-6 relative z-10">
                      <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-text-muted tracking-[0.3em] uppercase">Intelligence Engine</div>
                        <h3 className="text-sm font-black text-white tracking-tight">FORECASTING & IMPACT</h3>
                      </div>
                      <div className="bg-blue/10 border border-blue/20 text-blue px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase">
                        Real-time AI Enabled
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
                      <div className="bg-bg/40 p-4 rounded-xl border border-border/40 backdrop-blur-sm">
                        <span className="text-[8px] text-text-muted uppercase font-bold tracking-widest">Daily Expenditure</span>
                        <div className="text-xl font-mono font-bold mt-1 tracking-tighter">${preciseRecommendations.dailyCost.toFixed(2)}</div>
                        <div className="text-[8px] text-text-muted mt-1 font-mono">~${preciseRecommendations.monthlyCost.toFixed(0)}/mo (×30)</div>
                      </div>
                      <div className="bg-green/5 p-4 rounded-xl border border-green/20 backdrop-blur-sm group hover:bg-green/10 transition-all">
                        <span className="text-[8px] text-green uppercase font-bold tracking-widest">Optimized Target</span>
                        <div className="text-xl font-mono font-bold text-green mt-1 tracking-tighter">${preciseRecommendations.forecastedCost.toFixed(2)}/day</div>
                        <div className="text-[8px] text-green/70 mt-1 font-mono">~${((preciseRecommendations.dailyCost - preciseRecommendations.potentialSavings) * 30).toFixed(0)}/mo projected</div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 relative z-10 h-full">
                      <div className="flex justify-between items-end px-1">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Projected Monthly Savings</span>
                          <span className="text-[9px] text-text-muted italic">
                            {preciseRecommendations.savingsPercentage}% of spend · {preciseRecommendations.list.filter(r => r.savings > 0).length} optimisations applied
                          </span>
                        </div>
                        <span className="text-2xl font-bold font-mono text-green tracking-tighter drop-shadow-sm">
                          -${preciseRecommendations.monthlySavings.toFixed(2)}/mo
                        </span>
                      </div>
                      <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-green h-full shadow-[0_0_10px_rgba(59,185,80,0.4)]" 
                          style={{ width: `${Math.min(Number(preciseRecommendations.savingsPercentage), 100)}%` }}
                        ></div>
                      </div>
                      
                      <div className="mt-2 space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1">
                        <div className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2 opacity-60">Technical Optimisation Stack — {preciseRecommendations.list.length} recommendations</div>
                        {preciseRecommendations.list.map((rec, i) => (
                          <div key={i} className="p-4 bg-bg/40 border border-border/30 rounded-xl hover:border-blue/40 transition-all group/item hover:bg-bg/60">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[11px] font-black text-white group-hover/item:text-blue transition-colors flex items-center gap-2">
                                <Zap size={10} className="text-blue" />
                                {rec.title}
                              </span>
                              <span className={cn(
                                "text-[7px] px-2 py-0.5 rounded-full uppercase font-black border tracking-widest whitespace-nowrap",
                                rec.type === 'reliability' ? "bg-red-900/20 border-red-900/40 text-red-400" :
                                rec.type === 'performance' ? "bg-blue-900/20 border-blue-900/40 text-blue-400" : 
                                "bg-green-900/20 border-green-900/40 text-green-400"
                              )}>
                                {rec.impact}
                              </span>
                            </div>
                            <p className="text-[10px] text-text-muted font-medium leading-relaxed opacity-90">{rec.desc}</p>
                            {rec.formula && (
                              <div className="mt-2 px-2 py-1.5 bg-black/30 rounded border border-border/20">
                                <span className="text-[9px] font-mono text-blue/80 tracking-tight">Σ {rec.formula}</span>
                              </div>
                            )}
                            {rec.savings > 0 && (
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <TrendingDown size={11} className="text-green" />
                                  <span className="text-[9px] font-black text-green tracking-widest uppercase">${rec.savings.toFixed(2)}/day</span>
                                </div>
                                <span className="text-[9px] font-bold text-green/70 font-mono">${(rec.savings * 30).toFixed(2)}/mo</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface border border-border rounded-xl p-5 shadow-lg flex-1 flex flex-col">
                    <div className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-4">Service Breakdown</div>
                    <div className="flex-1 w-full min-h-0 flex flex-col items-center justify-center">
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={serviceBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                            isAnimationActive={false}
                          >
                            {serviceBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-[#161b22] border border-[#30363d] p-2 text-[10px] font-mono rounded shadow-2xl">
                                    <p className="font-bold text-white">{payload[0].name}</p>
                                    <p className="text-green mt-1">${Number(payload[0].value).toFixed(2)}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="w-full mt-4 space-y-1.5 overflow-y-auto max-h-[100px] no-scrollbar pr-2">
                        {serviceBreakdown.slice(0, 5).map((s, i) => (
                          <div key={i} className="flex flex-col gap-1">
                            <div className="flex justify-between text-[9px] font-bold">
                              <span className="flex items-center gap-1.5 truncate">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                {s.name}
                              </span>
                              <span>${s.value.toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-border h-0.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full" 
                                style={{ 
                                  backgroundColor: COLORS[i % COLORS.length],
                                  width: `${(s.value / serviceBreakdown.reduce((sum, item) => sum + item.value, 0)) * 100}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Total Row */}
                        <div className="flex justify-between text-[10px] font-bold text-green pt-3 border-t border-border mt-2">
                          <span className="tracking-widest uppercase">Total Breakdown</span>
                          <span>${serviceBreakdown.reduce((sum, s) => sum + s.value, 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl p-8 shadow-2xl flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 bg-blue/10 rounded-full flex items-center justify-center text-blue mb-6">
                <Settings size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Global Settings</h2>
              <p className="text-text-muted text-[13px] text-center max-w-md mb-8">
                Configure your AWS connectivity overrides here. These settings will persist in your browser across sessions.
              </p>
              
                <div className="w-full max-w-lg grid grid-cols-1 gap-6">
                  {/* Timezone selector — set BEFORE syncing credentials */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                      <Globe size={11} />
                      Timezone <span className="text-[9px] text-blue normal-case font-normal tracking-normal">(select before syncing credentials)</span>
                    </label>
                    <select
                      value={userTimezone}
                      onChange={e => setUserTimezone(e.target.value)}
                      className="w-full bg-bg border border-border rounded p-2 text-xs font-mono focus:border-blue outline-none transition-colors cursor-pointer"
                    >
                      {[
                        'UTC',
                        'America/New_York',
                        'America/Chicago',
                        'America/Denver',
                        'America/Los_Angeles',
                        'America/Sao_Paulo',
                        'Europe/London',
                        'Europe/Paris',
                        'Europe/Berlin',
                        'Europe/Moscow',
                        'Asia/Dubai',
                        'Asia/Kolkata',
                        'Asia/Dhaka',
                        'Asia/Bangkok',
                        'Asia/Singapore',
                        'Asia/Shanghai',
                        'Asia/Tokyo',
                        'Asia/Seoul',
                        'Australia/Sydney',
                        'Pacific/Auckland',
                      ].map(tz => (
                        <option key={tz} value={tz} className="bg-surface text-text">{tz}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest">SNS Topic ARN</label>
                    <input 
                      type="text" 
                      value={awsConfig.snsTopic || ''} 
                      onChange={e => setAwsConfig({...awsConfig, snsTopic: e.target.value})}
                      placeholder="arn:aws:sns:..."
                      className="w-full bg-bg border border-border rounded p-2 text-xs font-mono focus:border-blue outline-none transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Slack Webhook URL</label>
                    <input 
                      type="text" 
                      value={awsConfig.slackWebhook || ''} 
                      onChange={e => setAwsConfig({...awsConfig, slackWebhook: e.target.value})}
                      placeholder="https://hooks.slack.com/ services/..."
                      className="w-full bg-bg border border-border rounded p-2 text-xs font-mono focus:border-blue outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest">AWS Access Key</label>
                    <input 
                      type="password" 
                      value={awsConfig.key || ''} 
                      onChange={e => setAwsConfig({...awsConfig, key: e.target.value})}
                      className="w-full bg-bg border border-border rounded p-2 text-xs font-mono focus:border-blue outline-none transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest">AWS Secret Key</label>
                    <input 
                      type="password" 
                      value={awsConfig.secret || ''} 
                      onChange={e => setAwsConfig({...awsConfig, secret: e.target.value})}
                      className="w-full bg-bg border border-border rounded p-2 text-xs font-mono focus:border-blue outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleTestConnection}
                disabled={saveStatus === 'testing'}
                className={cn(
                  "mt-10 px-8 py-2.5 text-black font-bold text-[12px] rounded hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2 min-w-[220px]",
                  saveStatus === 'success' ? "bg-green shadow-green/20" : 
                  saveStatus === 'error' ? "bg-[#f85149] shadow-[#f85149]/20" : 
                  "bg-blue shadow-blue/20"
                )}
              >
                {saveStatus === 'testing' ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    TESTING...
                  </>
                ) : saveStatus === 'success' ? (
                  <>
                    <Activity size={14} />
                    CONNECTION SUCCESS
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <AlertCircle size={14} />
                    CONNECTION FAILED
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    TEST & SAVE CONNECTION
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Mini Footer Stats */}
      <footer className="h-[24px] bg-bg border-t border-border flex items-center justify-between px-4 shrink-0 overflow-hidden z-20">
        <div className="flex gap-4 text-[9px] font-mono text-text-muted uppercase tracking-widest leading-none">
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse"></div> 
            SYNC OK
          </span>
          <span>RAILKEY PROD</span>
          <span>SYNC: {refreshInterval}s</span>
        </div>
        <div className="text-[9px] font-mono text-text-muted uppercase tracking-widest leading-none flex gap-4">
          <span>DRAG ON CHART TO ZOOM</span>
          <span className="opacity-40">v1.1.0-STABLE</span>
        </div>
      </footer>

      {/* Toast Notifications */}
      <div className="fixed top-24 right-6 z-[110] flex flex-col gap-3 pointer-events-none">
        {notifications.map(n => (
          <div 
            key={n.id} 
            className={cn(
              "px-6 py-4 rounded-xl border shadow-2xl backdrop-blur-md animate-in slide-in-from-right-full duration-300 pointer-events-auto flex items-center gap-3 min-w-[300px]",
              n.type === 'error' ? "bg-[#f85149]/20 border-[#f85149]/40 text-[#f85149]" : "bg-green/20 border-green/40 text-green"
            )}
          >
            {n.type === 'error' ? <AlertCircle size={20} /> : <Zap size={20} />}
            <span className="text-sm font-bold tracking-tight">{n.message}</span>
          </div>
        ))}
      </div>

      {/* Confirmation Modal for Alerts */}
      {pendingAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-3 text-yellow mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow/10 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Confirm Notification</h2>
            </div>
            <p className="text-text-muted text-sm leading-relaxed mb-6">
              Metric <span className="text-white font-bold">{pendingAlert.metric.title}</span> has exceeded the threshold of 
              <span className="text-white font-bold ml-1">{pendingAlert.metric.alarmThreshold}</span>. 
              Do you want to send an <span className="text-blue font-bold">Email/SNS alert</span> now?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={handleAlertCancel}
                className="flex-1 bg-surface border border-border hover:bg-border/30 text-white font-bold py-3 rounded-xl transition-all"
              >
                IGNORE
              </button>
              <button 
                onClick={handleAlertConfirm}
                className="flex-[2] bg-blue hover:bg-blue/80 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue/20 transition-all flex items-center justify-center gap-2"
              >
                <Zap size={16} /> SEND NOTIFICATION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EnhancedMetricCard({ metric, data, comparisonData = [], isLoading, fullWidth, globalTimeframe, onGlobalTimeframeChange }: any) {
  const [zoomRef, setZoomRef] = useState<{ left: string | number, right: string | number } | null>(null);
  const [refAreaLeft, setRefAreaLeft] = useState<string | number>('');
  const [refAreaRight, setRefAreaRight] = useState<string | number>('');
  const [domain, setDomain] = useState<any[]>(['auto', 'auto']);

  const zoom = () => {
    let left = refAreaLeft;
    let right = refAreaRight;
    if (left === right || right === '') {
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }
    if (Number(left) > Number(right)) [left, right] = [right, left];
    setDomain([left, right]);
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  const zoomOut = () => {
    setDomain(['auto', 'auto']);
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  const lastValue = data.length > 0 ? data[data.length - 1].value : 0;
  const isAlarming = metric.alarmThreshold !== undefined && lastValue > metric.alarmThreshold;

  // Align comparison data to current timestamps for display
  const combinedData = useMemo(() => {
    return data.map((d: any, i: number) => ({
      ...d,
      compValue: comparisonData[i]?.value
    }));
  }, [data, comparisonData]);

  // Format timeframe display
  const timeframeLabel = globalTimeframe === 1 ? 'REAL-TIME' : globalTimeframe < 24 ? `${globalTimeframe}H` : `${globalTimeframe / 24}D`;

  return (
    <div 
      className={cn(
        "bg-surface border rounded-xl p-5 flex flex-col h-[400px] shadow-lg hover:border-border/60 transition-colors relative",
        isAlarming ? "border-[#f85149] shadow-[0_0_20px_rgba(248,81,73,0.1)] ring-1 ring-[#f85149]/30" : "border-border",
        fullWidth && "col-span-1 lg:col-span-2"
      )}
    >
      {isAlarming && (
        <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 bg-[#f85149] text-white text-[8px] font-black px-2 py-0.5 rounded shadow-lg animate-bounce z-10 flex items-center gap-1">
          <Zap size={10} fill="currentColor" /> CRITICAL BREACH
        </div>
      )}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 truncate mr-4">
          <div className="flex items-center gap-2 text-[10px] uppercase text-text-muted font-bold tracking-widest opacity-60">
            {metric.namespace} / <span className="text-white">{metric.metricName}</span>
            {metric.alarmThreshold !== undefined && (
              <div className="flex items-center gap-1 text-[9px] bg-bg px-1.5 py-0.5 rounded border border-border">
                <AlertCircle size={8} /> THR: {metric.alarmThreshold}
              </div>
            )}
          </div>
          <h3 className="text-lg font-bold mt-1 tracking-tight truncate">{metric.title}</h3>
        </div>
        <div className="flex flex-col items-end shrink-0 gap-2">
          <div className="flex bg-bg/50 border border-border rounded-lg p-0.5">
            <button 
              onClick={() => onGlobalTimeframeChange?.(1)}
              className={cn(
                "px-2 py-1 text-[9px] font-bold rounded transition-all",
                globalTimeframe === 1 ? "bg-blue text-white shadow-lg shadow-blue/20" : "text-text-muted hover:text-white"
              )}
            >
              REAL-TIME
            </button>
            <button 
              onClick={() => onGlobalTimeframeChange?.(6)}
              className={cn(
                "px-2 py-1 text-[9px] font-bold rounded transition-all",
                globalTimeframe === 6 ? "bg-blue text-white shadow-lg shadow-blue/20" : "text-text-muted hover:text-white"
              )}
            >
              6H
            </button>
            <button 
              onClick={() => onGlobalTimeframeChange?.(12)}
              className={cn(
                "px-2 py-1 text-[9px] font-bold rounded transition-all",
                globalTimeframe === 12 ? "bg-blue text-white shadow-lg shadow-blue/20" : "text-text-muted hover:text-white"
              )}
            >
              12H
            </button>
            <button 
              onClick={() => onGlobalTimeframeChange?.(24)}
              className={cn(
                "px-2 py-1 text-[9px] font-bold rounded transition-all",
                globalTimeframe === 24 ? "bg-blue text-white shadow-lg shadow-blue/20" : "text-text-muted hover:text-white"
              )}
            >
              24H
            </button>
          </div>
          <div className="text-right">
            <div className={cn("text-2xl font-bold font-mono tracking-tighter", isAlarming ? "text-[#f85149]" : "text-green")}>
              {isLoading && data.length === 0 ? '--' : formatValue(lastValue, metric.unit)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0 bg-bg p-4 rounded-lg border border-border/10 relative overflow-hidden group">
        {/* Timeframe Indicator */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
          <div className="px-2 py-1 bg-blue/10 border border-blue/30 rounded text-[9px] font-bold text-blue flex items-center gap-1">
            <Clock size={10} />
            {timeframeLabel}
          </div>
        </div>
        <div className="absolute top-2 right-2 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          {domain[0] !== 'auto' && (
            <button 
              onClick={zoomOut}
              className="p-1.5 bg-surface border border-border rounded text-text hover:text-white transition-colors flex items-center gap-1.5 text-[9px] font-bold"
            >
              <Minimize2 size={12} /> RESET
            </button>
          )}
          <div className="p-1.5 bg-surface border border-border rounded text-text-muted text-[9px] font-bold flex items-center gap-1.5">
            <Maximize2 size={12} /> DRAG TO ZOOM
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={combinedData}
            onMouseDown={(e) => e && setRefAreaLeft(e.activeLabel || '')}
            onMouseMove={(e) => refAreaLeft && setRefAreaRight(e && e.activeLabel || '')}
            onMouseUp={zoom}
          >
            <defs>
              <linearGradient id={`grad-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metric.color} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={metric.color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#30363d" strokeOpacity={0.2} />
            <XAxis 
              dataKey="timestamp" 
              hide 
              domain={domain} 
              type="number"
            />
            <YAxis 
              hide 
              domain={['auto', 'auto']}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[#161b22] border border-[#30363d] p-3 text-[10px] font-mono rounded shadow-2xl min-w-[140px]">
                      <p className="text-text-muted border-b border-border pb-1 mb-2">{format(payload[0].payload.timestamp, 'MMM dd HH:mm:ss')}</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center gap-4">
                          <span className="opacity-70">CURRENT:</span>
                          <span className="font-bold text-white">{formatValue(payload[0].value, metric.unit)}</span>
                        </div>
                        {payload[1] && (
                          <div className="flex justify-between items-center gap-4 text-text-muted">
                            <span className="opacity-70 text-[9px]">PAST:</span>
                            <span className="font-bold">{formatValue(payload[1].value, metric.unit)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="compValue" 
              stroke="#8b949e" 
              strokeWidth={1}
              strokeDasharray="5 5"
              fill="transparent"
              isAnimationActive={false}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={metric.color} 
              strokeWidth={2}
              fillOpacity={1} 
              fill={`url(#grad-${metric.id})`}
              isAnimationActive={false}
            />
            {refAreaLeft && refAreaRight && (
              <ReferenceArea x1={refAreaLeft} x2={refAreaRight} {...({ fill: "#58a6ff", fillOpacity: 0.15 } as any)} />
            )}
            {metric.alarmThreshold !== undefined && (
              <ReferenceLine y={metric.alarmThreshold} stroke="#f85149" strokeDasharray="3 3" label={{ position: 'right', value: 'THR', fill: '#f85149', fontSize: 8 }} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex justify-between items-center text-[9px] font-mono text-text-muted uppercase tracking-[0.2em]">
        <div className="flex items-center gap-4">
          <span>PERIOD: {metric.timeframe || 12}H</span>
          <span>STAT: AVG</span>
          {comparisonData.length > 0 && <span className="text-blue font-bold tracking-tighter">COMPARISON ACTIVE</span>}
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <RefreshCw size={10} className="animate-spin" />}
          {data.length > 0 && <span>T: {format(data[data.length-1].timestamp, 'HH:mm:ss')}</span>}
        </div>
      </div>
    </div>
  );
}

const MetricCard: React.FC<{
  metric: MetricConfig;
  data: any[];
  isLoading: boolean;
  onRemove: () => void;
}> = ({ metric, data, isLoading, onRemove }) => {
  return null;
}
