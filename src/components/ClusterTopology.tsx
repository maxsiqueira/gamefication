import React from 'react';
import { 
  Server, 
  Box, 
  Cpu, 
  HardDrive, 
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  Layers, 
  Radio, 
  Plus, 
  Flame,
  ArrowRight
} from 'lucide-react';
import { Node, Pod, Deployment } from '../types/kubernetes';
import { sounds } from '../utils/audio';

interface ClusterTopologyProps {
  nodes: Node[];
  pods: Pod[];
  deployments: Deployment[];
  selectedNamespace: string;
  onSelectNamespace: (ns: string) => void;
  onSelectPod: (pod: Pod) => void;
  onSelectNode: (node: Node) => void;
  onOpenDeployModal: () => void;
  onOpenChaosModal: () => void;
  onRestartPod: (podId: string) => void;
}

export const ClusterTopology: React.FC<ClusterTopologyProps> = ({
  nodes,
  pods,
  deployments,
  selectedNamespace,
  onSelectNamespace,
  onSelectPod,
  onSelectNode,
  onOpenDeployModal,
  onOpenChaosModal,
  onRestartPod,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredPods = React.useMemo(() => {
    return pods.filter(pod => {
      const matchesNs = selectedNamespace === 'all' || pod.namespace === selectedNamespace;
      const matchesSearch = pod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            pod.deploymentName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesNs && matchesSearch;
    });
  }, [pods, selectedNamespace, searchQuery]);

  const namespaces = ['all', 'production', 'analytics'];

  return (
    <div className="w-full flex flex-col gap-6 select-none">
      {/* Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Namespace:</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800/80">
            {namespaces.map(ns => (
              <button
                key={ns}
                onClick={() => {
                  sounds.playBlip(550);
                  onSelectNamespace(ns);
                }}
                className={`px-2.5 py-1 text-xs font-mono uppercase tracking-wide rounded transition-colors ${
                  selectedNamespace === ns
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {ns}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search pods..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3 py-1 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-36 sm:w-48 font-mono"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sounds.playBlip(600);
              onOpenChaosModal();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 text-red-300 hover:text-red-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>Failure Simulator</span>
          </button>

          <button
            onClick={() => {
              sounds.playBlip(640);
              onOpenDeployModal();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Deploy Workload</span>
          </button>
        </div>
      </div>

      {/* Ingress & Service Mesh Data Flow Graphic */}
      <div className="bg-gradient-to-r from-blue-950/20 via-slate-900/40 to-indigo-950/20 p-4 rounded-xl border border-slate-800/80 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Ingress Traffic Pipeline & Service Mesh</span>
          </div>
          <div className="text-slate-400 font-mono text-[11px] tabular-nums">
            Cluster Ingress: <span className="text-emerald-400 font-bold">1,840 req/sec</span> · 0.02% error rate
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-mono text-xs">
                ING
              </div>
              <div>
                <div className="text-xs font-medium text-slate-200">LoadBalancer</div>
                <div className="text-[10px] font-mono text-slate-500">35.202.12.9:80</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono text-xs">
                SVC
              </div>
              <div>
                <div className="text-xs font-medium text-slate-200">frontend-edge</div>
                <div className="text-[10px] font-mono text-slate-500">2 Endpoints · OK</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono text-xs">
                SVC
              </div>
              <div>
                <div className="text-xs font-medium text-slate-200">payment-gateway</div>
                <div className="text-[10px] font-mono text-slate-500">3 Endpoints · OK</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono text-xs">
                SVC
              </div>
              <div>
                <div className="text-xs font-medium text-slate-200">cart-redis</div>
                <div className="text-[10px] font-mono text-slate-500">TCP 6379 · Cache</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">NOMINAL</span>
          </div>
        </div>
      </div>

      {/* Cluster Nodes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {nodes.filter(n => n.role === 'worker').map(node => {
          const nodePods = filteredPods.filter(p => p.nodeId === node.id);
          const cpuPercent = Math.min(100, Math.round((node.cpuUsage / node.cpuCores) * 100));
          const memPercent = Math.min(100, Math.round((node.memUsage / node.memoryMb) * 100));

          const hasAlert = node.status !== 'Ready' || nodePods.some(p => p.status === 'CrashLoopBackOff' || p.status === 'OOMKilled');

          return (
            <div
              key={node.id}
              className={`bg-slate-900/80 rounded-xl border transition-all flex flex-col justify-between overflow-hidden ${
                node.status === 'NotReady'
                  ? 'border-red-600/70 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                  : hasAlert
                  ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Node Header */}
              <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Server className={`w-4 h-4 ${node.status === 'Ready' ? 'text-blue-400' : 'text-red-400'}`} />
                    <button
                      onClick={() => {
                        sounds.playBlip();
                        onSelectNode(node);
                      }}
                      className="font-mono text-xs font-bold text-slate-200 hover:text-blue-400 transition-colors text-left"
                    >
                      {node.name}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {node.cordoned && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-950/80 border border-purple-800 text-purple-300">
                        Cordoned
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        node.status === 'Ready'
                          ? 'bg-emerald-950/80 border border-emerald-800/80 text-emerald-300'
                          : 'bg-red-950/80 border border-red-800/80 text-red-300'
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between mb-3">
                  <span>Zone: {node.zone}</span>
                  <span>{nodePods.length} Pods Hosted</span>
                </div>

                {/* Node Resource Gauges */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* CPU Gauge */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-blue-400" />
                        <span>CPU</span>
                      </span>
                      <span className={`tabular-nums ${cpuPercent > 85 ? 'text-red-400 font-bold' : cpuPercent > 70 ? 'text-amber-400' : 'text-slate-300'}`}>
                        {cpuPercent}% ({node.cpuUsage}m)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          cpuPercent > 85 ? 'bg-red-500' : cpuPercent > 70 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${cpuPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Memory Gauge */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-purple-400" />
                        <span>RAM</span>
                      </span>
                      <span className={`tabular-nums ${memPercent > 85 ? 'text-red-400 font-bold' : memPercent > 70 ? 'text-amber-400' : 'text-slate-300'}`}>
                        {memPercent}% ({Math.round(node.memUsage / 1024)}G)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          memPercent > 85 ? 'bg-red-500' : memPercent > 70 ? 'bg-amber-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${memPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hosted Pods Container */}
              <div className="p-3.5 flex flex-col gap-2.5 flex-1 min-h-[220px]">
                {nodePods.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-8">
                    <Box className="w-6 h-6 mb-1 text-slate-600" />
                    <span>No active pods on this node</span>
                  </div>
                ) : (
                  nodePods.map(pod => {
                    const isOOM = pod.status === 'OOMKilled';
                    const isCrashLoop = pod.status === 'CrashLoopBackOff';
                    const isRunning = pod.status === 'Running';
                    const isPending = pod.status === 'Pending';

                    const podMemPercent = Math.min(100, Math.round((pod.memUsage / pod.memLimit) * 100));

                    return (
                      <div
                        key={pod.id}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer relative group ${
                          isOOM
                            ? 'bg-red-950/50 border-red-700/80 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                            : isCrashLoop
                            ? 'bg-amber-950/40 border-amber-600/70 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                            : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                        onClick={() => {
                          sounds.playBlip(500);
                          onSelectPod(pod);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isRunning
                                  ? 'bg-emerald-500'
                                  : isOOM
                                  ? 'bg-red-500 animate-ping'
                                  : isCrashLoop
                                  ? 'bg-amber-500'
                                  : 'bg-blue-400'
                              }`}
                            />
                            <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                              {pod.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {pod.restarts > 0 && (
                              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/70 px-1 rounded">
                                {pod.restarts}x restarts
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                                isRunning
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                                  : isOOM
                                  ? 'bg-red-900 text-white font-bold animate-pulse'
                                  : isCrashLoop
                                  ? 'bg-amber-900 text-amber-200 font-bold'
                                  : 'bg-blue-950 text-blue-300'
                              }`}
                            >
                              {pod.status}
                            </span>
                          </div>
                        </div>

                        {/* Pod Telemetry metrics */}
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
                          <span className="flex items-center gap-1">
                            <span>CPU:</span>
                            <span className="text-slate-300 font-semibold">{pod.cpuUsage}m</span>
                            <span className="text-slate-500">/ {pod.cpuLimit}m</span>
                          </span>

                          <span className="flex items-center gap-1">
                            <span>RAM:</span>
                            <span className={`font-semibold ${podMemPercent > 90 ? 'text-red-400' : 'text-slate-300'}`}>
                              {pod.memUsage}Mi
                            </span>
                            <span className="text-slate-500">/ {pod.memLimit}Mi</span>
                          </span>

                          <span className="text-slate-500">{pod.qosClass}</span>
                        </div>

                        {/* Memory bar (visual leak indicator) */}
                        <div className="h-1 w-full bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              podMemPercent > 90
                                ? 'bg-red-500'
                                : podMemPercent > 70
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${podMemPercent}%` }}
                          />
                        </div>

                        {/* Hover Quick Action */}
                        <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              sounds.playPodDeploy();
                              onRestartPod(pod.id);
                            }}
                            title="Restart Container"
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
