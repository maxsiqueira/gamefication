import React from 'react';
import { 
  Mail, 
  X, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldAlert, 
  Inbox, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Server
} from 'lucide-react';
import { fetchCorporateMailbox, DispatchedEmail } from '../utils/emailService';
import { sounds } from '../utils/audio';

interface CorporateWebmailModalProps {
  isOpen: boolean;
  email: string;
  onClose: () => void;
  onApplyPin: (pin: string) => void;
}

export const CorporateWebmailModal: React.FC<CorporateWebmailModalProps> = ({
  isOpen,
  email,
  onClose,
  onApplyPin,
}) => {
  const [messages, setMessages] = React.useState<DispatchedEmail[]>([]);
  const [selectedMessage, setSelectedMessage] = React.useState<DispatchedEmail | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [copied, setCopied] = React.useState<boolean>(false);

  const loadInbox = React.useCallback(async () => {
    if (!email) return;
    setIsLoading(true);
    try {
      const items = await fetchCorporateMailbox(email);
      setMessages(items);
      if (items.length > 0) {
        setSelectedMessage(items[0]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  React.useEffect(() => {
    if (isOpen) {
      loadInbox();
    }
  }, [isOpen, loadInbox]);

  if (!isOpen) return null;

  const handleCopy = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    sounds.playBlip(700);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = (pin: string) => {
    sounds.playSuccess();
    onApplyPin(pin);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#090d16] border border-blue-500/40 rounded-2xl shadow-[0_0_50px_rgba(30,58,138,0.4)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Window Bar */}
        <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Webmail Corporativo · ION Sistemas</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-950 border border-blue-700 text-blue-300">
                  @ionsistemas.com.br
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Caixa de Entrada de: <strong className="text-slate-200">{email}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playBlip();
                loadInbox();
              }}
              disabled={isLoading}
              title="Atualizar caixa de entrada"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                sounds.playBlip();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="px-5 py-2.5 bg-blue-950/40 border-b border-blue-900/40 text-[11px] text-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Gateway de Despacho Corporativo Ativo. Se o e-mail não chegar ao seu Gmail/Outlook por filtros corporativos de spam, use este leitor oficial.
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
            SSL / TLS 1.3
          </span>
        </div>

        {/* Modal Main Body: Mail list + Message View */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Left Column: Email list */}
          <div className="p-3 bg-slate-950/60 overflow-y-auto max-h-[35vh] md:max-h-none space-y-2">
            <div className="text-[10px] font-mono font-bold uppercase text-slate-400 px-2 flex items-center justify-between">
              <span>Mensagens Recentes ({messages.length})</span>
            </div>

            {messages.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>Nenhuma mensagem recebida ainda.</p>
                <p className="text-[10px] text-slate-600 mt-1">Clique em "Reenviar PIN" no formulário.</p>
              </div>
            ) : (
              messages.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => {
                    sounds.playBlip(550);
                    setSelectedMessage(msg);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                    selectedMessage?.id === msg.id
                      ? 'bg-blue-950/60 border-blue-500 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-white mb-0.5">
                    <span className="truncate">ION Sistemas Security</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(msg.sentAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-blue-300 font-medium truncate mb-1">
                    {msg.subject}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold">
                      PIN: {msg.pin}
                    </span>
                    <span>· Válido por 10m</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Right Column: Message Detail View */}
          <div className="md:col-span-2 p-5 bg-[#0a0e17] overflow-y-auto flex flex-col justify-between">
            {selectedMessage ? (
              <div className="space-y-4">
                {/* Email Header */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {selectedMessage.subject}
                      </h3>
                      <div className="text-xs text-slate-400 mt-1 space-y-0.5 font-mono">
                        <div>
                          De: <span className="text-slate-200">security@ionsistemas.com.br</span> (ION Sistemas Security Gateway)
                        </div>
                        <div>
                          Para: <span className="text-blue-400">{selectedMessage.email}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(selectedMessage.sentAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Email Body Content */}
                <div className="p-6 rounded-xl bg-slate-950 border border-slate-800/80 text-center space-y-4">
                  <div className="inline-block px-3 py-1 rounded-full bg-blue-950 border border-blue-700 text-blue-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                    Autenticação Corporativa de 2 Fatores
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white">
                      Código PIN de Liberação KubeCommander
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Use este código para desbloquear a Camada 1 da sua conta institucional.
                    </p>
                  </div>

                  {/* Huge PIN card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-b from-blue-950/60 to-slate-900 border border-blue-500/50 max-w-sm mx-auto shadow-inner">
                    <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-1">
                      Seu PIN Confidencial
                    </div>
                    <div className="text-4xl font-extrabold font-mono tracking-widest text-cyan-400 py-1">
                      {selectedMessage.pin}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-slate-400 mt-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Expira em 10 minutos</span>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2.5 justify-center max-w-md mx-auto pt-2">
                    <button
                      onClick={() => handleCopy(selectedMessage.pin)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'PIN Copiado!' : 'Copiar PIN'}</span>
                    </button>

                    <button
                      onClick={() => handleApply(selectedMessage.pin)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                    >
                      <span>Preencher e Continuar para MFA</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Footer security disclaimer */}
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/50 text-[11px] text-amber-300/80 flex items-start gap-2 font-mono">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Caso não tenha solicitado este código, notifique a equipe de segurança e infraestrutura da ION Sistemas imediatamente.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <Mail className="w-12 h-12 text-slate-700 mb-3" />
                <p className="text-sm">Selecione um e-mail na lista para visualizar o PIN.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Serviço de Correio Eletrônico ION Sistemas © {new Date().getFullYear()}</span>
          <button
            onClick={() => {
              sounds.playBlip();
              onClose();
            }}
            className="text-slate-400 hover:text-white underline cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};
