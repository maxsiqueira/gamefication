import React from 'react';
import { 
  ShieldCheck, 
  AlertOctagon, 
  Lock, 
  Flame, 
  Shield, 
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Users
} from 'lucide-react';
import { 
  CorporateUser, 
  ALLOWED_DOMAIN, 
  isDomainAuthorized, 
  saveCorporateUser,
  parseJwtPayload 
} from '../utils/corporateAuth';
import { TeamSide, INITIAL_GUILDS } from '../types/guild';
import { sounds } from '../utils/audio';

interface CorporateAuthGateProps {
  onAuthenticated: (user: CorporateUser, team: TeamSide, guildId: string) => void;
}

export const CorporateAuthGate: React.FC<CorporateAuthGateProps> = ({
  onAuthenticated,
}) => {
  const [emailInput, setEmailInput] = React.useState('max.sena@ionsistemas.com.br');
  const [nameInput, setNameInput] = React.useState('Max Sena');
  const [selectedTeam, setSelectedTeam] = React.useState<TeamSide>('blue');
  const [selectedGuildId, setSelectedGuildId] = React.useState<string>(INITIAL_GUILDS[0].id);
  
  // State for Access Denied / Blocked Screen
  const [blockedEmail, setBlockedEmail] = React.useState<string | null>(null);
  const [authStep, setAuthStep] = React.useState<'login' | 'select_team'>('login');
  const [verifiedUser, setVerifiedUser] = React.useState<CorporateUser | null>(null);

  const googleBtnContainerRef = React.useRef<HTMLDivElement>(null);

  // Initialize Google Identity Services if available in browser
  React.useEffect(() => {
    const initGsi = () => {
      const googleObj = (window as unknown as { 
        google?: { 
          accounts?: { 
            id?: { 
              initialize: (opts: Record<string, unknown>) => void;
              renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
            } 
          } 
        } 
      }).google;

      if (googleObj?.accounts?.id && googleBtnContainerRef.current) {
        try {
          googleObj.accounts.id.initialize({
            client_id: '547875755143-placeholder.apps.googleusercontent.com',
            hosted_domain: ALLOWED_DOMAIN,
            callback: (res: { credential?: string }) => {
              if (res.credential) {
                const payload = parseJwtPayload(res.credential);
                if (payload?.email) {
                  handleValidateEmail(payload.email, payload.name || payload.given_name || 'Colaborador ION');
                }
              }
            },
          });

          googleObj.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'filled_blue',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            width: 320,
          });
        } catch {
          // Fallback handled gracefully
        }
      }
    };

    const timer = setTimeout(initGsi, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleValidateEmail = (email: string, name?: string) => {
    const cleanEmail = email.trim().toLowerCase();

    if (!isDomainAuthorized(cleanEmail)) {
      sounds.playAlert();
      setBlockedEmail(cleanEmail);
      return;
    }

    sounds.playSuccess();
    setBlockedEmail(null);

    const user: CorporateUser = {
      email: cleanEmail,
      name: name || nameInput || cleanEmail.split('@')[0],
      domain: ALLOWED_DOMAIN,
      role: 'SRE Specialist',
      picture: '👨‍💻',
    };

    setVerifiedUser(user);
    setAuthStep('select_team');
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    handleValidateEmail(emailInput, nameInput);
  };

  const handleSimulateExternalBlock = (wrongEmail: string) => {
    sounds.playAlert();
    setBlockedEmail(wrongEmail);
  };

  const handleConfirmEntry = () => {
    if (!verifiedUser) return;
    sounds.playSuccess();
    saveCorporateUser(verifiedUser);
    onAuthenticated(verifiedUser, selectedTeam, selectedGuildId);
  };

  // FULL-SCREEN ACCESS BLOCKED VIEW IF EMAIL IS NOT @ionsistemas.com.br
  if (blockedEmail) {
    return (
      <div className="min-h-screen w-full bg-[#0d0407] text-slate-100 flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
        {/* Warning ambient background */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none" 
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.3) 0%, transparent 70%),
                              linear-gradient(rgba(239, 68, 68, 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(239, 68, 68, 0.1) 1px, transparent 1px)`,
            backgroundSize: '100% 100%, 32px 32px, 32px 32px'
          }}
        />

        <div className="w-full max-w-lg bg-[#14080b] border-2 border-red-700/80 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.3)] p-6 sm:p-8 text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-600/80 text-red-500 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <div className="inline-block px-3 py-1 rounded-full bg-red-950 border border-red-700 text-red-400 font-mono text-xs font-bold uppercase tracking-wider mb-2">
            Acesso Estritamente Restrito
          </div>

          <h1 className="text-2xl font-extrabold text-white mb-2">
            Acesso Negado ao Cluster
          </h1>

          <div className="p-4 rounded-xl bg-black/60 border border-red-900/60 my-4 text-xs space-y-2 text-left font-mono">
            <div className="text-slate-400">
              Tentativa com conta: <span className="text-red-400 font-bold underline">{blockedEmail}</span>
            </div>
            <div className="text-slate-300">
              Motivo do bloqueio: <span className="text-amber-400">Domínio externo não autorizado.</span>
            </div>
            <div className="text-slate-400 text-[11px] pt-1 border-t border-red-900/40">
              O simulador Kubernetes e arena de guildas são liberados exclusivamente para contas corporativas oficiais <strong className="text-emerald-400">@{ALLOWED_DOMAIN}</strong> da ION Sistemas.
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                sounds.playBlip();
                setBlockedEmail(null);
                setEmailInput('max.sena@ionsistemas.com.br');
              }}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Entrar com conta @{ALLOWED_DOMAIN}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#070b12] text-slate-100 flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Background ambient grid */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(circle at 50% 35%, rgba(59, 130, 246, 0.25) 0%, transparent 65%),
                            linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 48px 48px, 48px 48px'
        }}
      />

      <div className="w-full max-w-xl bg-[#090d16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col">
        {/* Top Header */}
        <div className="p-6 bg-slate-900/90 border-b border-slate-800 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>PORTAL RESTRITO // ION SISTEMAS</span>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            KubeCommander Arena
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Liberação do jogo exclusiva para quem estiver logado com e-mail <strong>@{ALLOWED_DOMAIN}</strong>
          </p>
        </div>

        {authStep === 'login' ? (
          /* STEP 1: LOGIN COM GOOGLE OU EMAIL CORPORATIVO */
          <div className="p-6 space-y-5">
            {/* Official Google Sign-In Area */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
              <div className="text-xs font-semibold text-slate-200">
                Autenticação Oficial Google Workspace
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm">
                Conecte-se com sua conta Google profissional da ION Sistemas para validar seu acesso ao cluster.
              </p>

              {/* GSI Button Container */}
              <div ref={googleBtnContainerRef} className="min-h-[44px] flex items-center justify-center" />

              {/* Custom Google-styled button fallback */}
              <button
                type="button"
                onClick={() => handleValidateEmail(emailInput, nameInput)}
                className="w-full max-w-xs py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs flex items-center justify-center gap-3 transition-colors shadow-md cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Entrar com Google (@{ALLOWED_DOMAIN})</span>
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] font-mono text-slate-500 uppercase">
                Ou confirme seus dados corporativos
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Manual Form */}
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Seu E-mail Corporativo
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder={`colaborador@${ALLOWED_DOMAIN}`}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>@{ALLOWED_DOMAIN}</span>
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nome do Operador
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="Nome e Sobrenome"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Validar e Prosseguir</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Test Security Button */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => handleSimulateExternalBlock('visitante@gmail.com')}
                className="text-[11px] font-mono text-slate-500 hover:text-red-400 underline transition-colors cursor-pointer"
              >
                Testar bloqueio com e-mail externo (ex: visitante@gmail.com)
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: ESCOLHER GUILDA E TIME (BLUE TEAM OU RED TEAM) */
          <div className="p-6 space-y-5">
            {/* Verified badge */}
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    Colaborador Verificado
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400">
                    {verifiedUser?.email}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setAuthStep('login')}
                className="text-[10px] font-mono text-slate-400 hover:text-white underline"
              >
                Alterar
              </button>
            </div>

            {/* Escolha de Guilda */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Selecione sua Guilda na ION Sistemas:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {INITIAL_GUILDS.map(guild => (
                  <button
                    type="button"
                    key={guild.id}
                    onClick={() => {
                      sounds.playBlip(500);
                      setSelectedGuildId(guild.id);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedGuildId === guild.id
                        ? 'bg-blue-950/60 border-blue-500 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{guild.logo}</span>
                      <span className="text-xs font-bold text-white truncate">{guild.name}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      [{guild.tag}] · {guild.members.length} membros
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Escolha de Time */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Papel de Combate no Cluster:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playBlip(550);
                    setSelectedTeam('blue');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedTeam === 'blue'
                      ? 'bg-blue-950/60 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 text-blue-400">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-bold text-white">🔵 Blue Team</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Aplica correções SRE, estanca OOMKilled, autoscale HPA e mantém 99.99% SLO.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playBlip(450);
                    setSelectedTeam('red');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedTeam === 'red'
                      ? 'bg-red-950/60 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 text-red-400">
                    <Flame className="w-4 h-4" />
                    <span className="text-xs font-bold text-white">🔴 Red Team</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Injeta falhas de memória, tráfego DDoS massivo e corrompe probes para testar a resiliência.
                  </p>
                </button>
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirmEntry}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <span>Liberar Jogo e Acessar o Cluster</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 text-center text-[11px] text-slate-500 font-mono">
          Ambiente restrito e auditado · ION Sistemas Telecom & Cloud
        </div>
      </div>
    </div>
  );
};
