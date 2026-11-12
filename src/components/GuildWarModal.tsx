import React from 'react';
import { 
  Users, 
  X, 
  Flame, 
  Shield, 
  Zap, 
  Trophy, 
  Award, 
  Activity, 
  ArrowRightLeft, 
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Guild, GuildMember, TeamSide, BattleEvent } from '../types/guild';
import { CorporateUser } from '../utils/corporateAuth';
import { sounds } from '../utils/audio';

interface GuildWarModalProps {
  isOpen: boolean;
  onClose: () => void;
  guild: Guild;
  currentUser: CorporateUser;
  currentTeam: TeamSide;
  battleEvents: BattleEvent[];
  onSwitchTeam: (team: TeamSide) => void;
  onRedTeamAttack: (attackType: 'leak' | 'ddos' | 'probe' | 'node') => void;
  onBlueTeamDefense: (defenseType: 'patch' | 'hpa' | 'probe_repair' | 'drain') => void;
}

export const GuildWarModal: React.FC<GuildWarModalProps> = ({
  isOpen,
  onClose,
  guild,
  currentUser,
  currentTeam,
  battleEvents,
  onSwitchTeam,
  onRedTeamAttack,
  onBlueTeamDefense,
}) => {
  const [activeTab, setActiveTab] = React.useState<'battle' | 'members'>('battle');

  if (!isOpen) return null;

  const totalPoints = (guild.scoreBlue + guild.scoreRed) || 1;
  const bluePercent = Math.round((guild.scoreBlue / totalPoints) * 100);
  const redPercent = 100 - bluePercent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-3xl bg-[#090d16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-xl">
              {guild.logo}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">{guild.name}</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-bold">
                  [{guild.tag}]
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Arena de Guildas ION Sistemas · {guild.members.length} participantes ativos
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

        {/* Tug of War Scoreboard */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <div className="flex items-center gap-2 text-blue-400 font-bold">
              <Shield className="w-4 h-4" />
              <span>BLUE TEAM (DEFESA): {guild.scoreBlue} pts</span>
            </div>
            <div className="text-slate-400 font-sans text-[11px]">
              {guild.totalMitigated} Mitigações vs {guild.totalInjected} Ataques
            </div>
            <div className="flex items-center gap-2 text-red-400 font-bold">
              <span>RED TEAM (ATAQUE): {guild.scoreRed} pts</span>
              <Flame className="w-4 h-4" />
            </div>
          </div>

          {/* Tug of war bar */}
          <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500"
              style={{ width: `${bluePercent}%` }}
            />
            <div
              className="h-full bg-gradient-to-l from-red-600 to-rose-500 transition-all duration-500"
              style={{ width: `${redPercent}%` }}
            />
          </div>

          {/* Team Switcher Bar */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Seu papel atual:</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                  currentTeam === 'blue'
                    ? 'bg-blue-950 text-blue-400 border border-blue-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                {currentTeam === 'blue' ? '🔵 BLUE TEAM (SRE Correções)' : '🔴 RED TEAM (Injetor de Falhas)'}
              </span>
            </div>

            <button
              onClick={() => {
                sounds.playBlip(600);
                onSwitchTeam(currentTeam === 'blue' ? 'red' : 'blue');
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Trocar para {currentTeam === 'blue' ? 'Red Team' : 'Blue Team'}</span>
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2">
          <button
            onClick={() => {
              sounds.playBlip(500);
              setActiveTab('battle');
            }}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
              activeTab === 'battle'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ações de Batalha & Feed
          </button>
          <button
            onClick={() => {
              sounds.playBlip(500);
              setActiveTab('members');
            }}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
              activeTab === 'members'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Participantes da Guilda ({guild.members.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'battle' && (
            <div className="space-y-4">
              {/* Tactical Actions Arsenal based on Team */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    {currentTeam === 'blue' ? (
                      <>
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span>Arsenal de Correções do Blue Team</span>
                      </>
                    ) : (
                      <>
                        <Flame className="w-4 h-4 text-red-400" />
                        <span>Arsenal de Injeção de Falhas do Red Team</span>
                      </>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Ação ao vivo no cluster
                  </span>
                </div>

                {currentTeam === 'blue' ? (
                  /* Blue Team Actions */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={() => {
                        sounds.playSuccess();
                        onBlueTeamDefense('patch');
                      }}
                      className="p-3 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/60 text-left transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-blue-300 group-hover:text-white flex items-center justify-between">
                        <span>🛡️ Patch Memory Limit (+512Mi)</span>
                        <span className="text-[10px] font-mono text-emerald-400">+120 pts</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Remedia OOMKilled aumentando limits e limpando buffer leaker.
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        sounds.playPodDeploy();
                        onBlueTeamDefense('hpa');
                      }}
                      className="p-3 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/60 text-left transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-blue-300 group-hover:text-white flex items-center justify-between">
                        <span>🚀 Escalar Réplicas HPA</span>
                        <span className="text-[10px] font-mono text-emerald-400">+150 pts</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Sobe réplicas adicionais para diluir picos de carga e evitar HTTP 503.
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        sounds.playSuccess();
                        onBlueTeamDefense('probe_repair');
                      }}
                      className="p-3 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/60 text-left transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-blue-300 group-hover:text-white flex items-center justify-between">
                        <span>🩺 Restaurar Liveness Probe</span>
                        <span className="text-[10px] font-mono text-emerald-400">+110 pts</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Corrige endpoint `/healthz` e tira os pods de CrashLoopBackOff.
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        sounds.playSuccess();
                        onBlueTeamDefense('drain');
                      }}
                      className="p-3 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/60 text-left transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-blue-300 group-hover:text-white flex items-center justify-between">
                        <span>🚜 Drenar Nó e Reagendar Pods</span>
                        <span className="text-[10px] font-mono text-emerald-400">+180 pts</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Isola nó comprometido e realoca workloads com zero downtime.
                      </p>
                    </button>
                  </div>
                ) : (
                  /* Red Team Actions */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={() => {
                        sounds.playAlert();
                        onRedTeamAttack('leak');
                      }}
                      className="p-3 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 text-left transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-red-300 group-hover:text-white flex items-center justify-between">
                        <span>💥 Injetar Memory Leak Parasita</span>
                        <span className="text-[10px] font-mono text-amber-400">+130 pts</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Faz o analytics-worker alocar RAM sem liberar até tomar OOMKilled.
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        sounds.playAlert();
                        onRedTeamAttack('ddos');
                      }}
                      className="p-3 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 text-left transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-red-300 group-hover:text-white flex items-center justify-between">
                        <span>🌊 Disparar Cyber DDoS Wave</span>
                        <span className="text-[10px] font-mono text-amber-400">+160 pts</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Inunda payment-gateway com 5.000 RPS estourando CPU para 98%.
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        sounds.playAlert();
                        onRedTeamAttack('probe');
                      }}
                      className="p-3 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 text-left transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-red-300 group-hover:text-white flex items-center justify-between">
                        <span>☠️ Corromper Liveness Probe</span>
                        <span className="text-[10px] font-mono text-amber-400">+120 pts</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Muda endpoint para `/bad-healthz`, forçando CrashLoopBackOff contínuo.
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        sounds.playAlert();
                        onRedTeamAttack('node');
                      }}
                      className="p-3 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 text-left transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-red-300 group-hover:text-white flex items-center justify-between">
                        <span>⚡ Desligar Worker Node</span>
                        <span className="text-[10px] font-mono text-amber-400">+190 pts</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Coloca node-prod-pool-01 em status NotReady, isolando os pods.
                      </p>
                    </button>
                  </div>
                )}
              </div>

              {/* Live Battle Feed */}
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <span>Feed de Eventos da Batalha</span>
                </div>
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {battleEvents.map(evt => (
                    <div
                      key={evt.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                        evt.actorTeam === 'blue'
                          ? 'bg-blue-950/30 border-blue-900/50 text-blue-200'
                          : 'bg-red-950/30 border-red-900/50 text-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-sm">
                          {evt.actorTeam === 'blue' ? '🔵' : '🔴'}
                        </span>
                        <div>
                          <span className="font-bold text-white mr-1.5">{evt.actorName}</span>
                          <span className="text-slate-300">{evt.description}</span>
                        </div>
                      </div>

                      <span className="font-mono text-[11px] font-bold text-emerald-400 shrink-0 ml-2">
                        +{evt.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-2.5">
              {guild.members.map(member => (
                <div
                  key={member.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    member.email === currentUser.email
                      ? 'bg-blue-950/40 border-blue-500/80 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl select-none">{member.avatar}</span>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{member.name}</span>
                        {member.email === currentUser.email && (
                          <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[10px] font-mono font-bold">
                            VOCÊ
                          </span>
                        )}
                        <span
                          className={`w-2 h-2 rounded-full ${
                            member.online ? 'bg-emerald-500' : 'bg-slate-600'
                          }`}
                          title={member.online ? 'Online' : 'Offline'}
                        />
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {member.email} · {member.role}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Última ação: {member.lastAction}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1 ${
                        member.team === 'blue'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800'
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      {member.team === 'blue' ? 'Blue Team' : 'Red Team'}
                    </span>
                    <div className="text-xs font-bold text-white tabular-nums">
                      {member.score} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
