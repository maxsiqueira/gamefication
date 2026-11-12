import React from 'react';
import { 
  AlertTriangle, 
  X, 
  CheckCircle2, 
  Zap, 
  Terminal, 
  ShieldAlert, 
  Clock, 
  Wrench,
  Check
} from 'lucide-react';
import { Alert } from '../types/kubernetes';
import { sounds } from '../utils/audio';

interface AlertsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
  onResolveAlert: (alertId: string, fixCommand: string) => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  isOpen,
  onClose,
  alerts,
  onResolveAlert,
}) => {
  if (!isOpen) return null;

  const activeAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
      <div className="w-full max-w-2xl bg-[#090d16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-red-950/80 border border-red-800/80 text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Cluster Incident & Alert Center</span>
                {activeAlerts.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-red-600 text-white rounded text-[10px] font-mono">
                    {activeAlerts.length} ACTIVE
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Real-time root-cause analysis and operational remediation recommendations
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

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {activeAlerts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
              <div className="text-sm font-semibold text-slate-200">All Systems Nominal</div>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Zero active alerts! Cluster health score is optimal and all health checks are passing.
              </p>
            </div>
          ) : (
            activeAlerts.map(alert => {
              const isCritical = alert.severity === 'critical';

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCritical
                      ? 'bg-red-950/30 border-red-700/60 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                      : 'bg-amber-950/20 border-amber-700/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isCritical ? 'bg-red-500 animate-ping' : 'bg-amber-500'
                        }`}
                      />
                      <span className="font-bold text-xs text-white">
                        {alert.title}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-slate-800">
                        {alert.targetResource}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                        isCritical
                          ? 'bg-red-900/80 text-red-200 border border-red-700'
                          : 'bg-amber-900/80 text-amber-200 border border-amber-700'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    {alert.description}
                  </p>

                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 mb-3 text-xs">
                    <div className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                      <Wrench className="w-3 h-3 text-blue-400" />
                      <span>Suggested Remediation:</span>
                    </div>
                    <div className="text-slate-300 text-xs mb-1.5">
                      {alert.suggestedAction}
                    </div>
                    <div className="font-mono text-[11px] text-blue-300 bg-slate-900 px-2 py-1 rounded border border-slate-800/80 overflow-x-auto">
                      $ {alert.autoFixCommand}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        sounds.playSuccess();
                        onResolveAlert(alert.id, alert.autoFixCommand);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Execute Quick Fix (+100 XP)</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Resolved History accordion */}
          {resolvedAlerts.length > 0 && (
            <div className="pt-4 border-t border-slate-800">
              <div className="text-xs font-semibold text-slate-400 mb-2">
                Recently Resolved ({resolvedAlerts.length})
              </div>
              <div className="space-y-1.5">
                {resolvedAlerts.slice(-3).map(res => (
                  <div
                    key={res.id}
                    className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 flex items-center justify-between text-xs text-slate-400"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="line-through text-slate-500">{res.title}</span>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-400">RESOLVED</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
