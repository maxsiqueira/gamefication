import React from 'react';
import { 
  Box, 
  X, 
  RefreshCw, 
  Cpu, 
  HardDrive, 
  Terminal, 
  FileCode, 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  Plus, 
  Trash2,
  Check
} from 'lucide-react';
import { Pod, Deployment } from '../types/kubernetes';
import { sounds } from '../utils/audio';

interface PodInspectorModalProps {
  pod: Pod | null;
  deployment?: Deployment;
  onClose: () => void;
  onRestartPod: (podId: string) => void;
  onPatchMemoryLimit: (podId: string, newLimitMi: number) => void;
  onScaleDeployment: (deploymentName: string, delta: number) => void;
  onDeletePod: (podId: string) => void;
}

export const PodInspectorModal: React.FC<PodInspectorModalProps> = ({
  pod,
  deployment,
  onClose,
  onRestartPod,
  onPatchMemoryLimit,
  onScaleDeployment,
  onDeletePod,
}) => {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'logs' | 'yaml'>('overview');

  if (!pod) return null;

  const isOOM = pod.status === 'OOMKilled';
  const isCrashLoop = pod.status === 'CrashLoopBackOff';
  const isRunning = pod.status === 'Running';

  const memPercent = Math.min(100, Math.round((pod.memUsage / pod.memLimit) * 100));
  const cpuPercent = Math.min(100, Math.round((pod.cpuUsage / pod.cpuLimit) * 100));

  const yamlManifest = `apiVersion: v1
kind: Pod
metadata:
  name: ${pod.name}
  namespace: ${pod.namespace}
  labels:
    app: ${pod.deploymentName}
    tier: backend
spec:
  containers:
  - name: ${pod.deploymentName}
    image: docker.io/apps/${pod.deploymentName}:v1.3.0
    ports:
    - containerPort: ${pod.ports[0] || 80}
    resources:
      requests:
        cpu: ${pod.cpuRequest}m
        memory: ${pod.memRequest}Mi
      limits:
        cpu: ${pod.cpuLimit}m
        memory: ${pod.memLimit}Mi
    livenessProbe:
      httpGet:
        path: ${pod.livenessProbe.path}
        port: ${pod.livenessProbe.port}
      initialDelaySeconds: 5
      periodSeconds: ${pod.livenessProbe.periodSeconds}
status:
  phase: ${pod.status}
  podIP: ${pod.ip}
  qosClass: ${pod.qosClass}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="w-full max-w-2xl bg-[#090d16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${
              isOOM 
                ? 'bg-red-950/80 border-red-700 text-red-400' 
                : isCrashLoop 
                ? 'bg-amber-950/80 border-amber-700 text-amber-400' 
                : 'bg-blue-950/80 border-blue-800 text-blue-400'
            }`}>
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white font-mono">{pod.name}</h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  isRunning
                    ? 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                    : isOOM
                    ? 'bg-red-900 text-white animate-pulse'
                    : 'bg-amber-900 text-amber-200'
                }`}>
                  {pod.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Namespace: {pod.namespace} · Node: {pod.nodeId} · IP: {pod.ip}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center gap-2">
          <button
            onClick={() => {
              sounds.playBlip(500);
              setActiveTab('overview');
            }}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview & Telemetry
          </button>
          <button
            onClick={() => {
              sounds.playBlip(500);
              setActiveTab('logs');
            }}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
              activeTab === 'logs'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Logs ({pod.logs.length})
          </button>
          <button
            onClick={() => {
              sounds.playBlip(500);
              setActiveTab('yaml');
            }}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
              activeTab === 'yaml'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Manifest YAML
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* OOM Warning Alert banner if crashing */}
              {isOOM && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-700/80 flex items-start gap-3 text-xs text-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-red-100">
                      Container Terminated: OOMKilled (Exit Code 137)
                    </strong>
                    The container process allocated {pod.memUsage}MiB, surpassing its memory limit of {pod.memLimit}MiB.
                    Linux cgroups terminated the process to protect the host node.
                  </div>
                </div>
              )}

              {/* Resource Consumption Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* CPU card */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-blue-400" />
                      <span>CPU Utilization</span>
                    </span>
                    <span className="text-slate-200 font-bold tabular-nums">
                      {cpuPercent}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div 
                      className={`h-full ${cpuPercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${cpuPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Usage: {pod.cpuUsage}m</span>
                    <span>Limit: {pod.cpuLimit}m</span>
                  </div>
                </div>

                {/* Memory card */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                    <span className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                      <span>RAM Utilization</span>
                    </span>
                    <span className={`font-bold tabular-nums ${memPercent > 90 ? 'text-red-400' : 'text-slate-200'}`}>
                      {memPercent}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div 
                      className={`h-full ${memPercent > 90 ? 'bg-red-500' : 'bg-purple-500'}`}
                      style={{ width: `${memPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Usage: {pod.memUsage}Mi</span>
                    <span>Limit: {pod.memLimit}Mi</span>
                  </div>
                </div>
              </div>

              {/* Liveness Probe Specification */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Liveness & Health Probe</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                    pod.livenessProbe.healthy 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                      : 'bg-red-950 text-red-400 border border-red-800'
                  }`}>
                    {pod.livenessProbe.healthy ? 'PROBE HEALTHY' : 'PROBE FAILING'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-300">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px]">HTTP Endpoint</span>
                    {pod.livenessProbe.path}
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px]">Port</span>
                    :{pod.livenessProbe.port}
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px]">Period</span>
                    {pod.livenessProbe.periodSeconds}s interval
                  </div>
                </div>
              </div>

              {/* Spec Metadata */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Parent Deployment:</span>
                  <span className="text-slate-200">{pod.deploymentName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quality of Service (QoS):</span>
                  <span className="text-blue-400">{pod.qosClass}</span>
                </div>
                <div className="flex justify-between">
                  <span>Restarts:</span>
                  <span className="text-amber-400">{pod.restarts} times</span>
                </div>
                <div className="flex justify-between">
                  <span>Age:</span>
                  <span className="text-slate-200">{Math.floor(pod.ageSeconds / 60)} minutes</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-black/60 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1 max-h-[300px] overflow-y-auto">
              {pod.logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-slate-600 mr-2 select-none">[{idx + 1}]</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'yaml' && (
            <pre className="p-3.5 rounded-xl bg-black/60 border border-slate-800 font-mono text-xs text-blue-300 overflow-x-auto">
              {yamlManifest}
            </pre>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              sounds.playPodDelete();
              onDeletePod(pod.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Pod</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playSuccess();
                onPatchMemoryLimit(pod.id, pod.memLimit + 256);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Patch RAM (+256Mi)</span>
            </button>

            <button
              onClick={() => {
                sounds.playPodDeploy();
                onRestartPod(pod.id);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restart Container</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
