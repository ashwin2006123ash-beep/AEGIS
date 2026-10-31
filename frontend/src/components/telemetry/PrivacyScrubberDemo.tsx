import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  Check, 
  X, 
  Info, 
  Lock, 
  EyeOff, 
  Database,
  FileCheck2
} from 'lucide-react';
import { api } from '../../services/api';
import type { PrivacyDemoScrubber } from '../../types';

export const PrivacyScrubberDemo: React.FC = () => {
  const [demoData, setDemoData] = useState<PrivacyDemoScrubber | null>(null);

  useEffect(() => {
    api.getPrivacyDemo().then(setDemoData).catch(console.error);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Edge Privacy Scrubber & Source-Side Data Minimization
          </h2>
          <p className="text-xs text-slate-400">
            Direct personal identifiers are purged at the edge before transmission. The central server only receives k-anonymized aggregate indicators.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 self-start sm:self-auto">
          HIPAA & DPDPA Compliant Pattern
        </span>
      </div>

      {/* Visual Pipeline Progression */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center mb-4 text-xs font-mono">
        <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-center">
          <span className="text-slate-400 block text-[10px] mb-1">Step 1</span>
          <span className="text-slate-200 font-bold">Source POS / HIS</span>
        </div>
        <div className="flex justify-center text-slate-500">
          <ArrowRight className="w-4 h-4 hidden md:block" />
        </div>
        <div className="bg-slate-950 border border-indigo-900/60 p-2.5 rounded-xl text-center">
          <span className="text-indigo-400 block text-[10px] mb-1">Step 2: Edge Minimization</span>
          <span className="text-indigo-200 font-bold">PII Purged & Group Masked</span>
        </div>
        <div className="flex justify-center text-slate-500">
          <ArrowRight className="w-4 h-4 hidden md:block" />
        </div>
        <div className="bg-slate-950 border border-emerald-900/60 p-2.5 rounded-xl text-center">
          <span className="text-emerald-400 block text-[10px] mb-1">Step 3: Central Ingestion</span>
          <span className="text-emerald-200 font-bold">Sanitized Event API</span>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Raw Demarcated Record */}
        <div className="bg-slate-950 border border-rose-950/80 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5" />
              Raw Source-Side Transaction (Never Transmitted)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-900">
              Fictional Demo Entity
            </span>
          </div>

          <div className="font-mono text-xs space-y-1.5 pt-1">
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 text-slate-300">
              <span className="text-slate-500">transaction_id:</span>
              <span className="line-through text-rose-400/80 decoration-rose-500 decoration-2 font-bold">
                TXN-20261031-98214
              </span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-rose-950/20 text-slate-300 border border-rose-900/30">
              <span className="text-slate-500">customer_name:</span>
              <span className="line-through text-rose-400 decoration-rose-500 decoration-2 font-bold">
                "Kavitha R." [REDACTED]
              </span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-rose-950/20 text-slate-300 border border-rose-900/30">
              <span className="text-slate-500">phone_number:</span>
              <span className="line-through text-rose-400 decoration-rose-500 decoration-2 font-bold">
                "+91 98421-XXXXX" [DROPPED]
              </span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 text-slate-300">
              <span className="text-slate-500">product_category:</span>
              <span className="text-slate-200">"Antipyretic / Paracetamol 650mg"</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 text-slate-300">
              <span className="text-slate-500">quantity_sold:</span>
              <span className="text-amber-300">4 units (Cell &lt; 5)</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 text-slate-300">
              <span className="text-slate-500">zone:</span>
              <span className="text-slate-200">"Zone 1 — Sathyamangalam"</span>
            </div>
          </div>
        </div>

        {/* Sanitized Aggregated Record */}
        <div className="bg-slate-950 border border-emerald-950/80 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5" />
              Sanitized Telemetry Payload Ingested at Backend
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
              Zero PII Present
            </span>
          </div>

          <div className="font-mono text-xs space-y-1.5 pt-1">
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 text-slate-300">
              <span className="text-slate-500">source:</span>
              <span className="text-blue-300">"pharmacy_pos"</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 text-slate-300">
              <span className="text-slate-500">zone:</span>
              <span className="text-indigo-300">"Z1_SATHY"</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 text-slate-300">
              <span className="text-slate-500">signal:</span>
              <span className="text-cyan-300">"fever_medicine_demand"</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 text-slate-300">
              <span className="text-slate-500">value:</span>
              <span className="text-emerald-400 font-bold">4.0 (Small-cell masked)</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 text-slate-300">
              <span className="text-slate-500">pii_present:</span>
              <span className="text-emerald-400 font-bold">false</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 text-slate-300">
              <span className="text-slate-500">data_mode:</span>
              <span className="text-slate-400">"synthetic_demo"</span>
            </div>
          </div>
        </div>
      </div>

      {/* Governance Note */}
      <div className="mt-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-300">Privacy Governance Assurance: </span>
          Antigravity and AEGIS-Epi reject direct identifiers at the API boundary. Cryptographic hashing alone is never treated as anonymization; all personal fields are dropped prior to entering the epidemiological analysis engine. Counts below 5 are subject to small-cell suppression to prevent auxiliary linkage attacks.
        </div>
      </div>
    </div>
  );
};
