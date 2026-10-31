import React from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Radio, 
  Lock, 
  UserCheck, 
  Sliders, 
  MapPin, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import type { DashboardSummaryResponse } from '../types';

interface HeaderProps {
  currentTab: 'telemetry' | 'command';
  onTabChange: (tab: 'telemetry' | 'command') => void;
  selectedZone: string;
  onZoneChange: (zone: string) => void;
  summary: DashboardSummaryResponse | null;
  backendOnline: boolean;
  onOpenCustomModal: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  selectedZone,
  onZoneChange,
  summary,
  backendOnline,
  onOpenCustomModal,
  onRefresh,
  refreshing,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
      {/* Top Banner: Governance & Compliance Disclaimer */}
      <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-400">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-medium">
            <Lock className="w-3 h-3" /> Zero Direct PII • Source-Side Minimized
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 font-medium">
            <UserCheck className="w-3 h-3" /> Human-in-the-Loop Required • Automated Intervention Disabled
          </span>
          <span className="hidden md:inline-flex items-center gap-1 text-slate-400">
            Governed under NIST AI RMF 1.0 guidelines
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-slate-400">Hackathon: <span className="text-slate-200 font-semibold">TCS AI for Impact</span></span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            {backendOnline ? 'API Operational' : 'Connecting to API...'}
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-indigo-950/50 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                AEGIS-Epi
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-medium tracking-wide">
                  Demo
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Causal Public Health Early-Warning & Decision Intelligence
            </p>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            id="tab-telemetry-btn"
            onClick={() => onTabChange('telemetry')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'telemetry'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Zero-Touch Telemetry Hub
          </button>
          <button
            id="tab-command-btn"
            onClick={() => onTabChange('command')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'command'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Officer AI Command Center
          </button>
        </div>

        {/* Zone Selector & Controls */}
        <div className="flex items-center gap-2">
          {/* District / Zone Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <select
              id="global-zone-selector"
              value={selectedZone}
              onChange={(e) => onZoneChange(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="Z1_SATHY" className="bg-slate-900">Zone 1 — Sathyamangalam</option>
              <option value="Z2_GOBI" className="bg-slate-900">Zone 2 — Gobichettipalayam</option>
              <option value="Z3_ERODE" className="bg-slate-900">Zone 3 — Erode Urban</option>
              <option value="Z4_PERUNDURAI" className="bg-slate-900">Zone 4 — Perundurai</option>
              <option value="Z5_BHAVANI" className="bg-slate-900">Zone 5 — Bhavani</option>
            </select>
          </div>

          {/* Custom Spike Modal Trigger */}
          <button
            id="open-custom-spike-modal-btn"
            onClick={onOpenCustomModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-900/60 to-purple-900/60 hover:from-indigo-800/80 hover:to-purple-800/80 text-purple-200 border border-purple-700/50 rounded-lg text-xs font-medium transition-all shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Add Custom</span> Signal Spike
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition-all"
            title="Refresh Data & Calculations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub-Header: Active Scenario Status Strip */}
      <div className="bg-slate-950 border-t border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Active Dataset:</span>
          <span className="px-2 py-0.5 rounded bg-slate-900 text-blue-300 border border-slate-700/80 font-mono font-medium flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-blue-400" />
            {summary?.active_scenario_title || 'Loading Scenario...'}
          </span>
          <span className="hidden md:inline text-slate-500 font-mono text-[11px]">
            • 5 Zones Monitored • 14-Day Baseline
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1 text-slate-400">
            Freshness: <span className="text-emerald-400 font-medium">Real-time (&lt;5m)</span>
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            Total Ingested: <span className="text-slate-200 font-semibold">{summary?.total_ingested_events ?? 0}</span>
          </span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
            summary?.decision_tier === 'Tier 2' 
              ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80 animate-pulse'
              : summary?.decision_tier === 'Tier 1'
              ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
          }`}>
            {summary?.decision_tier || 'Tier 0'}
          </span>
        </div>
      </div>
    </header>
  );
};
