import React from 'react';
import { 
  ClipboardList, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldAlert, 
  HelpCircle,
  FileText
} from 'lucide-react';
import type { RecommendationItem } from '../../types';

interface RecommendationPlaybookProps {
  recommendations: RecommendationItem[];
  tier: string;
}

export const RecommendationPlaybook: React.FC<RecommendationPlaybookProps> = ({
  recommendations,
  tier,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-400" />
            Decision-Support Action Playbook
          </h2>
          <p className="text-xs text-slate-400">
            Algorithmic action guidance tailored to active risk tier ({tier}). Proposals require human authorization.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
          Status: Advisory Only
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {rec.title}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 shrink-0">
                  {rec.action_type}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300 mb-3">
                <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/40">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5">
                    Rationale & Supporting Evidence:
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {rec.rationale} {rec.supporting_evidence}
                  </p>
                </div>

                <div className="text-[11px] text-amber-300/90 font-mono">
                  <span className="text-slate-500 font-sans block text-[10px]">Remaining Uncertainty:</span>
                  {rec.remaining_uncertainty}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 font-medium">
              <span className="flex items-center gap-1 text-[11px]">
                <ArrowRight className="w-3.5 h-3.5" />
                Action: {rec.next_step}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
