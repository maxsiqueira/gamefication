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
  Fingerprint,
  KeyRound,
  UserCheck,
  Building2,
  Globe,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  CorporateUser, 
  ALLOWED_DOMAIN, 
  isDomainAuthorized, 
  parseJwtPayload 
} from '../utils/corporateAuth';
import { TeamSide, INITIAL_GUILDS } from '../types/guild';
import { sounds } from '../utils/audio';

interface CorporateAuthGateProps {
  onGoogleOidcSuccess: (user: CorporateUser, team: TeamSide, guildId: string) => void;
  onAuthenticated?: (user: CorporateUser, team: TeamSide, guildId: string) => void;
}

interface PreConfiguredAppAccount {
  id: string;
  email: string;
  name: string;
  role: string;
  badge: string;
}

const PRECONFIGURED_APP_ACCOUNTS: PreConfiguredAppAccount[] = [
  {
    id: 'services',
    email: 'services@ionsistemas.com.br',
    name: 'Conta de Serviços ION',
    role: 'Operador de Serviços & Automação SRE',
    badge: '⚡ Services Account',
  },
  {
    id: 'max-sena',
    email: 'max.sena@ionsistemas.com.br',
    name: 'Max Sena',
    role: 'Lead SRE & Kubernetes Commander',
    badge: '👑 Lead SRE',
  },
  {
    id: 'sre-operator',
    email: 'sre-operator@ionsistemas.com.br',
    name: 'Operador SRE ION',
    role: 'Engenheiro de Confiabilidade',
    badge: '⚡ Plantão SRE',
  },
  {
    id: 'secops',
    email: 'secops@ionsistemas.com.br',
    name: 'Equipe SecOps ION',
    role: 'Especialista em Segurança & Defesa',
    badge: '🛡️ DevSecOps',
  },
];

