import React from 'react';
import { 
  Pill, 
  GraduationCap, 
  Stethoscope, 
  FlaskConical, 
  Building2, 
  CloudRain, 
  Navigation,
  CheckCircle2,
  Clock,
  Radio,
  FileSpreadsheet,
  ShieldCheck
} from 'lucide-react';
import type { IngestionStatusResponse } from '../../types';

interface SourceCategoryCardsProps {
  statusData: IngestionStatusResponse | null;
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  pharmacy_pos: <Pill className="w-5 h-5 text-emerald-400" />,
  school_workplace_absenteeism: <GraduationCap className="w-5 h-5 text-blue-400" />,
  clinic_syndromic: <Stethoscope className="w-5 h-5 text-cyan-400" />,
  diagnostic_lab: <FlaskConical className="w-5 h-5 text-purple-400" />,
  hospital_capacity: <Building2 className="w-5 h-5 text-amber-400" />,
  environmental_weather: <CloudRain className="w-5 h-5 text-sky-400" />,
  mobility_calendar: <Navigation className="w-5 h-5 text-indigo-400" />,
};

export const SourceCategoryCards: React.FC<SourceCategoryCardsProps> = ({ statusData }) => {
  const sources = statusData?.sources || {};

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-400" />
            Seven Source Category Integrations
          </h2>
          <p className="text-xs text-slate-400">
            Automated edge ingestion pipelines with source-side privacy minimization & synthetic demo labeling.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
          Mode: Anonymized Telemetry Feed
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {Object.entries(sources).map(([key, src]) => {
          const icon = SOURCE_ICONS[key] || <Radio className="w-5 h-5 text-slate-400" />;
          
          return (
            <div
              key={key}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between transition-all hover:shadow-lg shadow-sm"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      {icon}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-100 leading-tight">
                        {src.name}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400">
                        {key}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Connection & Freshness Pills */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Simulated Ingestion Active
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    &lt;{src.freshness_minutes}m fresh
                  </span>
                </div>

                {/* Signal Types */}
                <div className="mb-3">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
                    Available Telemetry Signals:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {src.signal_types.map((sig) => (
                      <span
                        key={sig}
                        className="px-1.5 py-0.5 bg-slate-950 text-slate-300 border border-slate-800/80 rounded text-[10px] font-mono"
                      >
                        {sig}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer: Records & Privacy Verification */}
              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                <div>
                  <span className="text-slate-500">Records: </span>
                  <span className="text-slate-200 font-semibold">{src.records_received.toLocaleString()}</span>
                </div>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/40">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  {src.validation_status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
