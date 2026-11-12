import React from 'react';
import { Terminal as TerminalIcon, X, Maximize2, Minimize2, CornerDownLeft, Sparkles, ChevronRight } from 'lucide-react';
import { executeKubectlCommand } from '../utils/kubectlEngine';
import { Node, Pod, Deployment } from '../types/kubernetes';
import { sounds } from '../utils/audio';

interface TerminalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  pods: Pod[];
  deployments: Deployment[];
  onApplyCommandEffects: (effects: {
    affectedDeployments?: { name: string; replicas?: number; cpuLimit?: number; memLimit?: number; cpuReq?: number; memReq?: number; hpa?: boolean }[];
    affectedPods?: { id: string; action: 'delete' | 'restart' | 'patch' }[];
    affectedNodes?: { id: string; action: 'drain' | 'uncordon' }[];
  }) => void;
}

interface HistoryItem {
  command: string;
  output: string;
  isError?: boolean;
  timestamp: string;
}

export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({
  isOpen,
  onClose,
  nodes,
  pods,
  deployments,
  onApplyCommandEffects,
}) => {
  const [input, setInput] = React.useState('');
  const [history, setHistory] = React.useState<HistoryItem[]>([
    {
      command: 'kubectl get pods -A',
      output: `NAMESPACE      NAME                               READY   STATUS             RESTARTS   AGE
production     frontend-edge-78fc964b-a1          1/1     Running            0          63m
production     frontend-edge-78fc964b-b2          1/1     Running            0          63m
production     payment-gateway-5567d-9x           1/1     Running            0          90m
production     payment-gateway-5567d-4z           1/1     Running            0          90m
production     payment-gateway-5567d-8k           1/1     Running            0          35m
production     cart-redis-6d88f987-01             1/1     Running            0          140m
analytics      analytics-worker-99ab1-a1          1/1     Running            0          20m
analytics      analytics-worker-99ab1-b2          1/1     Running            0          20m`,
      timestamp: '16:40:02',
    },
  ]);
  const [historyIndex, setHistoryIndex] = React.useState<number>(-1);
  const [commandLog, setCommandLog] = React.useState<string[]>(['kubectl get pods -A']);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  if (!isOpen) return null;

  const handleRunCommand = (cmdToRun: string) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed) return;

    sounds.playKeystroke();

    if (trimmed.toLowerCase() === 'clear') {
      setHistory([]);
      setInput('');
      return;
    }

    const result = executeKubectlCommand(trimmed, { nodes, pods, deployments });

    if (result.output === '__CLEAR__') {
      setHistory([]);
      setInput('');
      return;
    }

    const timeStr = new Date().toLocaleTimeString();
    setHistory(prev => [
      ...prev,
      {
        command: trimmed,
        output: result.output,
        isError: result.isError,
        timestamp: timeStr,
      },
    ]);

    setCommandLog(prev => [...prev, trimmed]);
    setHistoryIndex(-1);
    setInput('');

    if (result.isError) {
      sounds.playAlert();
    } else {
      sounds.playSuccess();
    }

    // Apply any simulation side-effects
    if (result.affectedDeployments || result.affectedPods || result.affectedNodes) {
      onApplyCommandEffects({
        affectedDeployments: result.affectedDeployments,
        affectedPods: result.affectedPods,
        affectedNodes: result.affectedNodes,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRunCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandLog.length === 0) return;
      const nextIndex = historyIndex === -1 ? commandLog.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(commandLog[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      if (historyIndex < commandLog.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setInput(commandLog[nextIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    } else {
      sounds.playKeystroke();
    }
  };

  const quickCommands = [
    'kubectl get pods -A',
    'kubectl top nodes',
    'kubectl top pods',
    'kubectl get deploy',
    'kubectl get events',
    'help',
  ];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 border-t border-slate-700/80 shadow-[0_-10px_35px_rgba(0,0,0,0.7)] backdrop-blur-md flex flex-col transition-all duration-200 ${
        isExpanded ? 'h-[80vh]' : 'h-[360px]'
      }`}
    >
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs font-mono select-none">
        <div className="flex items-center gap-2 text-slate-300">
          <TerminalIcon className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-200">Terminal — sre@control-plane (v1.31)</span>
          <span className="text-slate-500 hidden sm:inline">| cluster: us-central1-k8s-prod</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick command buttons */}
          <div className="hidden md:flex items-center gap-1.5 mr-2">
            {quickCommands.map(cmd => (
              <button
                key={cmd}
                onClick={() => handleRunCommand(cmd)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
              >
                {cmd}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Close Terminal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal History Display */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-300 space-y-3 leading-relaxed">
        <div className="text-slate-500 text-[11px] pb-1">
          KubeCommander Interactive SRE Shell. Type <span className="text-blue-400">help</span> for available commands.
        </div>

        {history.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-emerald-400 font-bold">sre@control-plane:~$</span>
              <span className="text-slate-100 font-semibold">{item.command}</span>
              <span className="text-[10px] text-slate-600 ml-auto">{item.timestamp}</span>
            </div>
            <pre
              className={`p-2.5 rounded-lg whitespace-pre-wrap font-mono text-xs overflow-x-auto ${
                item.isError
                  ? 'bg-red-950/40 text-red-300 border border-red-900/40'
                  : 'bg-black/40 text-slate-200 border border-slate-800/60'
              }`}
            >
              {item.output}
            </pre>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Terminal Input Line */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2 font-mono text-xs">
        <span className="text-emerald-400 font-bold shrink-0">sre@control-plane:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="kubectl get pods | kubectl scale deploy payment-gateway --replicas=5 | help"
          className="flex-1 bg-transparent border-none text-slate-100 placeholder-slate-600 focus:outline-none"
        />
        <button
          onClick={() => handleRunCommand(input)}
          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs flex items-center gap-1 transition-colors"
        >
          <span>Run</span>
          <CornerDownLeft className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
