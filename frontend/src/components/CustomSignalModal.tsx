import React, { useState } from 'react';
import { Sliders, RotateCcw, Check, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import type { CustomScenarioRequest } from '../types';

interface CustomSignalModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedZone: string;
  onScenarioApplied: () => void;
}

export const CustomSignalModal: React.FC<CustomSignalModalProps> = ({
  isOpen,
  onClose,
  selectedZone,
  onScenarioApplied,
}) => {
  const [pharmacyChange, setPharmacyChange] = useState(120);
  const [clinicChange, setClinicChange] = useState(0);
  const [labChange, setLabChange] = useState(0);
  const [absenteeismChange, setAbsenteeismChange] = useState(40);
  const [completeness, setCompleteness] = useState(100);
  const [reportingGap, setReportingGap] = useState(false);
  const [batchUpload, setBatchUpload] = useState(false);
  const [heavyRain, setHeavyRain] = useState(true);
  const [holiday, setHoliday] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const payload: CustomScenarioRequest = {
      zone_id: selectedZone,
      pharmacy_demand_change_pct: Number(pharmacyChange),
      clinic_visit_change_pct: Number(clinicChange),
      lab_positivity_change_pct: Number(labChange),
      absenteeism_change_pct: Number(absenteeismChange),
      data_completeness_pct: Number(completeness),
      reporting_gap_present: reportingGap,
      batch_upload_spike: batchUpload,
      heavy_rainfall_flag: heavyRain,
      festival_holiday_flag: holiday,
    };

    try {
      await api.applyCustomScenario(payload);
      onScenarioApplied();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to recalculate custom scenario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setSubmitting(true);
    try {
      await api.resetCustomScenario();
      onScenarioApplied();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-scaleUp">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              Add Custom Signal Spike & Confounder Injection
            </h2>
            <p className="text-[11px] text-slate-400">
              Target Zone: <span className="font-bold text-indigo-300">{selectedZone}</span> • Live dynamic recalculation
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Signal Sliders */}
          <div className="space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            {/* Pharmacy Demand */}
            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="text-emerald-400">Pharmacy Antipyretics:</span>
                <span className="font-bold text-white">{pharmacyChange > 0 ? `+${pharmacyChange}%` : `${pharmacyChange}%`}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="300"
                step="10"
                value={pharmacyChange}
                onChange={(e) => setPharmacyChange(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Clinic Visits */}
            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="text-cyan-400">Clinic ILI Consultations:</span>
                <span className="font-bold text-white">{clinicChange > 0 ? `+${clinicChange}%` : `${clinicChange}%`}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="300"
                step="10"
                value={clinicChange}
                onChange={(e) => setClinicChange(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Diagnostic Lab Positivity */}
            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="text-purple-400">Lab Positivity Rate:</span>
                <span className="font-bold text-white">{labChange > 0 ? `+${labChange}%` : `${labChange}%`}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="300"
                step="10"
                value={labChange}
                onChange={(e) => setLabChange(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            {/* Absenteeism */}
            <div>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="text-amber-400">Institutional Absenteeism:</span>
                <span className="font-bold text-white">{absenteeismChange > 0 ? `+${absenteeismChange}%` : `${absenteeismChange}%`}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="300"
                step="10"
                value={absenteeismChange}
                onChange={(e) => setAbsenteeismChange(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Confounder & Reporting Toggles */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={heavyRain}
                onChange={(e) => setHeavyRain(e.target.checked)}
                className="accent-blue-500"
              />
              <span className="text-slate-300 text-[11px]">Heavy Monsoon Rain (82mm)</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={holiday}
                onChange={(e) => setHoliday(e.target.checked)}
                className="accent-amber-500"
              />
              <span className="text-slate-300 text-[11px]">Festival / Holiday Flag</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={reportingGap}
                onChange={(e) => setReportingGap(e.target.checked)}
                className="accent-purple-500"
              />
              <span className="text-slate-300 text-[11px]">3-Day Lab Reporting Gap</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={batchUpload}
                onChange={(e) => setBatchUpload(e.target.checked)}
                className="accent-rose-500"
              />
              <span className="text-slate-300 text-[11px]">Batch Upload Backlog Spike</span>
            </label>
          </div>

          {error && (
            <div className="p-2 rounded bg-rose-950 border border-rose-800 text-rose-300 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={handleReset}
            disabled={submitting}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Custom Scenario
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </button>
            <button
              id="recalculate-custom-btn"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-950"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {submitting ? 'Recalculating...' : 'Recalculate Analysis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
