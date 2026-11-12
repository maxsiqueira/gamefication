import React from 'react';
import { 
  Plus, 
  X, 
  Layers, 
  Cpu, 
  HardDrive, 
  TrendingUp, 
  Activity, 
  Check, 
  Box, 
  Sparkles 
} from 'lucide-react';
import { Deployment } from '../types/kubernetes';
import { sounds } from '../utils/audio';

interface DeployWorkloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (deployment: Deployment) => void;
}

interface TemplatePreset {
  name: string;
  image: string;
  category: string;
  defaultReplicas: number;
  cpuReq: number;
  cpuLim: number;
  memReq: number;
  memLim: number;
  probePath: string;
  probePort: number;
}

const TEMPLATES: TemplatePreset[] = [
  {
    name: 'order-service',
    image: 'golang:1.22-orders',
    category: 'Backend API',
    defaultReplicas: 3,
    cpuReq: 250,
    cpuLim: 600,
    memReq: 256,
    memLim: 512,
    probePath: '/healthz',
    probePort: 8080,
  },
  {
    name: 'ml-inference',
    image: 'python:3.11-pytorch',
    category: 'AI Worker',
    defaultReplicas: 2,
    cpuReq: 500,
    cpuLim: 1500,
    memReq: 512,
    memLim: 1024,
    probePath: '/ready',
    probePort: 8000,
  },
  {
    name: 'session-store',
    image: 'redis:7.2-alpine',
    category: 'Cache',
    defaultReplicas: 1,
    cpuReq: 150,
    cpuLim: 500,
    memReq: 256,
    memLim: 768,
    probePath: '/ping',
    probePort: 6379,
  },
  {
    name: 'static-cdn',
    image: 'nginx:1.25-alpine',
    category: 'Frontend Edge',
    defaultReplicas: 2,
    cpuReq: 100,
    cpuLim: 300,
    memReq: 128,
    memLim: 256,
    probePath: '/healthz',
    probePort: 80,
  },
];

export const DeployWorkloadModal: React.FC<DeployWorkloadModalProps> = ({
  isOpen,
  onClose,
  onDeploy,
}) => {
  const [selectedTemplate, setSelectedTemplate] = React.useState<TemplatePreset>(TEMPLATES[0]);
  const [name, setName] = React.useState(TEMPLATES[0].name);
  const [namespace, setNamespace] = React.useState('production');
  const [replicas, setReplicas] = React.useState(TEMPLATES[0].defaultReplicas);
  const [cpuReq, setCpuReq] = React.useState(TEMPLATES[0].cpuReq);
  const [cpuLim, setCpuLim] = React.useState(TEMPLATES[0].cpuLim);
  const [memReq, setMemReq] = React.useState(TEMPLATES[0].memReq);
  const [memLim, setMemLim] = React.useState(TEMPLATES[0].memLim);
  const [hpaEnabled, setHpaEnabled] = React.useState(true);
  const [maxReplicas, setMaxReplicas] = React.useState(6);

  if (!isOpen) return null;

  const handleSelectTemplate = (tmpl: TemplatePreset) => {
    sounds.playBlip(550);
    setSelectedTemplate(tmpl);
    setName(tmpl.name);
    setReplicas(tmpl.defaultReplicas);
    setCpuReq(tmpl.cpuReq);
    setCpuLim(tmpl.cpuLim);
    setMemReq(tmpl.memReq);
    setMemLim(tmpl.memLim);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playPodDeploy();

    const newDeploy: Deployment = {
      id: `dep-${Date.now()}`,
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      namespace,
      image: selectedTemplate.image,
      replicas,
      desiredReplicas: replicas,
      availableReplicas: replicas,
      cpuRequest: cpuReq,
      cpuLimit: cpuLim,
      memRequest: memReq,
      memLimit: memLim,
      hpaEnabled,
      minReplicas: Math.max(1, Math.floor(replicas / 2)),
      maxReplicas,
      targetCpuPercent: 70,
      version: 'v1.0.0',
      selector: { app: name },
    };

    onDeploy(newDeploy);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="w-full max-w-2xl bg-[#090d16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-950/80 border border-blue-800/80 text-blue-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Deploy Kubernetes Workload</h2>
              <p className="text-xs text-slate-400">
                Configure container resource requests, limits, QoS class, and HPA auto-scaling
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

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Workload Presets */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Choose Application Preset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {TEMPLATES.map(tmpl => (
                <button
                  type="button"
                  key={tmpl.name}
                  onClick={() => handleSelectTemplate(tmpl)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedTemplate.name === tmpl.name
                      ? 'bg-blue-950/50 border-blue-500 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] font-mono text-blue-400 mb-0.5">{tmpl.category}</div>
                  <div className="text-xs font-bold text-white truncate">{tmpl.name}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">{tmpl.cpuReq}m / {tmpl.memReq}Mi</div>
                </button>
              ))}
            </div>
          </div>

          {/* Configuration Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Deployment Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Namespace
              </label>
              <select
                value={namespace}
                onChange={e => setNamespace(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="production">production</option>
                <option value="analytics">analytics</option>
                <option value="staging">staging</option>
              </select>
            </div>
          </div>

          {/* Replicas Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
              <span>Pod Replicas</span>
              <span className="font-mono text-blue-400 font-bold">{replicas} pods</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              value={replicas}
              onChange={e => setReplicas(parseInt(e.target.value, 10))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Resource Requests & Limits (FinOps) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span>Resource Allocation & QoS Guarantee</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400">QoS: Burstable</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] text-slate-400 mb-1">CPU (Request / Limit)</div>
                <div className="flex items-center gap-2 font-mono text-xs text-slate-200">
                  <span>{cpuReq}m</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-blue-400">{cpuLim}m</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400 mb-1">Memory (Request / Limit)</div>
                <div className="flex items-center gap-2 font-mono text-xs text-slate-200">
                  <span>{memReq}Mi</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-purple-400">{memLim}Mi</span>
                </div>
              </div>
            </div>
          </div>

          {/* HPA Auto-scaler Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Horizontal Pod Autoscaler (HPA)</div>
                <div className="text-[11px] text-slate-400">Scale dynamically between 2 and {maxReplicas} pods at 70% CPU</div>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hpaEnabled}
                onChange={e => setHpaEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all cursor-pointer"
            >
              Deploy Deployment (+150 XP)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
