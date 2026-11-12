import React from 'react';
import { 
  HeartPulse, 
  Shield, 
  DollarSign, 
  Percent, 
  AlertTriangle, 
  Terminal, 
  Award, 
  Volume2, 
  VolumeX, 
  Menu, 
  Flame, 
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { ClusterMetrics, UserProgress } from '../types/kubernetes';
import { sounds } from '../utils/audio';

interface GameHUDProps {
  metrics: ClusterMetrics;
  userProgress: UserProgress;
  activeAlertsCount: number;
  terminalOpen: boolean;
  onToggleTerminal: () => void;
  onOpenAlerts: () => void;
  onOpenLeaderboard: () => void;
  onOpenBadges: () => void;
  onOpenChaosModal: () => void;
  onExitToTitle: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  metrics,
  userProgress,
  activeAlertsCount,
  terminalOpen,
  onToggleTerminal,
  onOpenAlerts,
  onOpenLeaderboard,
  onOpenBadges,
  onOpenChaosModal,
  onExitToTitle,
}) => {
  const [isMuted, setIsMuted] = React.useState(sounds.isMuted());

  const handleToggleMute = () => {
    const next = sounds.toggleMute();
    setIsMuted(next);
  };

  const xpPercent = Math.min(100, Math.round((userProgress.xp / userProgress.nextLevelXp) * 100));

  return (
    <header className="sticky top-0 z-30 w-full bg-[#0a0f1d]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand / Title + Mode */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              sounds.playBlip();
              onExitToTitle();
            }}
            className="flex items-center gap-2 text-slate-200 hover:text-white group transition-colors"
            title="Return to Mission Briefing"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
              <span className="font-mono font-bold text-xs">k8s</span>
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block leading-none">
                KubeCommander
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                PROD-CLUSTER-01
              </span>
            </div>
          </button>
        </div>

        {/* Center: Real-Time Cluster Telemetry Cluster (Low-Occlusion, Tabular Figures) */}
        <div className="hidden md:flex items-center gap-6 font-mono text-xs">
          {/* Health Score */}
          <div className="flex items-center gap-2">
            <HeartPulse className={`w-4 h-4 ${metrics.healthScore > 90 ? 'text-emerald-400' : metrics.healthScore > 75 ? 'text-amber-400' : 'text-red-400 animate-pulse'}`} />
            <div>
              <div className="text-[10px] text-slate-400 uppercase leading-none">Health</div>
              <div className={`font-bold tabular-nums leading-tight ${metrics.healthScore > 90 ? 'text-emerald-400' : metrics.healthScore > 75 ? 'text-amber-400' : 'text-red-400'}`}>
                {metrics.healthScore}%
              </div>
            </div>
          </div>

          {/* SLO / SLA Target */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase leading-none">SLO Uptime</div>
              <div className="text-slate-200 font-bold tabular-nums leading-tight">
                {metrics.sloPercent.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Efficiency Index (FinOps) */}
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase leading-none">Efficiency</div>
              <div className={`font-bold tabular-nums leading-tight ${metrics.efficiencyPercent > 75 ? 'text-purple-300' : 'text-amber-400'}`}>
                {metrics.efficiencyPercent}%
              </div>
            </div>
          </div>

          {/* Cloud Cost */}
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase leading-none">Cloud Cost</div>
              <div className="text-slate-200 font-bold tabular-nums leading-tight">
                ${metrics.costPerHour.toFixed(2)}/hr
              </div>
            </div>
          </div>

          {/* Active Alerts Trigger */}
          <button
            onClick={() => {
              sounds.playBlip();
              onOpenAlerts();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              activeAlertsCount > 0
                ? 'bg-red-950/70 border-red-700/80 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.25)] animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span>Alerts:</span>
            <span className="font-bold tabular-nums">{activeAlertsCount}</span>
          </button>
        </div>

        {/* Right: Operator Level, Badges, Leaderboard & Controls */}
        <div className="flex items-center gap-3">
          {/* Operator Level & XP Bar */}
          <div className="hidden sm:flex flex-col items-end font-mono">
            <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
              <span className="text-blue-400 font-bold">Lvl {userProgress.level}</span>
              <span className="text-slate-400 font-sans text-xs">{userProgress.title}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 tabular-nums">
                {userProgress.xp}xp
              </span>
            </div>
          </div>

          {/* Badges Modal Trigger */}
          <button
            onClick={() => {
              sounds.playBlip();
              onOpenBadges();
            }}
            title="View Badges & Achievements"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Award className="w-4 h-4" />
          </button>

          {/* Leaderboard Modal Trigger */}
          <button
            onClick={() => {
              sounds.playBlip();
              onOpenLeaderboard();
            }}
            title="DevOps Squad Leaderboard"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={handleToggleMute}
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
          </button>

          {/* CLI Terminal Toggle */}
          <button
            onClick={() => {
              sounds.playBlip();
              onToggleTerminal();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
              terminalOpen
                ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">kubectl</span>
            <kbd className="hidden md:inline px-1 bg-black/30 rounded text-[9px] text-slate-300">T</kbd>
          </button>
        </div>
      </div>
    </header>
  );
};
