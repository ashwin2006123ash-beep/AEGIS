import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { TimelinePoint } from '../../types';
import { LineChart as ChartIcon, AlertCircle, Info } from 'lucide-react';

interface MultiSignalTimelineProps {
  timeline: TimelinePoint[];
  selectedZone: string;
}

const CustomTimelineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data: TimelinePoint = payload[0].payload;
    return (
      <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-2 backdrop-blur-md z-30 font-mono">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold text-white">
          <span>Date: {label}</span>
          {data.rainfall_mm && data.rainfall_mm > 25 ? (
            <span className="text-[10px] text-sky-400 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800">
              Rain: {data.rainfall_mm}mm
            </span>
          ) : null}
          {data.holiday_flag === 1 ? (
            <span className="text-[10px] text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800">
              Holiday Flag
            </span>
          ) : null}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4 text-emerald-400">
            <span>Pharmacy Demand:</span>
            <span className="font-bold">
              Z={data.pharmacy_demand_z ?? 0}σ ({data.raw_pharmacy ?? 0} units)
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-cyan-400">
            <span>Clinic ILI Visits:</span>
            <span className="font-bold">
              Z={data.clinic_visits_z ?? 0}σ ({data.raw_clinic ?? 0} cases)
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-purple-400">
            <span>Lab Positivity:</span>
            <span className="font-bold">
              Z={data.lab_positivity_z ?? 0}σ ({data.raw_lab_positivity ?? 0}%)
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-amber-400">
            <span>Absenteeism:</span>
            <span className="font-bold">
              Z={data.absenteeism_z ?? 0}σ ({data.raw_absenteeism ?? 0}%)
            </span>
          </div>
        </div>

        {data.batch_upload_flag === 1 && (
          <div className="text-[10px] text-rose-300 bg-rose-950/60 p-1.5 rounded border border-rose-900/60 mt-1">
            Batch Backlog Surge: 180+ tests ingested simultaneously
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const MultiSignalTimeline: React.FC<MultiSignalTimelineProps> = ({
  timeline,
  selectedZone,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800 mb-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ChartIcon className="w-4 h-4 text-blue-400" />
            Normalized Multi-Signal Anomaly Timeline (14-Day History)
          </h2>
          <p className="text-xs text-slate-400">
            Standardized baseline deviations (Z-Scores: σ above normal historical mean).
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-800">
            Zone: {selectedZone}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
            Anomaly Threshold: +2.0σ
          </span>
        </div>
      </div>

      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeline} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(val) => val.slice(5)} // MM-DD
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              domain={[-1, 6]}
              tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}σ`}
            />
            <Tooltip content={<CustomTimelineTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="circle"
            />

            {/* Threshold Line */}
            <ReferenceLine
              y={2.0}
              stroke="#e11d48"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Anomaly Threshold (+2.0σ)',
                fill: '#fb7185',
                fontSize: 10,
                position: 'top',
              }}
            />

            <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />

            {/* Signal Lines */}
            <Line
              type="monotone"
              dataKey="pharmacy_demand_z"
              name="Pharmacy Antipyretics"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#10b981' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="clinic_visits_z"
              name="Clinic ILI Visits"
              stroke="#06b6d4"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#06b6d4' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="lab_positivity_z"
              name="Diagnostic Lab Positivity"
              stroke="#a855f7"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#a855f7' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="absenteeism_z"
              name="Institutional Absenteeism"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f59e0b' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          Z-Scores normalize different source scales (units sold, % positivity, consultation counts) to standard deviation units.
        </span>
        <span className="font-mono text-slate-500">
          Historical Baseline Window: First 7 Operational Days
        </span>
      </div>
    </div>
  );
};
