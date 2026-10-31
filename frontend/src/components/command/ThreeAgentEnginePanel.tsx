import React from 'react';
import { 
  Bot, 
  BrainCircuit, 
  Scale, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle,
  FileSearch,
  Sparkles
} from 'lucide-react';
import type { ThreeAgentEngineResponse, AgentEvaluation } from '../../types';

interface ThreeAgentEnginePanelProps {
  agentsData: ThreeAgentEngineResponse | null;
}

export const ThreeAgentEnginePanel: React.FC<ThreeAgentEnginePanelProps> = ({ agentsData }) => {
  if (!agentsData) return null;

  const { epidemiologist, skeptic, arbiter, verdict_tier, heuristic_evidence_score } = agentsData;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'alert':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'investigating':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      default:
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-purple-400" />
            Three-Agent Multi-Perspective Evidence Evaluation Engine
          </h2>
          <p className="text-xs text-slate-400">
            Transparent, rule-based algorithmic reasoning: Hypothesis generation vs Confounder refutation vs Arbiter synthesis.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2 py-0.5 rounded bg-slate-950 text-purple-300 border border-purple-900/60 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            Triangulated Decision Intelligence
          </span>
        </div>
      </div>

      {/* Three Agent Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Agent 1: Epidemiologist */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-3 shadow-sm hover:border-slate-700 transition-all">
          <div>
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-950 border border-blue-800/60 text-blue-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100">
                    {epidemiologist.agent_title}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Agent ID: AGY-EPI-01</span>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold border ${getStatusBadge(epidemiologist.status)}`}>
                {epidemiologist.status}
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-200 mb-2">
              "{epidemiologist.headline}"
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed mb-3 bg-slate-900/70 p-2 rounded-lg border border-slate-800/60">
              {epidemiologist.reasoning}
            </p>

            {/* Supported Observations */}
            {epidemiologist.observations_supporting.length > 0 && (
              <div className="space-y-1 mb-2.5">
                <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider block">
                  Supporting Telemetry Observations:
                </span>
                <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                  {epidemiologist.observations_supporting.map((obs, i) => (
                    <li key={i} className="text-slate-300">{obs}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Missing Evidence Notice */}
          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
            <span className="text-slate-500 block mb-0.5">Missing Confirmatory Data:</span>
            {epidemiologist.missing_evidence.slice(0, 2).map((m, i) => (
              <div key={i} className="text-slate-400 flex items-center gap-1">
                <span>•</span> {m}
              </div>
            ))}
          </div>
        </div>

        {/* Agent 2: Skeptic */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-3 shadow-sm hover:border-slate-700 transition-all">
          <div>
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-950 border border-amber-800/60 text-amber-400">
                  <FileSearch className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100">
                    {skeptic.agent_title}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Agent ID: AGY-SKEPTIC-02</span>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold border ${getStatusBadge(skeptic.status)}`}>
                {skeptic.status}
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-200 mb-2">
              "{skeptic.headline}"
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed mb-3 bg-slate-900/70 p-2 rounded-lg border border-slate-800/60">
              {skeptic.reasoning}
            </p>

            {/* Alternative Explanations Evaluated */}
            {skeptic.alternative_explanations.length > 0 && (
              <div className="space-y-1 mb-2.5">
                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">
                  Confounders & Artifacts Evaluated:
                </span>
                <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                  {skeptic.alternative_explanations.map((alt, i) => (
                    <li key={i} className="text-slate-300">{alt}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
            <span className="text-slate-500 block mb-0.5">Verification Mandate:</span>
            <span>Does not verify confounders unless telemetry evidence is present in active dataset.</span>
          </div>
        </div>

        {/* Agent 3: Arbiter */}
        <div className="bg-slate-950/80 border border-indigo-900/60 rounded-xl p-3.5 flex flex-col justify-between space-y-3 shadow-md hover:border-indigo-700 transition-all">
          <div>
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-950 border border-indigo-800/60 text-indigo-400">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100">
                    {arbiter.agent_title}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Agent ID: AGY-ARBITER-03</span>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold border ${getStatusBadge(arbiter.status)}`}>
                {verdict_tier}
              </span>
            </div>

            <div className="text-xs font-semibold text-indigo-300 mb-2">
              "{arbiter.headline}"
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed mb-3 bg-slate-900/70 p-2 rounded-lg border border-slate-800/60">
              {arbiter.reasoning}
            </p>

            <div className="space-y-1.5 mb-2.5 font-mono text-[11px]">
              <div className="flex items-center justify-between text-slate-300 bg-slate-900 px-2 py-1 rounded">
                <span className="text-slate-400">Heuristic Score:</span>
                <span className="font-bold text-white">{heuristic_evidence_score}/100</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 bg-slate-900 px-2 py-1 rounded">
                <span className="text-slate-400">Agreement:</span>
                <span className="font-bold text-emerald-400">{Math.round(agentsData.cross_source_agreement * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400">
            <span className="font-bold text-slate-300">Governance Directive: </span>
            {verdict_tier === 'Tier 2'
              ? 'Urgent human review required by District Medical Officer. Clinical escalation triggered.'
              : verdict_tier === 'Tier 1'
              ? 'Targeted source validation and retail verification recommended before public notification.'
              : 'Maintain standard routine telemetry surveillance. Outbreak claims unsupported.'}
          </div>
        </div>
      </div>
    </div>
  );
};
