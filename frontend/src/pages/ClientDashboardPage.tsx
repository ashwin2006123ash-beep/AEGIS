import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Building2, 
  Cpu, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  UploadCloud, 
  RefreshCw, 
  Lock, 
  ShieldCheck, 
  Sliders, 
  FileText, 
  Calendar,
  Layers,
  ArrowUpRight,
  Database,
  ExternalLink,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { api } from '../services/api';
import { ConnectorConfigModal } from '../components/ConnectorConfigModal';
import type { 
  UserProfile, 
  ClientOrganizationProfile, 
  ClientAnalysisResponse, 
  ClientObservationRecord 
} from '../types';

interface ClientDashboardPageProps {
  currentUser: UserProfile | null;
  onOpenRoleSwitcher: () => void;
}

export const ClientDashboardPage: React.FC<ClientDashboardPageProps> = ({
  currentUser,
  onOpenRoleSwitcher,
}) => {
  const [profile, setProfile] = useState<ClientOrganizationProfile | null>(null);
  const [analysis, setAnalysis] = useState<ClientAnalysisResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<ClientObservationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; message: string; rows?: number; suppressed?: number } | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Determine target organization ID based on user
  const effectiveOrgId = currentUser?.organization_id || 'PHARM_SATHY_01';

  const loadClientData = useCallback(async () => {
    setLoading(true);
    try {
      const [profData, analysisData, auditData] = await Promise.all([
        api.getClientProfile(effectiveOrgId),
        api.getClientAnalysis(effectiveOrgId),
        api.getClientAuditLog(effectiveOrgId),
      ]);
      setProfile(profData);
      setAnalysis(analysisData);
      setAuditLogs(auditData.recent_observations || []);
    } catch (err: any) {
      console.error('Error fetching client organization data:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveOrgId]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  // Sync edge connector
  const handleTriggerSync = async () => {
    setSyncing(true);
    try {
      await api.syncClientConnector(effectiveOrgId);
      await loadClientData();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  // CSV Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadFeedback(null);
    try {
      const res = await api.uploadClientCsv(file, effectiveOrgId);
      setUploadFeedback({
        type: 'success',
        message: res.message || 'File ingested and verified successfully.',
        rows: res.rows_ingested,
        suppressed: res.small_cells_suppressed,
      });
      await loadClientData();
    } catch (err: any) {
      setUploadFeedback({
        type: 'error',
        message: err.message || 'Privacy or schema validation error during upload.',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getOrgTypeBadgeColor = (type?: string) => {
    switch (type) {
      case 'pharmacy':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      case 'clinic':
        return 'bg-blue-950/80 text-blue-300 border-blue-800';
      case 'laboratory':
        return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'school':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'hospital':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Tenant Isolation Notice & Organization Profile */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-600/10 via-emerald-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${getOrgTypeBadgeColor(profile?.type)}`}>
                {profile?.type || 'Client Organization'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950 text-indigo-300 border border-indigo-900/60 font-mono text-[11px]">
                <Lock className="w-3 h-3 text-indigo-400" />
                Tenant Isolated: {effectiveOrgId}
              </span>
              <span className="text-xs text-slate-400">
                {profile?.district}, {profile?.state}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-white mt-1.5 flex items-center gap-2">
              {profile?.name || 'Loading Organization...'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
              <span>Sentinel Surveillance Node: <strong className="text-slate-200">{profile?.location_name}</strong></span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Source-Side Anonymization Active</span>
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={handleTriggerSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all shadow-sm"
              title="Test Edge Connector Synchronization"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-blue-400' : 'text-slate-300'}`} />
              {syncing ? 'Syncing...' : 'Sync Connector'}
            </button>

            <button
              onClick={() => setConfigModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-950/50 transition-all"
            >
              <Sliders className="w-3.5 h-3.5" />
              Configure Adapter
            </button>
          </div>
        </div>

        {/* Tenant Isolation Security Guarantee Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Strict Client-Level Data Isolation: Central platform cannot query individual transaction records or raw customer PII.</span>
          </div>
          <button
            onClick={onOpenRoleSwitcher}
            className="text-indigo-400 hover:text-indigo-300 underline font-sans flex items-center gap-1"
          >
            Switch Client Persona
          </button>
        </div>
      </div>

      {/* Metrics Row: Primary Signal, Anomaly Score & Ingestion Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Current Daily Telemetry */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Primary Telemetry</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white flex items-baseline gap-1.5">
              {analysis?.metrics?.current_value?.toLocaleString() ?? 0}
              <span className="text-xs font-mono font-normal text-slate-400">
                {analysis?.metrics?.unit}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Signal: <strong className="text-slate-300">{analysis?.metrics?.primary_signal}</strong>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between font-mono">
            <span>Date: {analysis?.metrics?.analysis_date || 'N/A'}</span>
            <span className={analysis?.metrics?.percentage_change && analysis.metrics.percentage_change > 0 ? 'text-amber-400' : 'text-slate-400'}>
              {analysis?.metrics?.percentage_change ? `${analysis.metrics.percentage_change > 0 ? '+' : ''}${analysis.metrics.percentage_change}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Metric 2: 7-Day Baseline & Deviation */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Rolling Baseline</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-200 flex items-baseline gap-1.5">
              {analysis?.metrics?.baseline_mean ?? 0}
              <span className="text-xs font-mono font-normal text-slate-400">
                ± {analysis?.metrics?.baseline_std ?? 1}σ
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Method: 7-Day Rolling Standardized Baseline
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between font-mono">
            <span>Alg: {analysis?.metrics?.algorithm_version || 'client-v2.0'}</span>
            <span className="text-emerald-400">Continuous Rolling</span>
          </div>
        </div>

        {/* Metric 3: Standardized Z-Score Anomaly Indicator */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Anomaly Divergence</span>
            <AlertTriangle className={`w-4 h-4 ${analysis?.metrics?.anomaly_detected ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div>
            <div className="text-2xl font-bold flex items-baseline gap-1.5">
              <span className={analysis?.metrics?.anomaly_detected ? 'text-amber-400' : 'text-emerald-400'}>
                {analysis?.metrics?.current_z_score && analysis.metrics.current_z_score > 0 ? `+${analysis.metrics.current_z_score}σ` : `${analysis?.metrics?.current_z_score ?? 0}σ`}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                analysis?.metrics?.anomaly_detected 
                  ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                {analysis?.metrics?.severity_level || 'Normal'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Threshold: Anomaly trigger at Z ≥ +2.0σ
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between font-mono">
            <span>Data Completeness:</span>
            <span className="text-slate-200 font-bold">{Math.round((analysis?.metrics?.data_completeness ?? 1) * 100)}%</span>
          </div>
        </div>

        {/* Metric 4: Connector Pipeline & Sync Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Edge Adapter Feed</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="capitalize">{profile?.connector?.status?.replace('_', ' ') || 'Connected'}</span>
            </div>
            <div className="text-xs text-slate-400 font-mono mt-1 truncate" title={profile?.connector?.endpoint_url}>
              {profile?.connector?.endpoint_url || 'https://api.healthnet.gov.in'}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between font-mono">
            <span>Records: <strong className="text-slate-200">{profile?.connector?.records_count ?? 0}</strong></span>
            <span>Sec: mTLS 1.3</span>
          </div>
        </div>
      </div>

      {/* Main Row: Time-Series Recharts & Actionable Operational Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Timeline Chart (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                14-Day Telemetry Baseline & Divergence Analysis
              </h2>
              <p className="text-xs text-slate-400">
                Single-source volume against calculated rolling baseline and ±2σ threshold bands.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-500 rounded" />
                <span className="text-slate-300">Observed Volume</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-500 stroke-dashed rounded" />
                <span className="text-slate-400">Baseline Mean</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-500 rounded" />
                <span className="text-amber-300">Upper Threshold (+2σ)</span>
              </span>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="h-72 w-full pt-2">
            {analysis?.timeline && analysis.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analysis.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickFormatter={(val) => val.slice(5)} 
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  {/* Upper Bound Line */}
                  <Line
                    type="monotone"
                    dataKey="upper_bound"
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                    name="Upper Bound (+2σ)"
                  />
                  {/* Baseline Mean Line */}
                  <Line
                    type="monotone"
                    dataKey="baseline_mean"
                    stroke="#64748b"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    dot={false}
                    name="Baseline Mean"
                  />
                  {/* Actual Value Line */}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ fill: '#3b82f6', r: 3 }}
                    activeDot={{ r: 6, fill: '#60a5fa' }}
                    name="Observed Reading"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No time-series points available yet for this client organization.
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2 leading-relaxed">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>
              <strong>Epidemiological Notice:</strong> A local single-source spike represents an operational deviation at this sentinel site. 
              Outbreak confirmation requires cross-source corroboration at the District Public Health Command Center.
            </span>
          </div>
        </div>

        {/* Right Column: Tailored Client Action Playbook (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Operational Playbook
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                Site Protocols
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Actionable recommendations tailored to your organization type ({profile?.type}):
            </p>

            <div className="space-y-3">
              {analysis?.recommendations && analysis.recommendations.length > 0 ? (
                analysis.recommendations.map((rec, idx) => (
                  <div
                    key={rec.id || idx}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-200">{rec.action}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                        rec.priority === 'Critical'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : rec.priority === 'High'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{rec.rationale}</p>
                    <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 font-mono mt-1">
                      <strong>Action:</strong> {rec.step}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 text-center py-6">
                  No pending operational advisories for this site.
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono mt-4">
            <span>Automated interventions disabled. Follow local clinical/dispensary SOPs.</span>
          </div>
        </div>
      </div>

      {/* Ingestion & Audit Ledger Row: CSV Uploader & SQLite Partition Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Secure Aggregated CSV Ingestion Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-400" />
              Secure Aggregated Telemetry Ingestion
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              Zero PII Allowed
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Upload daily aggregated counts. Files with personal patient identifiers (name, phone, Aadhaar, MRN) are rejected at the edge gateway.
          </p>

          {/* Upload Status Feedback Banner */}
          {uploadFeedback && (
            <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
              uploadFeedback.type === 'success'
                ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/70 border border-rose-800 text-rose-300'
            }`}>
              {uploadFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-semibold">{uploadFeedback.message}</div>
                {uploadFeedback.rows !== undefined && (
                  <div className="text-[11px] font-mono">
                    Ingested Records: {uploadFeedback.rows} • Small Cells Masked (&lt;5): {uploadFeedback.suppressed}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Drag & Drop / File Input Box */}
          <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center space-y-3 transition-colors bg-slate-950/50">
            <div className="w-12 h-12 mx-auto rounded-full bg-indigo-950/70 text-indigo-400 flex items-center justify-center border border-indigo-800">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">
                Select or drag a sanitized CSV file
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Required schema columns: <code className="text-indigo-300 font-mono">date, value, signal_type, unit</code>
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="client-csv-upload-input"
              />
              <label
                htmlFor="client-csv-upload-input"
                className={`inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-md ${
                  uploading ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {uploading ? 'Validating & Uploading...' : 'Browse CSV File'}
              </label>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 font-mono space-y-1">
            <div>• Small-cell values (1-4) are suppressed to 5 to guarantee k-anonymity.</div>
            <div>• Prohibited headers: name, phone, email, ssn, aadhaar, dob, patient, mrn.</div>
          </div>
        </div>

        {/* Panel 2: Isolated Telemetry Audit History Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              Tenant Telemetry Ledger
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              {auditLogs.length} Recent Records
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Immutable SQLite observations logged specifically for <strong className="text-slate-200">{effectiveOrgId}</strong>.
          </p>

          {/* Table */}
          <div className="overflow-x-auto max-h-72 border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Signal</th>
                  <th className="py-2.5 px-3">Value</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Privacy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 text-slate-300">
                {auditLogs.length > 0 ? (
                  auditLogs.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-slate-200 font-semibold">{row.date}</td>
                      <td className="py-2 px-3 text-indigo-300">{row.signal_type}</td>
                      <td className="py-2 px-3 font-bold text-white">{row.value} {row.unit}</td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                          row.data_mode === 'file_upload'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-slate-950 text-slate-400'
                        }`}>
                          {row.data_mode}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {row.small_cell_masked ? (
                          <span className="text-amber-400 text-[10px] font-bold">Masked (&lt;5)</span>
                        ) : (
                          <span className="text-emerald-400 text-[10px]">Verified</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No observations recorded yet in this partition.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Configuration Modal */}
      <ConnectorConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        organizationId={effectiveOrgId}
        connector={profile?.connector || null}
        onUpdated={loadClientData}
      />
    </div>
  );
};

