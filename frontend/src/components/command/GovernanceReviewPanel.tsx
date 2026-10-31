import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  FileSignature, 
  RotateCcw, 
  ArrowDownCircle, 
  XCircle, 
  AlertCircle, 
  Lock, 
  CheckCircle2, 
  History,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import type { GovernanceAuditRecord } from '../../types';

interface GovernanceReviewPanelProps {
  activeScenario: string;
  selectedZone: string;
  heuristicScore: number;
  decisionTier: string;
  onScenarioReset: () => void;
}

export const GovernanceReviewPanel: React.FC<GovernanceReviewPanelProps> = ({
  activeScenario,
  selectedZone,
  heuristicScore,
  decisionTier,
  onScenarioReset,
}) => {
  const [auditLogs, setAuditLogs] = useState<GovernanceAuditRecord[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'authorize_plan' | 'downgrade_investigation' | 'dismiss_alert' | 'reset_scenario'>('authorize_plan');
  const [reviewerId, setReviewerId] = useState('DEMO-OFFICER-ERODE-01');
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await api.getAuditLog();
      setAuditLogs(data.records || []);
    } catch (err) {
      console.error('Failed to fetch audit log', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const openActionModal = (action: 'authorize_plan' | 'downgrade_investigation' | 'dismiss_alert' | 'reset_scenario') => {
    setSelectedAction(action);
    setActionError(null);
    setActionSuccess(null);
    if (action === 'authorize_plan') {
      setRationale('Authorized recommended surge protocol based on corroborated clinical and laboratory convergence.');
    } else if (action === 'downgrade_investigation') {
      setRationale('Downgrading to targeted surveillance: high precipitation confounder present, awaiting clinical verification.');
    } else if (action === 'dismiss_alert') {
      setRationale('Telemetry verified as delayed batch upload backlog. Clinical outpatient counts remain at baseline.');
    } else {
      setRationale('Resetting demo scenario to baseline surveillance.');
    }
    setModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!reviewerId.trim()) {
      setActionError('Reviewer identifier is required.');
      return;
    }
    if ((selectedAction === 'downgrade_investigation' || selectedAction === 'dismiss_alert') && rationale.trim().length < 5) {
      setActionError('Substantive epidemiological rationale is mandatory for downgrading or dismissing an alert.');
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      const res = await api.recordGovernanceAction({
        reviewer_id: reviewerId.trim(),
        action: selectedAction,
        scenario: activeScenario,
        zone_id: selectedZone,
        heuristic_score: heuristicScore,
        decision_tier: decisionTier,
        rationale: rationale.trim(),
        data_quality_warnings: [],
      });

      setActionSuccess(res.message);
      if (selectedAction === 'reset_scenario') {
        onScenarioReset();
      }
      await fetchLogs();
      setTimeout(() => {
        setModalOpen(false);
      }, 1000);
    } catch (err: any) {
      setActionError(err.message || 'Governance action recording failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            Human-in-the-Loop Governance & Audit Log
          </h2>
          <p className="text-xs text-slate-400">
            Mandatory review authority. Automated medical and public-health interventions are disabled by design.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
          NIST AI RMF 1.0 Aligned
        </span>
      </div>

      {/* Prominent Governance Notice */}
      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-white">NIST AI Risk Management Framework Compliance Statement:</span>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            AEGIS-Epi is an analytical decision-support prototype. Action buttons record authenticated governance decisions into a persistent SQLite audit log. They do not dispatch supplies, contact institutions, or initiate clinical interventions automatically.
          </p>
        </div>
      </div>

      {/* Governance Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <button
          id="gov-authorize-btn"
          onClick={() => openActionModal('authorize_plan')}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950"
        >
          <FileSignature className="w-3.5 h-3.5" />
          Authorize Selected Plan
        </button>

        <button
          id="gov-downgrade-btn"
          onClick={() => openActionModal('downgrade_investigation')}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-950"
        >
          <ArrowDownCircle className="w-3.5 h-3.5" />
          Downgrade to Investigation
        </button>

        <button
          id="gov-dismiss-btn"
          onClick={() => openActionModal('dismiss_alert')}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 rounded-xl text-xs font-bold transition-all"
        >
          <XCircle className="w-3.5 h-3.5" />
          Dismiss Alert (Confounder)
        </button>

        <button
          id="gov-reset-btn"
          onClick={() => openActionModal('reset_scenario')}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          Reset Demo Scenario
        </button>
      </div>

      {/* Persistent Audit Log Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-blue-400" />
            Persistent Governance Audit Trail (SQLite)
          </span>
          <button
            onClick={fetchLogs}
            disabled={loadingLogs}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin text-blue-400' : ''}`} />
            Refresh Audit Log
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 max-h-48 overflow-y-auto">
          <table className="w-full text-left font-mono text-[11px] text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase sticky top-0">
              <tr>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Reviewer ID</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Tier</th>
                <th className="py-2 px-3">Zone</th>
                <th className="py-2 px-3">Score</th>
                <th className="py-2 px-3">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-500 font-sans">
                    No governance actions recorded yet. Use the action buttons above to record an officer decision.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40">
                    <td className="py-1.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-1.5 px-3 text-slate-200 font-bold whitespace-nowrap">
                      {log.reviewer_id}
                    </td>
                    <td className="py-1.5 px-3 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.action === 'authorize_plan' ? 'bg-emerald-950 text-emerald-300' :
                        log.action === 'downgrade_investigation' ? 'bg-amber-950 text-amber-300' :
                        log.action === 'dismiss_alert' ? 'bg-rose-950 text-rose-300' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-slate-300">{log.decision_tier}</td>
                    <td className="py-1.5 px-3 text-indigo-400">{log.zone_id}</td>
                    <td className="py-1.5 px-3 text-white font-bold">{log.heuristic_score}</td>
                    <td className="py-1.5 px-3 text-slate-300 font-sans text-xs max-w-xs truncate" title={log.rationale}>
                      {log.rationale}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-emerald-400" />
                Confirm Governance Action
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Action Type
                </label>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 font-mono font-bold text-slate-200">
                  {selectedAction}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Authorized Reviewer ID (Demo Officer Identity)
                </label>
                <input
                  type="text"
                  value={reviewerId}
                  onChange={(e) => setReviewerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                  placeholder="OFFICER-ERODE-01"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Epidemiological / Governance Rationale
                </label>
                <textarea
                  rows={3}
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  placeholder="State clinical or operational justification..."
                />
              </div>

              {actionError && (
                <div className="p-2 rounded bg-rose-950 border border-rose-800 text-rose-300 text-[11px]">
                  {actionError}
                </div>
              )}

              {actionSuccess && (
                <div className="p-2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-[11px]">
                  {actionSuccess}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                id="confirm-gov-action-btn"
                onClick={handleConfirmAction}
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950 flex items-center gap-1.5"
              >
                {submitting ? 'Recording...' : 'Sign & Record to Audit Log'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
