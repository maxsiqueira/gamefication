import React from 'react';
import { 
  Flame, 
  X, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Award, 
  AlertTriangle, 
  Layers, 
  Terminal, 
  Play,
  RotateCcw
} from 'lucide-react';
import { ChaosScenario } from '../types/kubernetes';
import { sounds } from '../utils/audio';

interface ChaosSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: ChaosScenario[];
  activeScenario: ChaosScenario | null;
  scenarioTimeLeft: number;
  onStartScenario: (scenario: ChaosScenario) => void;
  onAbortScenario: () => void;
}

export const ChaosSimulatorModal: React.FC<ChaosSimulatorModalProps> = ({
  isOpen,
  onClose,
  scenarios,
  activeScenario,
  scenarioTimeLeft,
  onStartScenario,
  onAbortScenario,
}) => {
  const [filterCategory, setFilterCategory] = React.useState<string>('All');

  if (!isOpen) return null;

  const categories = ['All', 'Memory', 'Traffic', 'Config', 'Resilience', 'FinOps'];

  const filteredScenarios = scenarios.filter(sc => {
    return filterCategory === 'All' || sc.category === filterCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="w-full max-w-3xl bg-[#090d16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-950/80 border border-red-800/80 text-red-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Chaos Engineering & Production Failure Simulator</span>
              </h2>
              <p className="text-xs text-slate-400">
                Trigger real-world outage scenarios to master Kubernetes resilience, probes, and auto-scaling
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

        {/* Active Scenario Banner if running */}
        {activeScenario && (
          <div className="bg-red-950/70 border-b border-red-800/80 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <div>
                <div className="text-xs font-mono uppercase text-red-300 font-bold">
                  ACTIVE OUTAGE SIMULATION: {activeScenario.title}
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  {activeScenario.objective}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right font-mono">
                <div className="text-[10px] text-slate-400 uppercase">SLA Timer</div>
                <div className="text-sm font-bold tabular-nums text-red-400">
                  {scenarioTimeLeft}s
                </div>
              </div>

              <button
                onClick={() => {
                  sounds.playBlip();
                  onAbortScenario();
                }}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono"
              >
                Abort
              </button>
            </div>
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-1 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                sounds.playBlip(520);
                setFilterCategory(cat);
              }}
              className={`px-3 py-1 text-xs rounded-lg font-mono transition-colors ${
                filterCategory === cat
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Scenario Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {filteredScenarios.map(sc => {
            const isCurrentlyActive = activeScenario?.id === sc.id;

            return (
              <div
                key={sc.id}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrentlyActive
                    ? 'bg-red-950/40 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{sc.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-blue-400">
                      {sc.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        sc.difficulty === 'Cadet'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                          : sc.difficulty === 'Operator'
                          ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                          : 'bg-purple-950/80 text-purple-300 border border-purple-800'
                      }`}
                    >
                      {sc.difficulty}
                    </span>
                    <span className="text-xs font-mono text-amber-400 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      +{sc.xpReward} XP
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                  {sc.description}
                </p>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 mb-3 text-xs space-y-1">
                  <div className="text-slate-400">
                    <strong className="text-slate-200">Mission Goal:</strong> {sc.objective}
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    <strong className="text-blue-400">Triage Hint:</strong> {sc.hint}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>Time Limit: {sc.timeLimitSec}s</span>
                  </div>

                  <button
                    onClick={() => {
                      sounds.playAlert();
                      onStartScenario(sc);
                    }}
                    disabled={isCurrentlyActive}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isCurrentlyActive
                        ? 'bg-red-800 text-white cursor-not-allowed opacity-80'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>{isCurrentlyActive ? 'Simulation In Progress' : 'Inject Failure'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
