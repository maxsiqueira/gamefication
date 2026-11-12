import React from 'react';
import { 
  Play, 
  Terminal, 
  ShieldCheck, 
  Flame, 
  Cpu, 
  Zap, 
  Award, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { UserProgress } from '../types/kubernetes';
import { sounds } from '../utils/audio';

interface TitleScreenProps {
  userProgress: UserProgress;
  onStartGame: (mode: 'incident' | 'academy' | 'sandbox') => void;
  onOpenLeaderboard: () => void;
  onOpenBadges: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  userProgress,
  onStartGame,
  onOpenLeaderboard,
  onOpenBadges,
}) => {
  const [selectedMode, setSelectedMode] = React.useState<'incident' | 'academy' | 'sandbox'>('incident');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        sounds.playBlip(520);
        onStartGame(selectedMode);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame, selectedMode]);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between bg-[#070b12] text-slate-100 p-6 md:p-12 overflow-hidden select-none">
      {/* Background ambient grid with subtle cybernetic nodes */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(circle at 50% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 60%),
                            linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 48px 48px, 48px 48px'
        }}
      />

      {/* Top Header Bar */}
      <header className="w-full max-w-6xl flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-blue-400 font-mono">v1.31 // Production Sim</div>
            <div className="text-sm font-semibold text-slate-200">KubeCommander Ops Engine</div>
          </div>
        </div>

        {/* User Operator Status */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              sounds.playBlip();
              onOpenBadges();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Badges</span>
            <span className="font-mono text-amber-400">6</span>
          </button>

          <button
            onClick={() => {
              sounds.playBlip();
              onOpenLeaderboard();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Squad Leaderboard</span>
            <span className="font-mono text-emerald-400">#1</span>
          </button>
        </div>
      </header>

      {/* Center Hero Lockup */}
      <div className="w-full max-w-4xl flex flex-col items-center text-center my-auto py-8 relative z-10">
        {/* Bespoke inline SVG Kubernetes Helm Lockup */}
        <div className="relative mb-6">
          <div className="absolute -inset-6 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
          <svg 
            className="w-28 h-28 text-blue-400 relative drop-shadow-[0_0_25px_rgba(59,130,246,0.5)]" 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Heptagon Gear Nodes */}
            <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 3" />
            <circle cx="50" cy="8" r="4" fill="#60A5FA" />
            <circle cx="86" cy="24" r="4" fill="#60A5FA" />
            <circle cx="91" cy="65" r="4" fill="#60A5FA" />
            <circle cx="62" cy="91" r="4" fill="#60A5FA" />
            <circle cx="38" cy="91" r="4" fill="#60A5FA" />
            <circle cx="9" cy="65" r="4" fill="#60A5FA" />
            <circle cx="14" cy="24" r="4" fill="#60A5FA" />
            {/* Kubernetes Spoke Wheel */}
            <path d="M50 12 L50 42" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M82 27 L57 44" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M87 64 L58 53" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M60 88 L52 58" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M40 88 L48 58" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M13 64 L42 53" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M18 27 L43 44" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
            {/* Central Control Hub */}
            <circle cx="50" cy="50" r="9" fill="#1E3A8A" stroke="#60A5FA" strokeWidth="2.5" />
            <circle cx="50" cy="50" r="3.5" fill="#93C5FD" />
          </svg>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-3">
          KUBECOMMANDER
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mb-8 leading-relaxed">
          Master real-time Kubernetes cluster monitoring, live chaos triage, and container orchestration. Level up your SRE skills through hands-on production challenges.
        </p>

        {/* Game Mode Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mb-8 text-left">
          {/* Mode 1: Incident Commander */}
          <button
            onClick={() => {
              sounds.playBlip(480);
              setSelectedMode('incident');
            }}
            className={`p-4 rounded-xl border transition-all relative ${
              selectedMode === 'incident'
                ? 'bg-red-950/40 border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            {selectedMode === 'incident' && (
              <span className="absolute -top-2 right-3 px-2 py-0.5 rounded text-[10px] font-mono bg-red-600 text-white font-bold">
                ACTIVE
              </span>
            )}
            <div className="flex items-center gap-2 mb-2 text-red-400">
              <Flame className="w-4 h-4" />
              <span className="font-bold text-sm text-slate-100">Chaos Commander</span>
            </div>
            <p className="text-xs text-slate-400 leading-normal">
              Face live OOMKilled crashes, cascading traffic spikes, and node panics under SLA timers.
            </p>
          </button>

          {/* Mode 2: Kube Academy */}
          <button
            onClick={() => {
              sounds.playBlip(480);
              setSelectedMode('academy');
            }}
            className={`p-4 rounded-xl border transition-all relative ${
              selectedMode === 'academy'
                ? 'bg-blue-950/40 border-blue-500/60 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            {selectedMode === 'academy' && (
              <span className="absolute -top-2 right-3 px-2 py-0.5 rounded text-[10px] font-mono bg-blue-600 text-white font-bold">
                ACTIVE
              </span>
            )}
            <div className="flex items-center gap-2 mb-2 text-blue-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="font-bold text-sm text-slate-100">Kube Academy</span>
            </div>
            <p className="text-xs text-slate-400 leading-normal">
              Step-by-step interactive missions: pod QoS, liveness probes, HPA, and rolling updates.
            </p>
          </button>

          {/* Mode 3: Cluster Sandbox */}
          <button
            onClick={() => {
              sounds.playBlip(480);
              setSelectedMode('sandbox');
            }}
            className={`p-4 rounded-xl border transition-all relative ${
              selectedMode === 'sandbox'
                ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            {selectedMode === 'sandbox' && (
              <span className="absolute -top-2 right-3 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-600 text-white font-bold">
                ACTIVE
              </span>
            )}
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <Terminal className="w-4 h-4" />
              <span className="font-bold text-sm text-slate-100">Live Sandbox</span>
            </div>
            <p className="text-xs text-slate-400 leading-normal">
              Freeform cluster operations. Deploy microservices, run kubectl commands, and optimize FinOps.
            </p>
          </button>
        </div>

        {/* Primary Start CTA Button */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => {
              sounds.playBlip(560);
              onStartGame(selectedMode);
            }}
            className="group flex items-center gap-3 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-base shadow-[0_0_25px_rgba(59,130,246,0.4)] hover:shadow-[0_0_35px_rgba(59,130,246,0.6)] transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Play className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
            <span>Enter the Cluster</span>
            <ChevronRight className="w-4 h-4 text-blue-200 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Control Hint Line */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mt-2">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Enter</kbd>
            <span>or</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Space</kbd>
            <span>to start ·</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">T</kbd>
            <span>CLI Terminal ·</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">1-4</kbd>
            <span>Views ·</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Esc</kbd>
            <span>Pause</span>
          </div>
        </div>
      </div>

      {/* Bottom Status / Profile Kicker */}
      <footer className="w-full max-w-4xl flex items-center justify-between text-xs text-slate-500 border-t border-slate-900 pt-4 relative z-10">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-400">Cluster: <strong className="text-slate-300 font-mono">us-central1-k8s-prod</strong></span>
          <span>·</span>
          <span>4 Nodes</span>
          <span>·</span>
          <span>8 Active Pods</span>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span className="text-slate-400">Rank: <strong className="text-blue-400">Lvl {userProgress.level} {userProgress.title}</strong></span>
          <span>·</span>
          <span className="tabular-nums text-slate-300">{userProgress.xp} / {userProgress.nextLevelXp} XP</span>
        </div>
      </footer>
    </div>
  );
};
