import React from 'react';
import { Target, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { SignalAttribution as SignalAttributionType } from '../../types';

interface SignalAttributionProps {
  attributions: SignalAttributionType[];
}

export const SignalAttribution: React.FC<SignalAttributionProps> = ({ attributions }) => {
  const getBadgeStyle = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'High':
      case 'High Confounder':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'Moderate':
        return 'bg-blue-950/80 text-blue-300 border-blue-800';
      default:
        return 'bg-slate-950 text-slate-400 border-slate-800';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            Signal Attribution & Causal Contribution Breakdown
          </h2>
          <p className="text-xs text-slate-400">
            Explicit causal attribution of each health indicator to the active scenario assessment.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
          Hypothesis Evaluation
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {attributions.map((attr, idx) => {
          const isElevated = attr.current_status.includes('Elevated') || attr.current_status.includes('Confounder');
          return (
            <div
              key={idx}
              className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-1 mb-2">
                  <span className="text-xs font-bold text-slate-100">
                    {attr.signal_name}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase font-semibold ${getBadgeStyle(attr.contribution_level)}`}>
                    {attr.contribution_level}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center gap-1.5">
                  <span className="text-slate-500">{attr.source_category}</span>
                  <span>•</span>
                  <span className={attr.z_score >= 1.8 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                    Z={attr.z_score > 0 ? `+${attr.z_score}` : attr.z_score}σ
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                  {attr.explanation}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1 text-[10px] font-medium">
                {attr.role.includes('Strengthens') ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    {attr.role}
                  </span>
                ) : attr.role.includes('Weakens') || attr.role.includes('Disconfirms') ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3" />
                    {attr.role}
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1">
                    <Minus className="w-3 h-3" />
                    {attr.role}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
