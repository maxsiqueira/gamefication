import React from 'react';
import QRCode from 'qrcode';
import { 
  ShieldCheck, 
  X, 
  Smartphone, 
  Copy, 
  Check, 
  Lock, 
  AlertCircle, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { 
  generateBase32Secret, 
  buildOtpAuthUri, 
  verifyTotpCode 
} from '../utils/totp';
import { sounds } from '../utils/audio';

interface MfaSetupModalProps {
  isOpen: boolean;
  email: string;
  onSuccess: (secret: string) => void;
  onCancel?: () => void;
}

export const MfaSetupModal: React.FC<MfaSetupModalProps> = ({
  isOpen,
  email,
  onSuccess,
  onCancel,
}) => {
  const [secret, setSecret] = React.useState<string>('');
  const [tokenInput, setTokenInput] = React.useState<string>('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = React.useState<boolean>(false);
  const [isVerifying, setIsVerifying] = React.useState<boolean>(false);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Initialize a fresh Base32 secret when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const newSecret = generateBase32Secret(16);
      setSecret(newSecret);
      setTokenInput('');
      setErrorMsg(null);
    }
  }, [isOpen, email]);

  // Render QR Code onto canvas
  React.useEffect(() => {
    if (isOpen && secret && canvasRef.current) {
      const uri = buildOtpAuthUri(email, secret, 'ION Sistemas');
      QRCode.toCanvas(canvasRef.current, uri, {
        width: 190,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).catch(err => {
        console.warn('Erro ao renderizar QR code TOTP:', err);
      });
    }
  }, [isOpen, secret, email]);

  if (!isOpen) return null;

  const handleCopySecret = () => {
    sounds.playBlip(550);
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const isValid = await verifyTotpCode(secret, tokenInput);

      if (!isValid) {
        sounds.playAlert();
        setErrorMsg('Código incorreto ou expirado. Verifique o relógio do seu celular e tente novamente.');
        setIsVerifying(false);
        return;
      }

      sounds.playSuccess();
      onSuccess(secret);
    } catch {
      setErrorMsg('Erro inesperado na validação do token. Tente novamente.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="w-full max-w-lg bg-[#090d16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-800/80 text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Configuração de Autenticação MFA (TOTP)</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                ION Sistemas · Conta: <span className="text-purple-300">{email}</span>
              </p>
            </div>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Instructions */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
            <Smartphone className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              Abra o <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong> ou <strong>1Password</strong> no seu celular, aponte a câmera para o QR Code abaixo e insira o código gerado.
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl max-w-[210px] mx-auto shadow-xl">
            <canvas ref={canvasRef} className="rounded-lg" />
            <span className="text-[10px] font-mono font-bold text-slate-800 mt-1 uppercase tracking-wider">
              ION Sistemas // 2FA
            </span>
          </div>

          {/* Manual Secret Key */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="overflow-hidden">
              <span className="text-slate-500 text-[10px] block">Chave manual de configuração:</span>
              <span className="text-purple-300 font-bold tracking-widest">{secret}</span>
            </div>
            <button
              type="button"
              onClick={handleCopySecret}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Copiar Chave Manual"
            >
              {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-800/80 flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Verification Form */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Insira o token de 6 dígitos gerado no aplicativo:
              </label>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono">Padrão RFC 6238 (30s)</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { generateTotpCode } = await import('../utils/totp');
                      const code = await generateTotpCode(secret, 0);
                      setTokenInput(code);
                      sounds.playBlip(650);
                    } catch (err) {
                      console.warn('Erro ao gerar código de teste:', err);
                    }
                  }}
                  className="text-purple-400 hover:text-purple-300 underline font-mono text-[11px] cursor-pointer"
                  title="Gera o código TOTP RFC 6238 correspondente a este exato segundo para testes rápidos"
                >
                  ⚡ Gerar código do app agora (Ambiente de Teste)
                </button>
              </div>

              <input
                type="text"
                maxLength={6}
                required
                autoFocus
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center tracking-widest px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xl font-mono text-white focus:outline-none focus:border-purple-500 placeholder-slate-700"
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Voltar
                </button>
              )}

              <button
                type="submit"
                disabled={tokenInput.length < 6 || isVerifying}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>{isVerifying ? 'Validando...' : 'Verificar Token e Liberar Jogo'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800/80 text-center text-[10px] text-slate-500 font-mono">
          Camada 2 de Segurança Obrigatória · Padrão RFC 6238 TOTP
        </div>
      </div>
    </div>
  );
};
