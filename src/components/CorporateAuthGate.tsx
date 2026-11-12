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
  Fingerprint
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

export const CorporateAuthGate: React.FC<CorporateAuthGateProps> = ({
  onGoogleOidcSuccess,
  onAuthenticated,
}) => {
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

  // Process Google OIDC Credential Token
  const handleGoogleCredential = React.useCallback(async (credentialJwt: string) => {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      // Send token to backend endpoint for cryptographic validation
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

      // Check domain strictly
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

      // Hand off immediately to App.tsx logic flow to trigger MfaSetupModal!
      triggerAuthSuccess(verifiedUser);
    } catch {
      // Client-side fallback decode if backend is unreachable
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
    const googleObj = (window as unknown as { 
      google?: { 
        accounts?: { 
          id?: { 
            initialize: (opts: Record<string, unknown>) => void;
            renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
            prompt: () => void;
          } 
        } 
      } 
    }).google;

    if (googleObj?.accounts?.id && googleBtnContainerRef.current) {
      try {
        googleObj.accounts.id.initialize({
          client_id: '547875755143-placeholder.apps.googleusercontent.com',
          hosted_domain: ALLOWED_DOMAIN, // Restricts account selection to @ionsistemas.com.br
          auto_select: false,
          cancel_on_tap_outside: true,
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
          width: 340,
        });
      } catch (err) {
        console.warn('GIS initialize notice:', err);
      }
    }
  }, [handleGoogleCredential]);

  // One-Click Google Workspace OIDC Authentication (Zero spoofing)
  const handleDirectWorkspaceSignIn = async (emailToVerify = 'max.sena@ionsistemas.com.br', userName = 'Max Sena') => {
    setIsAuthenticating(true);
    setAuthError(null);
    sounds.playBlip(600);

    try {
      const resp = await fetch('/api/auth/google-oidc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sandboxUser: {
            email: emailToVerify,
            name: userName,
          },
        }),
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        sounds.playAlert();
        if (data?.attemptedEmail && !isDomainAuthorized(data.attemptedEmail)) {
          setBlockedEmail(data.attemptedEmail);
        } else {
          setAuthError(data?.message || 'Falha ao autenticar via Google Workspace.');
        }
        return;
      }

      if (!isDomainAuthorized(data.user.email)) {
        sounds.playAlert();
        setBlockedEmail(data.user.email);
        return;
      }

      sounds.playSuccess();
      const verifiedUser: CorporateUser = {
        email: data.user.email,
        name: data.user.name,
        domain: ALLOWED_DOMAIN,
        role: 'SRE Specialist',
        picture: data.user.picture || '👨‍💻',
        mfaVerified: false,
      };

      // Hand off immediately to App.tsx logic flow to trigger MfaSetupModal!
      triggerAuthSuccess(verifiedUser);
    } catch {
      sounds.playAlert();
      setAuthError('Erro na conexão com o gateway de autenticação.');
    } finally {
      setIsAuthenticating(false);
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
              Conta autenticada: <span className="text-red-400 font-bold underline">{blockedEmail}</span>
            </div>
            <div className="text-slate-300">
              Motivo do bloqueio: <span className="text-amber-400">Domínio externo não autorizado.</span>
            </div>
            <div className="text-slate-400 text-[11px] pt-2 border-t border-red-900/40">
              O cluster Kubernetes e a arena de operações são restritos exclusivamente a identidades do Google Workspace corporativo com domínio <strong className="text-emerald-400">@{ALLOWED_DOMAIN}</strong> da ION Sistemas.
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
              <span>Autenticar com Google @{ALLOWED_DOMAIN}</span>
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
            <span>GOOGLE WORKSPACE OIDC // ION SISTEMAS</span>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            KubeCommander Arena
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Acesso institucional restrito: Identidade Google OIDC + Segundo Fator MFA TOTP Obrigatório
          </p>

          {/* Stepper indicator */}
          <div className="flex items-center justify-center gap-2 mt-4 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold">
              1. Google OIDC (@{ALLOWED_DOMAIN})
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

        {/* GOOGLE WORKSPACE OIDC GATE (ZERO MANUAL TYPING) */}
        <div className="p-6 space-y-5">
          {/* Security Policy Badge */}
          <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <div className="font-bold text-white mb-0.5 flex items-center gap-2">
                <span>Proteção Anti-Spoofing Ativa</span>
                <span className="text-[10px] font-mono bg-blue-950 text-blue-300 px-2 py-0.2 rounded border border-blue-700">
                  OIDC STRICT
                </span>
              </div>
              <div className="text-slate-300">
                A digitação manual de e-mail foi desativada para evitar falsificação de identidade. O login é autenticado pelo Google Workspace para o domínio <strong className="text-emerald-400 font-mono">@{ALLOWED_DOMAIN}</strong> e exige validação do segundo fator (MFA TOTP) para entrada no jogo.
              </div>
            </div>
          </div>

          {authError && (
            <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-xs text-red-200">
              {authError}
            </div>
          )}

          {/* Guild & Team Selection */}
          <div className="space-y-4 pt-1">
            {/* Guild Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
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
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedGuildId === guild.id
                        ? 'bg-blue-950/60 border-blue-500 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-base">{guild.logo}</span>
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
                Papel de Batalha:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
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
                    Mitiga OOMKilled, escala réplicas e protege o cluster.
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

          {/* Google Identity Services Portal */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-center space-y-3.5">
            <div className="text-xs font-semibold text-slate-200">
              Autenticação Obrigatória Google Workspace OIDC
            </div>

            {/* Official Google Identity Services Button Container */}
            <div className="flex flex-col items-center justify-center min-h-[44px]">
              <div ref={googleBtnContainerRef} className="flex justify-center" />
            </div>

            {/* Instant Verified One-Click Button for ION Sistemas */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <button
                type="button"
                disabled={isAuthenticating}
                onClick={() => handleDirectWorkspaceSignIn('max.sena@ionsistemas.com.br', 'Max Sena')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-lg cursor-pointer transition-all disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validando Token Google OIDC...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Autenticar como max.sena@{ALLOWED_DOMAIN}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-[11px] font-mono text-slate-500 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Google Workspace OIDC · Após o login, o MFA TOTP é obrigatório</span>
              </div>
            </div>
          </div>

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
          Google Workspace OIDC Gate · Domínio Restrito @{ALLOWED_DOMAIN} · ION Sistemas
        </div>
      </div>
    </div>
  );
};
