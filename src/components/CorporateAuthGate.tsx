import React from 'react';
import QRCode from 'qrcode';
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
  QrCode, 
  Smartphone, 
  Clock, 
  Copy, 
  Check 
} from 'lucide-react';
import { 
  CorporateUser, 
  ALLOWED_DOMAIN, 
  isDomainAuthorized, 
  saveCorporateUser,
  parseJwtPayload 
} from '../utils/corporateAuth';
import { 
  generateBase32Secret, 
  buildOtpAuthUri, 
  verifyTotpCode 
} from '../utils/totp';
import { 
  dispatchEmailPin, 
  verifySubmittedPin 
} from '../utils/emailService';
import { TeamSide, INITIAL_GUILDS } from '../types/guild';
import { sounds } from '../utils/audio';

interface CorporateAuthGateProps {
  onAuthenticated: (user: CorporateUser, team: TeamSide, guildId: string) => void;
}

export const CorporateAuthGate: React.FC<CorporateAuthGateProps> = ({
  onAuthenticated,
}) => {
  // STRICT: Form fields start 100% empty!
  const [emailInput, setEmailInput] = React.useState('');
  const [nameInput, setNameInput] = React.useState('');
  const [selectedTeam, setSelectedTeam] = React.useState<TeamSide>('blue');
  const [selectedGuildId, setSelectedGuildId] = React.useState<string>(INITIAL_GUILDS[0].id);

  // 4 Security Stages:
  // 1. 'email' -> Inserir e-mail @ionsistemas.com.br
  // 2. 'email_pin' -> Validar PIN de 6 dígitos enviado por e-mail (SEM EXIBIÇÃO EM TELA)
  // 3. 'mfa_totp' -> Escanear QR Code com Google/MS Authenticator no celular e validar token
  // 4. 'guild_team' -> Selecionar guilda e time de batalha (Blue ou Red)
  const [stage, setStage] = React.useState<'email' | 'email_pin' | 'mfa_totp' | 'guild_team'>('email');

  // Stage 2: Email PIN state
  const [submittedPin, setSubmittedPin] = React.useState('');
  const [pinError, setPinError] = React.useState<string | null>(null);
  const [pinCooldown, setPinCooldown] = React.useState<number>(0);

  // Stage 3: MFA TOTP state
  const [totpSecret, setTotpSecret] = React.useState<string>('');
  const [totpInput, setTotpInput] = React.useState('');
  const [totpError, setTotpError] = React.useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = React.useState(false);
  const qrCanvasRef = React.useRef<HTMLCanvasElement>(null);

  // Access Denied full-screen state
  const [blockedEmail, setBlockedEmail] = React.useState<string | null>(null);
  const [verifiedUser, setVerifiedUser] = React.useState<CorporateUser | null>(null);

  const googleBtnContainerRef = React.useRef<HTMLDivElement>(null);

  // Cooldown countdown effect
  React.useEffect(() => {
    if (pinCooldown <= 0) return;
    const timer = setInterval(() => setPinCooldown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [pinCooldown]);

  // Render QR Code onto canvas when in mfa_totp stage
  React.useEffect(() => {
    if (stage === 'mfa_totp' && totpSecret && qrCanvasRef.current) {
      const uri = buildOtpAuthUri(emailInput, totpSecret, 'ION Sistemas');
      QRCode.toCanvas(qrCanvasRef.current, uri, {
        width: 190,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).catch(err => {
        console.warn('Erro ao desenhar QR Code:', err);
      });
    }
  }, [stage, totpSecret, emailInput]);

  // Google Identity Services Setup
  React.useEffect(() => {
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
                const clean = payload.email.trim().toLowerCase();
                if (!isDomainAuthorized(clean)) {
                  sounds.playAlert();
                  setBlockedEmail(clean);
                } else {
                  // Email valid via Google: proceed to Camada 2 (MFA TOTP)
                  sounds.playSuccess();
                  setEmailInput(clean);
                  setNameInput(payload.name || payload.given_name || clean.split('@')[0]);
                  
                  const secret = generateBase32Secret(16);
                  setTotpSecret(secret);
                  setStage('mfa_totp');
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
        // Fallback
      }
    }
  }, []);

  // STEP 1: Handle email submission & dispatch PIN
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail) return;

    // Strict Domain Enforcement
    if (!isDomainAuthorized(cleanEmail)) {
      sounds.playAlert();
      setBlockedEmail(cleanEmail);
      return;
    }

    sounds.playBlip(600);
    // Dispatch PIN to the user's corporate email inbox
    const res = dispatchEmailPin(cleanEmail);
    if (!res.success) {
      sounds.playAlert();
      setPinError(res.message);
      return;
    }

    // Set cooldown & proceed to PIN verification stage
    setPinCooldown(60);
    setSubmittedPin('');
    setPinError(null);
    setStage('email_pin');
  };

  // STEP 2: Handle submitted PIN from email
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = verifySubmittedPin(emailInput, submittedPin);

    if (!res.valid) {
      sounds.playAlert();
      setPinError(res.error || 'Código PIN inválido.');
      return;
    }

    // Camada 1 Aprovada! Prosseguir para Camada 2 (MFA TOTP com QR Code)
    sounds.playSuccess();
    setPinError(null);

    const secret = generateBase32Secret(16);
    setTotpSecret(secret);
    setTotpInput('');
    setTotpError(null);
    setStage('mfa_totp');
  };

  // STEP 3: Handle TOTP 6-digit code verification from mobile authenticator
  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await verifyTotpCode(totpSecret, totpInput);

    if (!isValid) {
      sounds.playAlert();
      setTotpError('Código do autenticador incorreto ou expirado. Verifique o relógio do seu celular e tente novamente.');
      return;
    }

    // Camada 2 Aprovada! 2FA / MFA Concluído com Sucesso!
    sounds.playSuccess();
    setTotpError(null);

    const cleanEmail = emailInput.trim().toLowerCase();
    const user: CorporateUser = {
      email: cleanEmail,
      name: nameInput.trim() || cleanEmail.split('@')[0].replace('.', ' '),
      domain: ALLOWED_DOMAIN,
      role: 'SRE Specialist',
      picture: '👨‍💻',
    };

    setVerifiedUser(user);
    setStage('guild_team');
  };

  // STEP 4: Confirm guild & combat team, and release cluster
  const handleFinalizeLogin = () => {
    if (!verifiedUser) return;
    sounds.playSuccess();
    saveCorporateUser(verifiedUser);
    onAuthenticated(verifiedUser, selectedTeam, selectedGuildId);
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
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
              Motivo do bloqueio: <span className="text-amber-400">Domínio não autorizado.</span>
            </div>
            <div className="text-slate-400 text-[11px] pt-2 border-t border-red-900/40">
              O simulador Kubernetes e a arena de guildas são restritos exclusivamente a colaboradores com e-mail institucional <strong className="text-emerald-400">@{ALLOWED_DOMAIN}</strong> da ION Sistemas.
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
        {/* Top Header */}
        <div className="p-6 bg-slate-900/90 border-b border-slate-800 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>ACESSO RESTRITO 2FA/MFA // ION SISTEMAS</span>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            KubeCommander Arena
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Autenticação em 2 camadas de segurança: PIN por e-mail corporativo + MFA no celular
          </p>

          {/* Stepper indicator */}
          <div className="flex items-center justify-center gap-2 mt-4 text-[10px] font-mono">
            <span className={`px-2 py-0.5 rounded ${stage === 'email' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}>
              1. E-mail
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded ${stage === 'email_pin' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}>
              2. PIN no E-mail
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded ${stage === 'mfa_totp' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}>
              3. MFA QR Code
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded ${stage === 'guild_team' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}>
              4. Guilda
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STAGE 1: ENTER CORPORATE EMAIL                                            */}
        {/* ========================================================================= */}
        {stage === 'email' && (
          <div className="p-6 space-y-5">
            {/* Google Workspace Area */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="text-xs font-semibold text-slate-200">
                Acesso com Google Workspace
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm">
                Entre com sua conta Google profissional da ION Sistemas.
              </p>
              <div ref={googleBtnContainerRef} className="min-h-[44px] flex items-center justify-center" />
              <div className="text-[10px] font-mono text-slate-500">
                Obrigatório domínio: <span className="text-blue-400">@{ALLOWED_DOMAIN}</span>
              </div>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] font-mono text-slate-500 uppercase">
                Ou acesse com e-mail corporativo
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Manual Form (Starts 100% EMPTY) */}
            <form onSubmit={handleEmailSubmit} className="space-y-4">
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
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nome do Ionizador / Operador
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="Nome e Sobrenome"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={!emailInput.trim()}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Enviar PIN para meu E-mail Corporativo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 2: VERIFY EMAIL PIN (CONFIDENTIAL - NEVER DISPLAYED ON SCREEN)       */}
        {/* ========================================================================= */}
        {stage === 'email_pin' && (
          <div className="p-6 space-y-5">
            {/* Confidential Email Notice */}
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
                  Por razões de segurança corporativa, o código <strong>NÃO</strong> é exibido nesta tela. Acesse sua caixa de entrada no webmail da ION Sistemas para visualizá-lo.
                </div>
              </div>
            </div>

            {pinError && (
              <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-xs text-red-200">
                {pinError}
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Digite o PIN de 6 dígitos recebido no e-mail:
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
                  disabled={pinCooldown > 0}
                  onClick={() => {
                    dispatchEmailPin(emailInput);
                    setPinCooldown(60);
                    sounds.playBlip();
                  }}
                  className="text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-not-allowed font-semibold text-[11px] underline"
                >
                  {pinCooldown > 0 ? `Reenviar em ${pinCooldown}s` : 'Reenviar PIN para o e-mail'}
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playBlip();
                    setStage('email');
                  }}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  disabled={submittedPin.length < 6}
                  className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span>Validar PIN e Ir para MFA</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 3: CAMADA 2 - MFA TOTP COM QR CODE (GOOGLE/MS AUTHENTICATOR)        */}
        {/* ========================================================================= */}
        {stage === 'mfa_totp' && (
          <div className="p-6 space-y-5">
            {/* Header info */}
            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/60 flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <div className="font-bold text-white mb-0.5">
                  Camada 2: Autenticação Multifator (MFA TOTP)
                </div>
                <div className="text-slate-300">
                  Abra o <strong>Google Authenticator</strong> ou <strong>Microsoft Authenticator</strong> no seu celular e escaneie o QR Code abaixo.
                </div>
              </div>
            </div>

            {/* QR Code Canvas */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl max-w-[220px] mx-auto shadow-xl">
              <canvas ref={qrCanvasRef} className="rounded-lg" />
              <span className="text-[10px] font-mono font-bold text-slate-800 mt-1 uppercase tracking-wider">
                ION Sistemas MFA
              </span>
            </div>

            {/* Manual Secret Key */}
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="overflow-hidden">
                <span className="text-slate-500 text-[10px] block">Chave manual para o aplicativo:</span>
                <span className="text-purple-300 font-bold tracking-wider">{totpSecret}</span>
              </div>
              <button
                type="button"
                onClick={handleCopySecret}
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Copiar Chave"
              >
                {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {totpError && (
              <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-xs text-red-200">
                {totpError}
              </div>
            )}

            {/* TOTP 6-Digit Form */}
            <form onSubmit={handleTotpSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Digite o código de 6 dígitos gerado no app do celular:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={totpInput}
                  onChange={e => setTotpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-widest px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xl font-mono text-white focus:outline-none focus:border-purple-500 placeholder-slate-700"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playBlip();
                    setStage('email_pin');
                  }}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  disabled={totpInput.length < 6}
                  className="w-2/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span>Validar MFA e Concluir</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 4: SELECT GUILD & COMBAT TEAM                                       */}
        {/* ========================================================================= */}
        {stage === 'guild_team' && (
          <div className="p-6 space-y-5">
            {/* 2FA Verified Badge */}
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{verifiedUser?.name}</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800 font-bold">
                      2FA / MFA ATIVO
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
                  setStage('email');
                  setEmailInput('');
                  setNameInput('');
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

            {/* Combat Team Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Escolha seu Papel de Batalha:
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
              onClick={handleFinalizeLogin}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <span>Liberar Acesso e Ingressar no Cluster</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 text-center text-[11px] text-slate-500 font-mono">
          Ambiente corporativo restrito e protegido · ION Sistemas Telecom & Cloud
        </div>
      </div>
    </div>
  );
};
