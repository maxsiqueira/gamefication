import React from 'react';
import { 
  Award, 
  X, 
  ShieldCheck, 
  Activity, 
  TrendingUp, 
  Coins, 
  Zap, 
  Terminal, 
  Lock, 
  Check, 
  Sparkles 
} from 'lucide-react';
import { Badge } from '../types/kubernetes';

interface BadgesModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: Badge[];
}

export const BadgesModal: React.FC<BadgesModalProps> = ({
  isOpen,
  onClose,
  badges,
}) => {
  if (!isOpen) return null;

  const unlockedCount = badges.filter(b => b.unlocked).length;
  const progressPercent = Math.round((unlockedCount / badges.length) * 100);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck': return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case 'Activity': return <Activity className="w-5 h-5 text-red-400" />;
      case 'TrendingUp': return <TrendingUp className="w-5 h-5 text-blue-400" />;
      case 'Coins': return <Coins className="w-5 h-5 text-amber-400" />;
      case 'Zap': return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'Terminal': return <Terminal className="w-5 h-5 text-purple-400" />;
      default: return <Award className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="w-full max-w-2xl bg-[#090d16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-800/80 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Kubernetes Mastery Badges & Achievements</span>
              </h2>
              <p className="text-xs text-slate-400">
                Unlock honors by solving incidents, optimizing cluster cost, and mastering kubectl
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

        {/* Progress Bar */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Mastery Progress: <strong className="text-white font-mono">{unlockedCount}/{badges.length} Unlocked</strong></span>
          </div>

          <div className="w-44 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Badges Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {badges.map(badge => {
            return (
              <div
                key={badge.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                  badge.unlocked
                    ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                    : 'bg-slate-900/40 border-slate-800/80 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${
                        badge.unlocked ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {badge.unlocked ? getIcon(badge.icon) : <Lock className="w-4 h-4 text-slate-500" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{badge.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{badge.category}</div>
                      </div>
                    </div>

                    {badge.unlocked ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                        <Check className="w-3 h-3" />
                        EARNED
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                        LOCKED
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mt-1">
                    {badge.description}
                  </p>
                </div>

                {badge.unlockedAt && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500">
                    Unlocked: {new Date(badge.unlockedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
