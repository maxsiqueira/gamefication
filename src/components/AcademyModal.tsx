import React from 'react';
import { 
  GraduationCap, 
  X, 
  CheckCircle2, 
  ArrowRight, 
  BookOpen, 
  Award, 
  Terminal, 
  Cpu, 
  ShieldCheck, 
  Activity, 
  Sparkles 
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface AcademyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunAcademyCommand: (cmd: string) => void;
}

interface Lesson {
  id: string;
  title: string;
  concept: string;
  explanation: string;
  sampleCommand: string;
  xp: number;
}

const LESSONS: Lesson[] = [
  {
    id: 'lesson-1',
    title: '1. Pod Lifecycle & The Dreaded OOMKilled',
    concept: 'Linux cgroups & Exit Code 137',
    explanation: 'When a container allocates more memory than spec.containers[].resources.limits.memory, the kernel OOM killer abruptly slays the PID with signal 9 (Exit Code 128 + 9 = 137). Always ensure your memory limits accommodate heap spikes!',
    sampleCommand: 'kubectl describe pod analytics-worker-99ab1-a1',
    xp: 150,
  },
  {
    id: 'lesson-2',
    title: '2. QoS Classes: Guaranteed vs Burstable vs BestEffort',
    concept: 'Scheduler Eviction Order',
    explanation: 'Kubernetes assigns QoS automatically: If requests == limits for all containers, QoS is Guaranteed. If requests < limits, QoS is Burstable. If neither is set, QoS is BestEffort. During node memory pressure, BestEffort pods are evicted first!',
    sampleCommand: 'kubectl get pods -o wide',
    xp: 200,
  },
  {
    id: 'lesson-3',
    title: '3. Liveness vs Readiness Probes',
    concept: 'Traffic Routing vs Container Restarts',
    explanation: 'Readiness probes dictate whether a pod receives ingress traffic from Services. Liveness probes dictate if kubelet restarts the container when it deadlocks. A misconfigured liveness probe will cause perpetual CrashLoopBackOff!',
    sampleCommand: 'kubectl get events',
    xp: 250,
  },
  {
    id: 'lesson-4',
    title: '4. Horizontal Pod Autoscaling (HPA)',
    concept: 'Metric-Driven Elastic Scaling',
    explanation: 'HPA monitors pod metrics (typically CPU or custom memory metrics) via metrics-server. When utilization surpasses targetAverageUtilization (e.g. 70%), HPA scales the replica count smoothly up to maxReplicas.',
    sampleCommand: 'kubectl autoscale deploy payment-gateway --min=2 --max=8 --cpu-percent=70',
    xp: 300,
  },
  {
    id: 'lesson-5',
    title: '5. Zero-Downtime Node Draining',
    concept: 'Cluster Maintenance & Evictions',
    explanation: 'Before terminating or patching a cloud VM, `kubectl drain` cordons the node (preventing new pods) and safely evicts existing pods to other nodes, respecting PodDisruptionBudgets (PDBs).',
    sampleCommand: 'kubectl drain node node-prod-pool-01',
    xp: 350,
  },
];

export const AcademyModal: React.FC<AcademyModalProps> = ({
  isOpen,
  onClose,
  onRunAcademyCommand,
}) => {
  const [selectedLesson, setSelectedLesson] = React.useState<Lesson>(LESSONS[0]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="w-full max-w-3xl bg-[#090d16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-950/80 border border-blue-800/80 text-blue-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Kube Academy: Hands-On Container Mastery</span>
              </h2>
              <p className="text-xs text-slate-400">
                Learn core Kubernetes architecture principles with interactive command execution
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

        {/* 2-Column Split: Lesson List + Lesson Reader */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3">
          {/* Left: Lessons List */}
          <div className="border-r border-slate-800 p-3 overflow-y-auto space-y-2 bg-slate-950/40">
            {LESSONS.map(lesson => (
              <button
                key={lesson.id}
                onClick={() => {
                  sounds.playBlip(520);
                  setSelectedLesson(lesson);
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedLesson.id === lesson.id
                    ? 'bg-blue-950/50 border-blue-500 shadow-sm'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-white truncate">{lesson.title}</div>
                <div className="text-[10px] font-mono text-blue-400 mt-0.5">{lesson.concept}</div>
              </button>
            ))}
          </div>

          {/* Right: Lesson Detail & Interactive Lab */}
          <div className="md:col-span-2 p-5 overflow-y-auto flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase text-blue-400 font-semibold">
                  Module: {selectedLesson.concept}
                </span>
                <span className="text-xs font-mono text-amber-400 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  +{selectedLesson.xp} XP
                </span>
              </div>

              <h3 className="text-base font-bold text-white mb-2">
                {selectedLesson.title}
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {selectedLesson.explanation}
              </p>

              {/* Lab Command Box */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Execute in CLI Terminal:</span>
                </div>
                <div className="font-mono text-xs text-emerald-300 bg-black/60 p-2.5 rounded-lg border border-slate-800/80 overflow-x-auto">
                  $ {selectedLesson.sampleCommand}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  sounds.playSuccess();
                  onRunAcademyCommand(selectedLesson.sampleCommand);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <span>Launch Command in Terminal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
