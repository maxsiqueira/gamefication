import React from 'react';
import { 
  Server, 
  X, 
  Cpu, 
  HardDrive, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowDownCircle, 
  Check, 
  Flame 
} from 'lucide-react';
import { Node, Pod } from '../types/kubernetes';
import { sounds } from '../utils/audio';

interface NodeInspectorModalProps {
  node: Node | null;
  pods: Pod[];
  onClose: () => void;
  onDrainNode: (nodeId: string) => void;
  onToggleCordon: (nodeId: string) => void;
}

export const NodeInspectorModal: React.FC<NodeInspectorModalProps> = ({
  node,
  pods,
  onClose,
  onDrainNode,
  onToggleCordon,
}) => {
  if (!node) return null;

  const nodePods = pods.filter(p => p.nodeId === node.id);
  const cpuPercent = Math.min(100, Math.round((node.cpuUsage / node.cpuCores) * 100));
  const memPercent = Math.min(100, Math.round((node.memUsage / node.memoryMb) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="w-full max-w-2xl bg-[#090d16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${
              node.status === 'Ready'
                ? 'bg-blue-950/80 border-blue-800 text-blue-400'
                : 'bg-red-950/80 border-red-700 text-red-400'
            }`}>
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white font-mono">{node.name}</h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  node.status === 'Ready'
                    ? 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                    : 'bg-red-900 text-white'
                }`}>
                  {node.status}
                </span>
                {node.cordoned && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300">
                    Cordoned
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Zone: {node.zone} · Instance: e2-standard-4 (4 vCPU, 8 GiB)
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Node Hardware Gauges */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  <span>CPU Allocation</span>
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
                <span>Usage: {node.cpuUsage}m</span>
                <span>Cores: {node.cpuCores}m (4.0)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                  <span>Memory Allocation</span>
                </span>
                <span className="text-slate-200 font-bold tabular-nums">
                  {memPercent}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-2">
                <div 
                  className={`h-full ${memPercent > 80 ? 'bg-red-500' : 'bg-purple-500'}`}
                  style={{ width: `${memPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Usage: {node.memUsage}Mi</span>
                <span>Capacity: {node.memoryMb}Mi (8.0G)</span>
              </div>
            </div>
          </div>

          {/* Node Conditions Checklist */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <div className="font-semibold text-slate-200 mb-2.5 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Kubelet Node Conditions</span>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
              <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">DiskPressure</span>
                <span className="text-emerald-400 font-bold">False</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">MemoryPressure</span>
                <span className="text-emerald-400 font-bold">False</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">PIDPressure</span>
                <span className="text-emerald-400 font-bold">False</span>
              </div>
            </div>
          </div>

          {/* Hosted Pods List */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2">
              Non-Terminated Hosted Pods ({nodePods.length})
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              {nodePods.map(pod => (
                <div
                  key={pod.id}
                  className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold">{pod.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    <span>{pod.cpuUsage}m CPU</span>
                    <span>{pod.memUsage}Mi RAM</span>
                    <span className="text-emerald-400">{pod.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Node Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              sounds.playBlip(550);
              onToggleCordon(node.id);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            {node.cordoned ? 'Uncordon Node' : 'Cordon Node'}
          </button>

          <button
            onClick={() => {
              sounds.playSuccess();
              onDrainNode(node.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>Drain Node (Evict Pods)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
