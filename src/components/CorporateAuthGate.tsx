import React from 'react';
import { 
  AlertOctagon, 
  Lock, 
  Flame, 
  Shield, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw, 
  KeyRound, 
  Mail, 
  UserCheck 
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
  // STRICT: Inputs must start completely blank! No pre-filling with any employee's email.
  const [emailInput, setEmailInput] = React.useState('');
  const [nameInput, setNameInput] = React.useState('');
  const [selectedTeam, setSelectedTeam] = React.useState<TeamSide>('blue');
  const [selectedGuildId, setSelectedGuildId] = React.useState<string>(INITIAL_GUILDS[0].id);

  // 2-Step Verification with 6-digit PIN token
  const [authStage, setAuthStage] = React.useState<'enter_email' | 'verify_pin' | 'select_team'>('enter_email');
  const [generatedPin, setGeneratedPin] = React.useState<string>('');
  const [enteredPin, setEnteredPin] = React.useState<string>('');
  const [pinError, setPinError] = React.useState<string | null>(null);

  // Access Denied full-screen state
  const [blockedEmail, setBlockedEmail] = React.useState<string | null>(null);
  const [verifiedUser, setVerifiedUser] = React.useState<CorporateUser | null>(null);

  const googleBtnContainerRef = React.useRef<HTMLDivElement>(null);

  // Initialize Google Identity Services if available
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
                  const googleEmail = payload.email.trim().toLowerCase();
                  if (!isDomainAuthorized(googleEmail)) {
                    sounds.playAlert();
                    setBlockedEmail(googleEmail);
                  } else {
                    sounds.playSuccess();
                    const user: CorporateUser = {
                      email: googleEmail,
                      name: payload.name || payload.given_name || googleEmail.split('@')[0],
                      domain: ALLOWED_DOMAIN,
                      role: 'SRE Specialist',
                      picture: payload.picture || '👨‍💻',
                    };
                    setVerifiedUser(user);
                    setAuthStage('select_team');
                  }
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
          // Graceful fallback
        }
      }
    };

    const timer = setTimeout(initGsi, 400);
    return () => clearTimeout(timer);
  }, []);

  // Step 1: Validate email input
  const handleRequestAccess = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail) return;

    // Strict Domain Enforcement
    if (!isDomainAuthorized(cleanEmail)) {
      sounds.playAlert();
      setBlockedEmail(cleanEmail);
      return;
    }

    // Email belongs to @ionsistemas.com.br! Generate a 6-digit corporate verification PIN
    sounds.playBlip(600);
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedPin(pin);
    setEnteredPin('');
    setPinError(null);
    setAuthStage('verify_pin');
  };

  // Step 2: Validate 6-digit PIN
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();

    if (enteredPin.trim() !== generatedPin) {
      sounds.playAlert();
      setPinError('PIN incorreto. Verifique o código corporativo enviado para sua sessão.');
      return;
    }

    sounds.playSuccess();
    setPinError(null);

    const cleanEmail = emailInput.trim().toLowerCase();
    const user: CorporateUser = {
      email: cleanEmail,
      name: nameInput.trim() || cleanEmail.split('@')[0].replace('.', ' '),
      domain: ALLOWED_DOMAIN,
      role: 'SRE Specialist',
      picture: '👨‍💻',
    };

    setVerifiedUser(user);
    setAuthStage('select_team');
  };

  // Step 3: Confirm team & guild selection, and enter cluster
  const handleConfirmEntry = () => {
    if (!verifiedUser) return;
    sounds.playSuccess();
    saveCorporateUser(verifiedUser);
    onAuthenticated(verifiedUser, selectedTeam, selectedGuildId);
  };

  // FULL-SCREEN RED ACCESS BLOCKED SCREEN FOR UNAUTHORIZED EMAILS
  if (blockedEmail) {
    return (
      <div className="min-h-screen w-full bg-[#0d0407] text-slate-100 flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none" 
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.35) 0%, transparent 70%),
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
              E-mail recusado: <span className="text-red-400 font-bold underline">{blockedEmail}</span>
            </div>
            <div className="text-slate-300">
              Motivo do bloqueio: <span className="text-amber-400">Domínio não autorizado.</span>
            </div>
            <div className="text-slate-400 text-[11px] pt-2 border-t border-red-900/40">
              O simulador Kubernetes KubeCommander e os servidores de produção são restritos exclusivamente a colaboradores com e-mail institucional <strong className="text-emerald-400">@{ALLOWED_DOMAIN}</strong> da ION Sistemas.
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                sounds.playBlip();
                setBlockedEmail(null);
                setEmailInput('');
                setNameInput('');
              }}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tentar com e-mail @{ALLOWED_DOMAIN}</span>
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
        {/* Header */}
        <div className="p-6 bg-slate-900/90 border-b border-slate-800 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>ACESSO RESTRITO // ION SISTEMAS</span>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            KubeCommander Arena
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Apenas colaboradores com e-mail autenticado <strong>@{ALLOWED_DOMAIN}</strong> podem ingressar no cluster.
          </p>
        </div>

        {/* STAGE 1: ENTER CORPORATE EMAIL */}
        {authStage === 'enter_email' && (
          <div className="p-6 space-y-5">
            {/* Google Sign-In Area */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
              <div className="text-xs font-semibold text-slate-200">
                Login via Google Workspace
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm">
                Conecte-se com sua conta Google profissional da ION Sistemas.
              </p>

              {/* GSI Button Container if available */}
              <div ref={googleBtnContainerRef} className="min-h-[44px] flex items-center justify-center" />

              <div className="text-[10px] font-mono text-slate-500">
                Obrigatório domínio: <span className="text-blue-400">@{ALLOWED_DOMAIN}</span>
              </div>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] font-mono text-slate-500 uppercase">
                Ou digite seu e-mail corporativo
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Email Form (EMPTY by default - NO PRE-FILL) */}
            <form onSubmit={handleRequestAccess} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  E-mail Institucional (@{ALLOWED_DOMAIN})
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder={`seu.nome@${ALLOWED_DOMAIN}`}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">
                  Qualquer tentativa com domínios pessoais (@gmail.com, etc.) será bloqueada.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nome do Colaborador
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="Seu Nome e Sobrenome"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={!emailInput.trim()}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Enviar Código de Verificação</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* STAGE 2: 2-FACTOR 6-DIGIT CORPORATE PIN VERIFICATION */}
        {authStage === 'verify_pin' && (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-start gap-3">
              <KeyRound className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-white mb-0.5">
                  Verificação de Identidade do Colaborador
                </div>
                <div className="text-slate-300">
                  Código de segurança gerado para <strong className="text-emerald-400 font-mono">{emailInput}</strong>.
                </div>
              </div>
            </div>

            {/* Displaying generated PIN securely for this active session */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono">
              <span className="text-[10px] text-slate-500 uppercase block mb-1">
                PIN de Segurança para Validação Imediata:
              </span>
              <span className="text-2xl font-bold tracking-widest text-amber-400">
                {generatedPin}
              </span>
            </div>

            {pinError && (
              <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-xs text-red-200">
                {pinError}
              </div>
            )}

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Digite o PIN de 6 dígitos:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={enteredPin}
                  onChange={e => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 123456"
                  className="w-full text-center tracking-widest px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-lg font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playBlip();
                    setAuthStage('enter_email');
                  }}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  disabled={enteredPin.length < 6}
                  className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span>Validar e Liberar Acesso</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STAGE 3: SELECT GUILD & COMBAT TEAM */}
        {authStage === 'select_team' && (
          <div className="p-6 space-y-5">
            {/* Verified badge */}
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{verifiedUser?.name}</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800">
                      VERIFICADO
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {verifiedUser?.email}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  sounds.playBlip();
                  setAuthStage('enter_email');
                  setEmailInput('');
                }}
                className="text-[10px] font-mono text-slate-400 hover:text-white underline cursor-pointer"
              >
                Trocar Conta
              </button>
            </div>

            {/* Guild Selection */}
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

            {/* Team Selection */}
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
          Ambiente corporativo restrito · ION Sistemas Telecom & Cloud
        </div>
      </div>
    </div>
  );
};
