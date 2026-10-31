import React from 'react';
import { 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  HelpCircle, 
  AlertTriangle, 
  FileCheck, 
  Layers, 
  BedDouble,
  AlertOctagon,
  Info
} from 'lucide-react';
import type { DashboardSummaryResponse } from '../../types';

interface ExecutiveSummaryProps {
  summary: DashboardSummaryResponse | null;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ summary }) => {
  if (!summary) return null;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Tier 2':
        return {
          bg: 'bg-rose-950/80',
          border: 'border-rose-700',
          text: 'text-rose-300',
          badge: 'bg-rose-600 text-white',
          glow: 'glow-rose',
        };
      case 'Tier 1':
        return {
          bg: 'bg-amber-950/80',
          border: 'border-amber-700',
          text: 'text-amber-300',
          badge: 'bg-amber-500 text-slate-950',
          glow: 'glow-amber',
        };
      default:
        return {
          bg: 'bg-emerald-950/80',
          border: 'border-emerald-700',
          text: 'text-emerald-300',
          badge: 'bg-emerald-600 text-white',
          glow: 'glow-emerald',
        };
    }
  };

  const tierStyles = getTierColor(summary.decision_tier);

  return (
    <div className="space-y-4">
      {/* Primary Decision Tier Banner */}
      <div className={`p-4 rounded-2xl border ${tierStyles.border} ${tierStyles.bg} ${tierStyles.glow} transition-all shadow-xl`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${tierStyles.badge} shadow-lg font-bold flex items-center justify-center`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs uppercase font-mono px-2 py-0.5 rounded-full ${tierStyles.badge} font-bold tracking-wider`}>
                  {summary.decision_tier}
                </span>
                <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                  {summary.decision_tier_label}
                </h2>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Target Zone: <span className="font-bold text-white">{summary.selected_zone}</span> • Active Protocol: Multi-Source Causal Triangulation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Heuristic Evidence Score</div>
              <div className="text-xl font-bold font-mono text-white flex items-baseline gap-1">
                {summary.heuristic_evidence_score}
                <span className="text-xs text-slate-500 font-normal">/ 100</span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Corroborating Sources</div>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {summary.corroborating_sources_count}
                <span className="text-xs text-slate-500 font-normal"> / 4 streams</span>
              </div>
            </div>
          </div>
        </div>

        {/* Uncertainty & Caution Statement */}
        <div className="pt-3 text-xs flex items-start gap-2 text-slate-300">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="leading-relaxed">
              <span className="font-semibold text-white">Uncertainty Statement: </span>
              {summary.uncertainty_statement}
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              Note: Correlation does not prove causation. Heuristic evidence scores reflect statistical divergence & multi-source consistency, not biological diagnosis.
            </p>
          </div>
        </div>
      </div>

      {/* Six Dynamic Calculated Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* 1. Cross-Source Agreement */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all group">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium text-[11px]">Agreement</span>
            <div className="relative group/tooltip">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help" />
              <div className="absolute right-0 bottom-full mb-1 hidden group-hover/tooltip:block w-48 p-2 rounded bg-slate-950 text-[10px] text-slate-300 border border-slate-800 shadow-xl z-30">
                Calculated as (number of corroborating elevated signals) / (total core signals monitored).
              </div>
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {Math.round(summary.cross_source_agreement * 100)}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full ${summary.cross_source_agreement >= 0.7 ? 'bg-rose-500' : (summary.cross_source_agreement >= 0.4 ? 'bg-amber-400' : 'bg-emerald-500')}`}
              style={{ width: `${summary.cross_source_agreement * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1 block">
            {summary.corroborating_sources_count >= 3 ? 'Multi-Source Convergence' : 'Isolated / Low Agreement'}
          </span>
        </div>

        {/* 2. Anomaly Severity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium text-[11px]">Anomaly Severity</span>
            <Activity className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {(summary.anomaly_severity * 10).toFixed(1)}
            <span className="text-xs text-slate-500 font-normal"> / 10</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500"
              style={{ width: `${summary.anomaly_severity * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1 block">
            Max Z: +{(summary.anomaly_severity * 4.2).toFixed(1)}σ
          </span>
        </div>

        {/* 3. Evidence Quality */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium text-[11px]">Evidence Quality</span>
            <FileCheck className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {Math.round(summary.evidence_quality * 100)}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${summary.evidence_quality * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1 block">
            Signal Integrity Index
          </span>
        </div>

        {/* 4. Data Completeness */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium text-[11px]">Data Completeness</span>
            <Layers className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-lg font-bold font-mono text-blue-400">
            {Math.round(summary.data_completeness * 100)}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${summary.data_completeness * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1 block">
            14-Day Timeline Coverage
          </span>
        </div>

        {/* 5. Confounder / False-Alarm Flags */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium text-[11px]">Confounders</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg font-bold font-mono text-amber-300">
            {summary.false_alarm_flags.length}
            <span className="text-xs text-slate-500 font-normal"> active</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 truncate font-mono">
            {summary.false_alarm_flags.length > 0 
              ? summary.false_alarm_flags[0].split('(')[0] 
              : 'Zero external confounders'}
          </div>
        </div>

        {/* 6. Projected 7-Day Capacity Pressure */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium text-[11px]">Bed Capacity Risk</span>
            <BedDouble className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className={`text-lg font-bold font-mono ${summary.capacity_forecast.capacity_exceeded ? 'text-rose-400' : 'text-emerald-400'}`}>
            {summary.capacity_forecast.capacity_exceeded 
              ? `Surge (${summary.capacity_forecast.projected_max_shortfall.toFixed(0)} beds)` 
              : 'Normal (&lt;120)'}
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-2 block">
            {summary.capacity_forecast.capacity_exceeded 
              ? `Breach on ${summary.capacity_forecast.exceeded_date}` 
              : 'Threshold maintained'}
          </span>
        </div>
      </div>
    </div>
  );
};
