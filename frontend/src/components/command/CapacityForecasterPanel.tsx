import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { CapacityForecast, ForecastDay } from '../../types';
import { BedDouble, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface CapacityForecasterPanelProps {
  forecast: CapacityForecast | null;
}

const CustomForecastTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data: ForecastDay = payload[0].payload;
    return (
      <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 backdrop-blur-md z-30 font-mono">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1 font-bold text-white">
          <span>{data.is_historical ? 'Historical Date' : 'Forecast Projection'}: {label}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
            data.demand_beds > 120 ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-300'
          }`}>
            {data.demand_beds > 120 ? 'CAPACITY BREACH' : 'WITHIN CAPACITY'}
          </span>
        </div>

        <div className="space-y-1 text-slate-300">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Demand Estimate:</span>
            <span className="font-bold text-white">{data.demand_beds} beds</span>
          </div>
          {!data.is_historical && (
            <>
              <div className="flex items-center justify-between gap-4 text-slate-400 text-[11px]">
                <span>95% Uncertainty Range:</span>
                <span>[{data.lower_bound} – {data.upper_bound}] beds</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-rose-400 text-[11px]">
                <span>Available Bed Threshold:</span>
                <span>120 beds</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const CapacityForecasterPanel: React.FC<CapacityForecasterPanelProps> = ({ forecast }) => {
  if (!forecast) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-amber-400" />
            Seven-Day Healthcare Demand & Bed Capacity Forecaster
          </h2>
          <p className="text-xs text-slate-400">
            Statistical regression forecast with 95% prediction intervals vs 120-bed hospital ceiling ({forecast.hospital_name}).
          </p>
        </div>

        {forecast.capacity_exceeded ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-300 text-xs font-mono font-bold animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Projected Shortfall: +{forecast.projected_max_shortfall.toFixed(0)} beds on {forecast.exceeded_date}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Capacity Sufficient (&lt; 120 beds)</span>
          </div>
        )}
      </div>

      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={forecast.forecast_days} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(d) => d.slice(5)}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              domain={[20, 160]}
              tickFormatter={(v) => `${v} beds`}
            />
            <Tooltip content={<CustomForecastTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="circle"
            />

            {/* Capacity Threshold Ceiling */}
            <ReferenceLine
              y={120}
              stroke="#e11d48"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: 'Bed Capacity Threshold (120 Beds)',
                fill: '#fb7185',
                fontSize: 10,
                position: 'top',
              }}
            />

            {/* Uncertainty Interval Area */}
            <Area
              type="monotone"
              dataKey="upper_bound"
              name="95% Upper Prediction Bound"
              stroke="transparent"
              fill="#6366f1"
              fillOpacity={0.15}
            />
            <Area
              type="monotone"
              dataKey="lower_bound"
              name="95% Lower Prediction Bound"
              stroke="transparent"
              fill="#0b1120"
              fillOpacity={0.8}
            />

            {/* Mean Projected Demand Line */}
            <Line
              type="monotone"
              dataKey="demand_beds"
              name="Projected Bed Demand"
              stroke={forecast.capacity_exceeded ? '#f43f5e' : '#38bdf8'}
              strokeWidth={2.5}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (!payload.is_historical) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={payload.demand_beds > 120 ? '#e11d48' : '#38bdf8'}
                      stroke="#0f172a"
                      strokeWidth={1.5}
                    />
                  );
                }
                return <circle cx={cx} cy={cy} r={2.5} fill="#94a3b8" />;
              }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          {forecast.methodology}
        </span>
        <span className="font-mono text-slate-500">
          Ceiling: 120 operational acute beds
        </span>
      </div>
    </div>
  );
};
