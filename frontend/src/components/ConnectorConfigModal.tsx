import React, { useState } from 'react';
import { X, Sliders, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';
import { api } from '../services/api';
import type { ConnectorInfo } from '../types';

interface ConnectorConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  connector: ConnectorInfo | null;
  onUpdated: () => void;
}

export const ConnectorConfigModal: React.FC<ConnectorConfigModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  connector,
  onUpdated,
}) => {
  const [endpointUrl, setEndpointUrl] = useState<string>(
    connector?.endpoint_url || `https://api.healthnet.gov.in/v1/${organizationId.toLowerCase()}/feed`
  );
  const [authType, setAuthType] = useState<string>(connector?.auth_type || 'mutual_tls');
  const [cadence, setCadence] = useState<string>(connector?.config?.sync_cadence || 'hourly');
  const [smallCellMasking, setSmallCellMasking] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      await api.updateClientConnectorConfig(
        {
          endpoint_url: endpointUrl,
          auth_type: authType,
          cadence: cadence,
          small_cell_masking: smallCellMasking,
        },
        organizationId
      );
      setStatusMsg({ type: 'success', text: 'Connector parameters saved successfully.' });
      setTimeout(() => {
        onUpdated();
        onClose();
      }, 900);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Failed to update connector configuration.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edge Connector Configuration</h2>
              <p className="text-xs text-slate-400 font-mono">Org ID: {organizationId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/70 border border-rose-800 text-rose-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Source Adapter Endpoint URL
            </label>
            <input
              type="text"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Security & Authentication
              </label>
              <select
                value={authType}
                onChange={(e) => setAuthType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="mutual_tls">Mutual TLS (TLS 1.3)</option>
                <option value="api_key">API Key Header</option>
                <option value="oauth2_bearer">OAuth 2.0 Bearer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Telemetry Sync Cadence
              </label>
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="realtime">Near Real-Time (5 min)</option>
                <option value="hourly">Hourly Rollup</option>
                <option value="daily_midnight">End-of-Day Batch</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200">Enforce Edge Small-Cell Masking</span>
                <p className="text-[11px] text-slate-400">
                  Automatically suppress or mask counts &lt; 5 to prevent re-identification.
                </p>
              </div>
              <input
                type="checkbox"
                checked={smallCellMasking}
                onChange={(e) => setSmallCellMasking(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