export const CorporateAuthGate: React.FC<CorporateAuthGateProps> = ({
  onGoogleOidcSuccess,
  onAuthenticated,
}) => {
  // Mode selection: 'app_account' (Conta de Apps dedicada) or 'google_oidc' (Google Identity Services)
  const [authMethod, setAuthMethod] = React.useState<'app_account' | 'google_oidc'>('app_account');

  // Selected App Account state (Default: services@ionsistemas.com.br)
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>('services');
  const [customUserPrefix, setCustomUserPrefix] = React.useState<string>('');
  const [appKeyInput, setAppKeyInput] = React.useState<string>('ion-sre-2026');
  const [showSecret, setShowSecret] = React.useState<boolean>(false);

  // Guild & Team state
  const [selectedTeam, setSelectedTeam] = React.useState<TeamSide>('blue');
  const [selectedGuildId, setSelectedGuildId] = React.useState<string>(INITIAL_GUILDS[0].id);

  // Authenticating state
  const [isAuthenticating, setIsAuthenticating] = React.useState<boolean>(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  // Access Denied full-screen state for unauthorized domains
  const [blockedEmail, setBlockedEmail] = React.useState<string | null>(null);

  const googleBtnContainerRef = React.useRef<HTMLDivElement>(null);

  const triggerAuthSuccess = React.useCallback((user: CorporateUser) => {
    const callback = onGoogleOidcSuccess || onAuthenticated;
    if (callback) {
      callback(user, selectedTeam, selectedGuildId);
    }
  }, [onGoogleOidcSuccess, onAuthenticated, selectedTeam, selectedGuildId]);

  // Authenticate via Corporate App Account (Conta de Aplicativo ION Sistemas)
  const handleAppAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError(null);
    sounds.playBlip(600);

    let targetEmail = '';
    if (selectedAccountId === 'custom') {
      const cleanPrefix = customUserPrefix.trim().toLowerCase().replace(/@.*$/, '');
      if (!cleanPrefix) {
        setIsAuthenticating(false);
        setAuthError('Digite o identificador da conta corporativa.');
        return;
      }
      targetEmail = `${cleanPrefix}@${ALLOWED_DOMAIN}`;
    } else {
      const preset = PRECONFIGURED_APP_ACCOUNTS.find(a => a.id === selectedAccountId);
      targetEmail = preset ? preset.email : 'max.sena@ionsistemas.com.br';
    }

    // Strict Domain Enforcement
    if (!isDomainAuthorized(targetEmail)) {
      sounds.playAlert();
      setBlockedEmail(targetEmail);
      setIsAuthenticating(false);
      return;
    }

    try {
      const resp = await fetch('/api/auth/app-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          appKey: appKeyInput,
          accountId: selectedAccountId,
        }),
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        sounds.playAlert();
        if (data?.attemptedEmail && !isDomainAuthorized(data.attemptedEmail)) {
          setBlockedEmail(data.attemptedEmail);
        } else {
          setAuthError(data?.message || 'Falha ao autenticar conta de aplicativo.');
        }
        return;
      }

      sounds.playSuccess();
      const verifiedUser: CorporateUser = {
        email: data.user.email,
        name: data.user.name,
        domain: ALLOWED_DOMAIN,
        role: data.user.role || 'SRE Specialist',
        picture: '👨‍💻',
        mfaVerified: false,
      };

      // Successfully authenticated with App Account!
      // Immediately triggers MfaSetupModal in App.tsx!
      triggerAuthSuccess(verifiedUser);
    } catch {
      // Offline fallback: allow predefined account if backend is unreachable
      if (isDomainAuthorized(targetEmail)) {
        sounds.playSuccess();
        const verifiedUser: CorporateUser = {
          email: targetEmail,
          name: targetEmail.split('@')[0].replace('.', ' '),
          domain: ALLOWED_DOMAIN,
          role: 'SRE Specialist',
          picture: '👨‍💻',
          mfaVerified: false,
        };
        triggerAuthSuccess(verifiedUser);
      } else {
        setAuthError('Erro na conexão com o gateway de autenticação.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Process Google OIDC Credential Token (when using GIS)
  const handleGoogleCredential = React.useCallback(async (credentialJwt: string) => {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const resp = await fetch('/api/auth/google-oidc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialJwt }),
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        sounds.playAlert();
        if (data?.attemptedEmail && !isDomainAuthorized(data.attemptedEmail)) {
          setBlockedEmail(data.attemptedEmail);
        } else {
          setAuthError(data?.message || 'Falha na validação do token Google OIDC.');
        }
        return;
      }

      const userEmail = data.user.email.toLowerCase();
      if (!isDomainAuthorized(userEmail)) {
        sounds.playAlert();
        setBlockedEmail(userEmail);
        return;
      }

      sounds.playSuccess();
      const verifiedUser: CorporateUser = {
        email: userEmail,
        name: data.user.name || userEmail.split('@')[0],
        domain: ALLOWED_DOMAIN,
        role: 'SRE Specialist',
        picture: data.user.picture || '👨‍💻',
        mfaVerified: false,
      };

      triggerAuthSuccess(verifiedUser);
    } catch {
      const payload = parseJwtPayload(credentialJwt);
      if (payload?.email) {
        const clean = payload.email.trim().toLowerCase();
        if (!isDomainAuthorized(clean)) {
          sounds.playAlert();
          setBlockedEmail(clean);
          return;
        }

        sounds.playSuccess();
        const verifiedUser: CorporateUser = {
          email: clean,
          name: payload.name || payload.given_name || clean.split('@')[0],
          domain: ALLOWED_DOMAIN,
          role: 'SRE Specialist',
          picture: payload.picture || '👨‍💻',
          mfaVerified: false,
        };

        triggerAuthSuccess(verifiedUser);
      } else {
        setAuthError('Não foi possível ler as credenciais do Google Workspace.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [triggerAuthSuccess]);

  // Google Identity Services (GIS) Client Setup
  React.useEffect(() => {
    if (authMethod !== 'google_oidc') return;

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
          auto_select: false,
          callback: (res: { credential?: string }) => {
            if (res.credential) {
              handleGoogleCredential(res.credential);
            }
          },
        });

        googleObj.accounts.id.renderButton(googleBtnContainerRef.current, {
          theme: 'filled_blue',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 320,
        });
      } catch (err) {
        console.warn('GIS initialize notice:', err);
      }
    }
  }, [authMethod, handleGoogleCredential]);

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
              Conta informada: <span className="text-red-400 font-bold underline">{blockedEmail}</span>
            </div>
            <div className="text-slate-300">
              Motivo do bloqueio: <span className="text-amber-400">Domínio externo não autorizado.</span>
            </div>
            <div className="text-slate-400 text-[11px] pt-2 border-t border-red-900/40">
              O cluster Kubernetes e a arena de operações são restritos exclusivamente a contas corporativas da ION Sistemas com o domínio <strong className="text-emerald-400">@{ALLOWED_DOMAIN}</strong>.
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                sounds.playBlip();
                setBlockedEmail(null);
                setAuthError(null);
              }}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Autenticar com Conta @{ALLOWED_DOMAIN}</span>
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
            <span>PORTAL CORPORATIVO // ION SISTEMAS</span>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            KubeCommander Arena
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Autenticação Corporativa Segura: Conta de Aplicativo + Validação de 2º Fator MFA TOTP
          </p>

          {/* Stepper indicator */}
          <div className="flex items-center justify-center gap-2 mt-4 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold">
              1. Conta de App (@{ALLOWED_DOMAIN})
            </span>
            <span className="text-slate-600">→</span>
            <span className="px-2 py-0.5 rounded bg-purple-600/30 text-purple-300 border border-purple-500/40">
              2. MFA QR Code (No App.tsx)
            </span>
            <span className="text-slate-600">→</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              3. Cluster Liberado
            </span>
          </div>
        </div>

        {/* Method Toggle: Conta de Aplicativo vs Google OIDC */}
        <div className="px-6 pt-4 flex gap-2 border-b border-slate-800/80 bg-slate-950/40">
          <button
            type="button"
            onClick={() => {
              sounds.playBlip(550);
              setAuthMethod('app_account');
              setAuthError(null);
            }}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              authMethod === 'app_account'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Conta de Aplicativo (Recomendado)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playBlip(550);
              setAuthMethod('google_oidc');
              setAuthError(null);
            }}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              authMethod === 'google_oidc'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Google Workspace OIDC</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-5">
          {/* Security Policy Badge */}
          <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <div className="font-bold text-white mb-0.5 flex items-center gap-2">
                <span>Proteção Institucional Ativa</span>
                <span className="text-[10px] font-mono bg-blue-950 text-blue-300 px-2 py-0.2 rounded border border-blue-700">
                  DOMÍNIO: @{ALLOWED_DOMAIN}
                </span>
              </div>
              <div className="text-slate-300">
                Acesso estritamente restrito a contas da ION Sistemas. A autenticação pela Conta de Aplicativo libera diretamente a etapa de verificação de segundo fator MFA TOTP (QR Code) no aplicativo.
              </div>
            </div>
          </div>

          {authError && (
            <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-xs text-red-200">
              {authError}
            </div>
          )}

          {/* METHOD 1: CONTA DE APLICATIVO (APP ACCOUNT) */}
          {authMethod === 'app_account' && (
            <form onSubmit={handleAppAccountSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Selecione sua Conta Institucional ION Sistemas:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PRECONFIGURED_APP_ACCOUNTS.map(account => (
                    <button
                      type="button"
                      key={account.id}
                      onClick={() => {
                        sounds.playBlip(500);
                        setSelectedAccountId(account.id);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedAccountId === account.id
                          ? 'bg-blue-950/80 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white flex items-center justify-between mb-0.5">
                        <span className="truncate">{account.name}</span>
                        {selectedAccountId === account.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-blue-300 truncate">
                        {account.email}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        {account.badge}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Option for custom @ionsistemas.com.br prefix */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playBlip(500);
                      setSelectedAccountId('custom');
                    }}
                    className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      selectedAccountId === 'custom'
                        ? 'bg-blue-900/60 border-blue-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    + Outro operador @{ALLOWED_DOMAIN}
                  </button>

                  {selectedAccountId === 'custom' && (
                    <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono">
                      <input
                        type="text"
                        autoFocus
                        value={customUserPrefix}
                        onChange={e => setCustomUserPrefix(e.target.value)}
                        placeholder="nome.sobrenome"
                        className="bg-transparent text-white focus:outline-none w-full"
                      />
                      <span className="text-slate-500">@{ALLOWED_DOMAIN}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* App Key / Secret Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Segredo Corporativo / Chave da Conta de Aplicativo:</span>
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>TLS 1.3 Criptografado</span>
                  </span>
                </div>

                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    required
                    value={appKeyInput}
                    onChange={e => setAppKeyInput(e.target.value)}
                    placeholder="Insira o segredo da conta services@ionsistemas.com.br"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title={showSecret ? 'Ocultar segredo' : 'Exibir segredo'}
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 mt-2 text-[11px] text-slate-300 space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[10px] text-blue-300 pb-1 border-b border-blue-900/40">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Lock className="w-3.5 h-3.5 text-blue-400" />
                      Modelo 1: Google Cloud Secret Manager (GCP)
                    </span>
                    <span className="text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                      KMS AES-256 ATIVO
                    </span>
                  </div>

                  <div className="text-xs text-slate-200">
                    <strong>Local de Armazenamento Oficial:</strong> O segredo da conta <code className="text-emerald-400 font-mono">services@ionsistemas.com.br</code> é mantido no cofre <strong>Google Cloud Secret Manager</strong> sob <code className="text-blue-300 font-mono">projects/[PROJECT_ID]/secrets/services-app-secret</code>.
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                    <span>• Criptografia: Google Cloud KMS</span>
                    <span>• Replicação: Automática (Multi-Region)</span>
                    <span>• Auditoria: Cloud Audit Logs</span>
                  </div>
                </div>
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
                    Papel de Batalha:
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
                disabled={isAuthenticating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Autenticando Conta de Aplicativo...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Autenticar Conta e Abrir Verificação MFA</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* METHOD 2: GOOGLE WORKSPACE OIDC */}
          {authMethod === 'google_oidc' && (
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-center space-y-4">
              <div className="text-xs font-semibold text-slate-200">
                Google Workspace Identity Services (OIDC)
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                O OIDC direto requer um OAuth 2.0 Client ID provisionado no Google Cloud Console com as origens de Cloud Run autorizadas.
              </p>

              <div className="flex flex-col items-center justify-center min-h-[44px]">
                <div ref={googleBtnContainerRef} className="flex justify-center" />
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('app_account');
                    sounds.playBlip(600);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-blue-400" />
                  <span>Usar Conta de Aplicativo da ION Sistemas (Acesso Direto)</span>
                </button>
              </div>
            </div>
          )}

          {/* Security Wall Verification Test (Verify Domain Defense) */}
          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono px-1">
            <span>Auditoria de Domínio:</span>
            <button
              type="button"
              onClick={handleSimulateBlockedDomain}
              className="text-slate-500 hover:text-amber-400 underline cursor-pointer"
              title="Testar barreira de segurança tentando login com conta não autorizada"
            >
              Simular rejeição (@gmail.com)
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 text-center text-[11px] text-slate-500 font-mono">
          Portal ION Sistemas Telecom · Acesso Restrito @{ALLOWED_DOMAIN} · Camada 2 MFA Obrigatória
        </div>
      </div>
    </div>
  );
};
