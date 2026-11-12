import React from 'react';
import { 
  Trophy, 
  X, 
  Award, 
  Zap, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  Users
} from 'lucide-react';
import { SquadRank } from '../types/kubernetes';
import { sounds } from '../utils/audio';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  ranks: SquadRank[];
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  ranks,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="w-full max-w-2xl bg-[#090d16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>DevOps Squad Efficiency Leaderboard</span>
              </h2>
              <p className="text-xs text-slate-400">
                Ranked by Incident Resolution Velocity (MTTR) and Resource Utilization Efficiency
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

        {/* Squad Comparison Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {ranks.map(squad => {
            const isUserSquad = squad.isUser;

            return (
              <div
                key={squad.name}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                  isUserSquad
                    ? 'bg-blue-950/40 border-blue-500/70 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                {/* Left: Rank & Squad Name */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                      squad.rank === 1
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : squad.rank === 2
                        ? 'bg-slate-300/20 text-slate-200 border border-slate-300/30'
                        : squad.rank === 3
                        ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    #{squad.rank}
                  </div>

                  <span className="text-xl select-none">{squad.avatar}</span>

                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{squad.name}</span>
                      {isUserSquad && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-600 text-white font-bold">
                          YOUR SQUAD
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {squad.badgesCount} Badges Unlocked · Top 5% Performance
                    </div>
                  </div>
                </div>

                {/* Right: Telemetry Metrics */}
                <div className="flex items-center gap-4 text-right font-mono">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">MTTR</div>
                    <div className="text-xs font-bold tabular-nums text-emerald-400">
                      {squad.mttr}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Efficiency</div>
                    <div className="text-xs font-bold tabular-nums text-purple-400">
                      {squad.efficiency}%
                    </div>
                  </div>

                  <div className="w-16">
                    <div className="text-[10px] text-slate-400 uppercase">Score</div>
                    <div className="text-xs font-bold tabular-nums text-blue-400">
                      {squad.score}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Squad Perks / Level-Up Explainer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Top squad earns <strong>Autopilot Self-Healing Drones</strong> for next week</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
