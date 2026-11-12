import React from 'react';
import { 
  AlertOctagon, 
  Lock, 
  Flame, 
  Shield, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck,
  CheckCircle2,
  Mail,
  Clock,
  UserCheck,
  Building2,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { 
  CorporateUser, 
  ALLOWED_DOMAIN, 
  isDomainAuthorized 
} from '../utils/corporateAuth';
import { 
  dispatchEmailPin, 
  verifySubmittedPin 
} from '../utils/emailService';
import { CorporateWebmailModal } from './CorporateWebmailModal';
import { TeamSide, INITIAL_GUILDS } from '../types/guild';
import { sounds } from '../utils/audio';

interface CorporateAuthGateProps {
  onGoogleOidcSuccess: (user: CorporateUser, team: TeamSide, guildId: string) => void;
  onAuthenticated?: (user: CorporateUser, team: TeamSide, guildId: string) => void;
}

export const CorporateAuthGate: React.FC<CorporateAuthGateProps> = ({
  onGoogleOidcSuccess,
  onAuthenticated,
}) => {
  // Stages:
  // 1. 'email' -> Colaborador insere seu e-mail institucional @ionsistemas.com.br
  // 2. 'email_pin' -> Valida o PIN de 6 dígitos confidencial enviado ao e-mail
  // (Após validar o PIN, App.tsx aciona automaticamente o MfaSetupModal com o QR Code para o celular do colaborador)
  const [stage, setStage] = React.useState<'email' | 'email_pin'>('email');

  // Collaborator Email & Name inputs (Empty by default for each employee)
  const [emailInput, setEmailInput] = React.useState<string>('max.sena@ionsistemas.com.br');
  const [nameInput, setNameInput] = React.useState<string>('Max Sena');

  // PIN validation state
  const [submittedPin, setSubmittedPin] = React.useState<string>('');
  const [pinError, setPinError] = React.useState<string | null>(null);
  const [pinCooldown, setPinCooldown] = React.useState<number>(0);
  const [isSendingPin, setIsSendingPin] = React.useState<boolean>(false);
  const [isVerifyingPin, setIsVerifyingPin] = React.useState<boolean>(false);

  // Webmail Modal state
  const [isWebmailOpen, setIsWebmailOpen] = React.useState<boolean>(false);

  // Guild & Team state
  const [selectedTeam, setSelectedTeam] = React.useState<TeamSide>('blue');
  const [selectedGuildId, setSelectedGuildId] = React.useState<string>(INITIAL_GUILDS[0].id);

  // Access Denied state for external/unauthorized domains
  const [blockedEmail, setBlockedEmail] = React.useState<string | null>(null);

  // Cooldown countdown effect
  React.useEffect(() => {
    if (pinCooldown <= 0) return;
    const timer = setInterval(() => setPinCooldown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [pinCooldown]);

  // STEP 1: Handle dispatching confidential PIN to collaborator's @ionsistemas.com.br inbox
  const handleSendPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail) return;

    // Strict Domain Enforcement: Only @ionsistemas.com.br allowed
    if (!isDomainAuthorized(cleanEmail)) {
      sounds.playAlert();
      setBlockedEmail(cleanEmail);
      return;
    }

    sounds.playBlip(600);
    setIsSendingPin(true);
    setPinError(null);

    try {
      const res = await dispatchEmailPin(cleanEmail);
      if (!res.success) {
        sounds.playAlert();
        setPinError(res.message);
        return;
      }

      setPinCooldown(60);
      setSubmittedPin('');
      setPinError(null);
      setStage('email_pin');
    } catch {
      sounds.playAlert();
      setPinError('Erro ao despachar o PIN de segurança para o e-mail corporativo.');
    } finally {
      setIsSendingPin(false);
    }
  };

  // STEP 2: Validate 6-digit PIN submitted by collaborator
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittedPin || submittedPin.length < 6) return;

    setIsVerifyingPin(true);
    setPinError(null);

    try {
      const res = await verifySubmittedPin(emailInput, submittedPin);

      if (!res.valid) {
        sounds.playAlert();
        setPinError(res.error || 'Código PIN inválido.');
        return;
      }

      // Layer 1 (Email PIN) APPROVED!
      sounds.playSuccess();
      setPinError(null);

      const cleanEmail = emailInput.trim().toLowerCase();
      const collaboratorUser: CorporateUser = {
        email: cleanEmail,
        name: nameInput.trim() || cleanEmail.split('@')[0].replace('.', ' '),
        domain: ALLOWED_DOMAIN,
        role: 'SRE Specialist',
        picture: '👨‍💻',
        mfaVerified: false, // Will be verified in App.tsx via MfaSetupModal
      };

      // Notify App.tsx to immediately trigger Layer 2: MfaSetupModal!
      const callback = onGoogleOidcSuccess || onAuthenticated;
      if (callback) {
        callback(collaboratorUser, selectedTeam, selectedGuildId);
      }
    } catch {
      sounds.playAlert();
      setPinError('Falha ao validar o código PIN.');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Test simulation for unauthorized external account (verifies domain defense)
  const handleSimulateBlockedDomain = () => {
    sounds.playAlert();
    setBlockedEmail('invasor@gmail.com');
  };

  // FULL-SCREEN RED ACCESS BLOCKED SCREEN FOR UNAUTHORIZED DOMAINS
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
              Motivo do bloqueio: <span className="text-amber-400">Domínio externo não autorizado.</span>
            </div>
            <div className="text-slate-400 text-[11px] pt-2 border-t border-red-900/40">
              O cluster Kubernetes e a arena de operações são restritos exclusivamente a colaboradores com e-mail institucional <strong className="text-emerald-400">@{ALLOWED_DOMAIN}</strong> da ION Sistemas.
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
        {/* Top Header */}
        <div className="p-6 bg-slate-900/90 border-b border-slate-800 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>PORTAL DO COLABORADOR // ION SISTEMAS</span>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            KubeCommander Arena
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Autenticação Corporativa Individual de 2 Fatores: PIN por E-mail + MFA TOTP no Celular
          </p>

          {/* Stepper indicator */}
          <div className="flex items-center justify-center gap-2 mt-4 text-[10px] font-mono">
            <span className={`px-2 py-0.5 rounded ${stage === 'email' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}>
              1. E-mail Institucional
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded ${stage === 'email_pin' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}>
              2. PIN no E-mail
            </span>
            <span className="text-slate-600">→</span>
            <span className="px-2 py-0.5 rounded bg-purple-600/30 text-purple-300 border border-purple-500/40">
              3. MFA QR Code (App.tsx)
            </span>
            <span className="text-slate-600">→</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              4. Cluster Liberado
            </span>
          </div>
        </div>

        {/* STAGE 1: COLLABORATOR ENTERS THEIR PERSONAL @ionsistemas.com.br EMAIL */}
        {stage === 'email' && (
          <div className="p-6 space-y-5">
            {/* Domain Policy Notice */}
            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <div className="font-bold text-white mb-0.5 flex items-center gap-2">
                  <span>Acesso Exclusivo a Colaboradores ION Sistemas</span>
                  <span className="text-[10px] font-mono bg-blue-950 text-blue-300 px-2 py-0.2 rounded border border-blue-700">
                    @{ALLOWED_DOMAIN}
                  </span>
                </div>
                <div className="text-slate-300">
                  Cada colaborador deve autenticar com o seu próprio e-mail institucional. O código PIN de 6 dígitos será despachado de forma confidencial para a sua caixa de entrada corporativa.
                </div>
              </div>
            </div>

            {/* Quick collaborator presets */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1.5 uppercase tracking-wider">
                Operadores em Plantão / Acesso Rápido:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playBlip(500);
                    setEmailInput('max.sena@ionsistemas.com.br');
                    setNameInput('Max Sena');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    emailInput === 'max.sena@ionsistemas.com.br'
                      ? 'bg-blue-950/80 border-blue-500 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white flex items-center justify-between mb-0.5">
                    <span>Max Sena</span>
                    <span className="text-[9px] font-mono bg-blue-900 text-blue-300 px-1.5 py-0.2 rounded">
                      Lead SRE
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    max.sena@{ALLOWED_DOMAIN}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playBlip(500);
                    setEmailInput('sre.operator@ionsistemas.com.br');
                    setNameInput('Operador SRE');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    emailInput === 'sre.operator@ionsistemas.com.br'
                      ? 'bg-blue-950/80 border-blue-500 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white flex items-center justify-between mb-0.5">
                    <span>Operador SRE</span>
                    <span className="text-[9px] font-mono bg-purple-900 text-purple-300 px-1.5 py-0.2 rounded">
                      On-Call
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    sre.operator@{ALLOWED_DOMAIN}
                  </div>
                </button>
              </div>
            </div>

            {/* Form for any collaborator */}
            <form onSubmit={handleSendPin} className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Seu E-mail Institucional (@{ALLOWED_DOMAIN}):
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder={`seu.nome@${ALLOWED_DOMAIN}`}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nome do Colaborador / Ionizador:
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

              {/* Guild & Team Selection */}
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                {/* Guild Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Sua Guilda na ION Sistemas:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {INITIAL_GUILDS.map(guild => (
                      <button
                        type="button"
                        key={guild.id}
                        onClick={() => {
                          sounds.playBlip(500);
                          setSelectedGuildId(guild.id);
                        }}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedGuildId === guild.id
                            ? 'bg-blue-950/60 border-blue-500 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm">{guild.logo}</span>
                          <span className="text-xs font-bold text-white truncate">{guild.name}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          [{guild.tag}] · {guild.members.length} membros
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Combat Team Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Seu Papel de Combate na Arena:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playBlip(550);
                        setSelectedTeam('blue');
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedTeam === 'blue'
                          ? 'bg-blue-950/60 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5 text-blue-400">
                        <Shield className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold text-white">🔵 Blue Team</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Mitiga OOMKilled, escala pods e protege o cluster.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        sounds.playBlip(450);
                        setSelectedTeam('red');
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedTeam === 'red'
                          ? 'bg-red-950/60 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5 text-red-400">
                        <Flame className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold text-white">🔴 Red Team</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Injeta ataques DDoS e falhas de resiliência.
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!emailInput.trim() || isSendingPin}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
              >
                {isSendingPin ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Despachando PIN de Segurança...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Enviar PIN para meu E-mail Corporativo</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Domain defense test simulation */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono px-1">
              <span>Auditoria de Domínio:</span>
              <button
                type="button"
                onClick={handleSimulateBlockedDomain}
                className="text-slate-500 hover:text-amber-400 underline cursor-pointer"
                title="Testar barreira de segurança tentando login com conta externa @gmail.com"
              >
                Simular rejeição (@gmail.com)
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: VALIDATE 6-DIGIT EMAIL PIN (CONFIDENTIAL) */}
        {stage === 'email_pin' && (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <div className="font-bold text-white mb-1">
                  Camada 1: PIN Confidencial Enviado por E-mail
                </div>
                <div className="text-slate-300">
                  Um código PIN de 6 dígitos foi enviado para <strong className="text-emerald-400 font-mono">{emailInput}</strong>.
                </div>
                <div className="text-slate-400 text-[11px] mt-1">
                  Por segurança corporativa, acesse a sua caixa de entrada no webmail da ION Sistemas para visualizá-lo.
                </div>
              </div>
            </div>

            {/* Direct Webmail Corporate Inbox Access Box */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/80 via-indigo-950/60 to-slate-900 border border-blue-500/50 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-200 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-blue-400" />
                  Webmail Corporativo ION Sistemas
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded">
                  Inbox Conectado
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Caso o seu aplicativo de e-mail corporativo tenha demora de entrega ou filtros de spam, abra a caixa de entrada oficial abaixo para visualizar o e-mail recebido e preencher automaticamente.
              </p>
              <button
                type="button"
                onClick={() => {
                  sounds.playBlip(600);
                  setIsWebmailOpen(true);
                }}
                className="w-full py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
              >
                <Mail className="w-4 h-4" />
                <span>📬 Abrir Caixa de Entrada (Ver E-mail com PIN)</span>
              </button>
            </div>

            {pinError && (
              <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-xs text-red-200">
                {pinError}
              </div>
            )}

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Digite o PIN de 6 dígitos recebido no seu e-mail:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={submittedPin}
                  onChange={e => setSubmittedPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="______"
                  className="w-full text-center tracking-widest px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xl font-mono text-white focus:outline-none focus:border-blue-500 placeholder-slate-700"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Válido por 10 minutos</span>
                </span>

                <button
                  type="button"
                  disabled={pinCooldown > 0 || isSendingPin}
                  onClick={async () => {
                    setIsSendingPin(true);
                    try {
                      await dispatchEmailPin(emailInput);
                      setPinCooldown(60);
                      sounds.playBlip();
                    } finally {
                      setIsSendingPin(false);
                    }
                  }}
                  className="text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-not-allowed font-semibold text-[11px] underline flex items-center gap-1"
                >
                  {isSendingPin && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>{pinCooldown > 0 ? `Reenviar em ${pinCooldown}s` : 'Reenviar PIN para o e-mail'}</span>
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playBlip();
                    setStage('email');
                  }}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  disabled={submittedPin.length < 6 || isVerifyingPin}
                  className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {isVerifyingPin ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validando PIN...</span>
                    </>
                  ) : (
                    <>
                      <span>Validar PIN e Ir para MFA</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 text-center text-[11px] text-slate-500 font-mono">
          Portal do Colaborador · Domínio Restrito @{ALLOWED_DOMAIN} · Camada 2 MFA Obrigatória no App.tsx
        </div>
      </div>

      {/* CORPORATE WEBMAIL INBOX VIEWER MODAL */}
      <CorporateWebmailModal
        isOpen={isWebmailOpen}
        email={emailInput}
        onClose={() => setIsWebmailOpen(false)}
        onApplyPin={(pin) => {
          setSubmittedPin(pin);
          setPinError(null);
        }}
      />
    </div>
  );
};
