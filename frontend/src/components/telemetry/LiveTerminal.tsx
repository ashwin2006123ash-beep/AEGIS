import React, { useRef, useEffect } from 'react';
import { Terminal, Copy, Trash2, ArrowDownCircle, Check } from 'lucide-react';
import type { TelemetryEvent } from '../../types';

interface LiveTerminalProps {
  events: TelemetryEvent[];
  onClear: () => void;
}

export const LiveTerminal: React.FC<LiveTerminalProps> = ({ events, onClear }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const handleCopy = (evt: TelemetryEvent) => {
    navigator.clipboard.writeText(JSON.stringify(evt, null, 2));
    setCopiedId(evt.id || 'copied');
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[400px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Live Edge Ingestion Webhook Terminal
          </h2>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            HTTP POST 200 OK
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-mono text-[11px]">
            Buffer: {events.length} events
          </span>
          <button
            onClick={onClear}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-all"
            title="Clear Terminal Output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output Window */}
      <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
            <ArrowDownCircle className="w-6 h-6 text-slate-600 animate-bounce" />
            <p>No stream events captured in current session.</p>
            <p className="text-[10px]">Click 'Start Live Demo Stream' or change scenarios above to trigger telemetry webhooks.</p>
          </div>
        ) : (
          events.map((evt, idx) => (
            <div
              key={evt.id || idx}
              className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 hover:border-slate-700 transition-all group flex flex-col gap-1"
            >
              <div className="flex items-center justify-between text-[10px] text-slate-500 border-b border-slate-800/40 pb-1">
                <span className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">POST</span>
                  <span className="text-blue-400">/api/v1/ingest/{evt.source.split('_')[0]}</span>
                  <span className="text-slate-600">•</span>
                  <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400">{evt.zone}</span>
                  <button
                    onClick={() => handleCopy(evt)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white transition-opacity"
                    title="Copy JSON Payload"
                  >
                    {copiedId === evt.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                <code>
                  {JSON.stringify(
                    {
                      id: evt.id,
                      source: evt.source,
                      zone: evt.zone,
                      signal: evt.signal,
                      value: evt.value,
                      unit: evt.unit,
                      data_mode: evt.data_mode,
                      pii_present: evt.pii_present,
                    },
                    null,
                    2
                  )}
                </code>
              </pre>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
