export type PodStatus = 
  | 'Running' 
  | 'Pending' 
  | 'CrashLoopBackOff' 
  | 'OOMKilled' 
  | 'Terminating' 
  | 'Evicted';

export type NodeStatus = 'Ready' | 'NotReady' | 'Pressure';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertType = 
  | 'OOMKilled' 
  | 'CrashLoopBackOff' 
  | 'CpuThrottling' 
  | 'NodePressure' 
  | 'SlaBreach' 
  | 'CostWaste' 
  | 'DnsFailure';

export type QoSClass = 'Guaranteed' | 'Burstable' | 'BestEffort';

export interface Pod {
  id: string;
  name: string;
  namespace: string;
  deploymentName: string;
  nodeId: string;
  status: PodStatus;
  restarts: number;
  cpuRequest: number; // in millicores, e.g. 200m
  cpuLimit: number; // in millicores, e.g. 500m
  cpuUsage: number; // current millicores
  memRequest: number; // in MiB, e.g. 256
  memLimit: number; // in MiB, e.g. 512
  memUsage: number; // current MiB
  qosClass: QoSClass;
  ageSeconds: number;
  ip: string;
  ports: number[];
  logs: string[];
  livenessProbe: {
    path: string;
    port: number;
    periodSeconds: number;
    healthy: boolean;
    failCount: number;
  };
  hasMemoryLeak?: boolean;
}

export interface Node {
  id: string;
  name: string;
  role: 'control-plane' | 'worker';
  zone: string;
  cpuCores: number; // total millicores, e.g. 4000 (4 cores)
  memoryMb: number; // total MiB, e.g. 8192 (8 GiB)
  cpuUsage: number; // current millicores
  memUsage: number; // current MiB
  status: NodeStatus;
  conditions: {
    diskPressure: boolean;
    memoryPressure: boolean;
    pidPressure: boolean;
  };
  cordoned: boolean;
}

export interface Deployment {
  id: string;
  name: string;
  namespace: string;
  image: string;
  replicas: number;
  desiredReplicas: number;
  availableReplicas: number;
  cpuRequest: number;
  cpuLimit: number;
  memRequest: number;
  memLimit: number;
  hpaEnabled: boolean;
  minReplicas: number;
  maxReplicas: number;
  targetCpuPercent: number;
  version: string;
  selector: Record<string, string>;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  targetResource: string;
  timestamp: number;
  resolved: boolean;
  suggestedAction: string;
  autoFixCommand: string;
}

export interface ChaosScenario {
  id: string;
  title: string;
  category: 'Memory' | 'Traffic' | 'Compute' | 'Config' | 'Resilience' | 'FinOps';
  difficulty: 'Cadet' | 'Operator' | 'Commander';
  description: string;
  objective: string;
  hint: string;
  xpReward: number;
  timeLimitSec: number;
  isUnlocked: boolean;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'Troubleshooting' | 'Autoscaling' | 'FinOps' | 'Resilience' | 'Mastery';
  unlocked: boolean;
  unlockedAt?: number;
}

export interface SquadRank {
  rank: number;
  name: string;
  avatar: string;
  score: number;
  mttr: string; // Mean time to recovery
  efficiency: number; // Rightsizing %
  badgesCount: number;
  isUser: boolean;
}

export interface ClusterMetrics {
  healthScore: number; // 0 - 100
  sloPercent: number; // 99.99%
  costPerHour: number; // USD
  efficiencyPercent: number; // allocated vs utilized
  totalRps: number;
  errorRatePercent: number;
  activeAlertsCount: number;
  uptimeSeconds: number;
}

export interface UserProgress {
  level: number;
  xp: number;
  nextLevelXp: number;
  title: string;
  resolvedIncidentsCount: number;
  scenariosCompleted: string[];
}
