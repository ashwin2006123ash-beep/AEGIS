import React from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Sparkles, 
  AlertTriangle, 
  Database, 
  Activity,
  Layers
} from 'lucide-react';

interface StreamControllerProps {
  isStreaming: boolean;
  onToggleStream: () => void;
  activeScenario: string;
  onSelectScenario: (scenario: string) => void;
  onReset: () => void;
  totalEvents: number;
  lastEventTime: string | null;
  loadingScenario: boolean;
}

export const StreamController: React.FC<StreamControllerProps> = ({
  isStreaming,
  onToggleStream,
  activeScenario,
  onSelectScenario,
  onReset,
  totalEvents,
  lastEventTime,
  loadingScenario,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Stream Engine Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="toggle-stream-btn"
            onClick={onToggleStream}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              isStreaming
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
            }`}
          >
            {isStreaming ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop Live Demo Stream
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Start Live Demo Stream (2s)
              </>
            )}
          </button>

          <button
            id="reset-demo-btn"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-all"
            title="Reset telemetry and metrics to default state"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            Reset Demo
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Scenario Switches */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Layers className="w-3 h-3 text-indigo-400" />
              Scenarios:
            </span>

            <button
              id="scenario-a-btn"
              onClick={() => onSelectScenario('scenario_a')}
              disabled={loadingScenario}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                activeScenario === 'scenario_a'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600 shadow-sm'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              Scenario A: Festival + Monsoon
            </button>

            <button
              id="scenario-b-btn"
              onClick={() => onSelectScenario('scenario_b')}
              disabled={loadingScenario}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                activeScenario === 'scenario_b'
                  ? 'bg-blue-950/80 text-blue-300 border-blue-600 shadow-sm'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              Scenario B: Lab Batch Glitch
            </button>

            <button
              id="scenario-c-btn"
              onClick={() => onSelectScenario('scenario_c')}
              disabled={loadingScenario}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                activeScenario === 'scenario_c'
                  ? 'bg-rose-950/80 text-rose-300 border-rose-600 shadow-sm'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              Scenario C: Emerging Event
            </button>
          </div>
        </div>

        {/* Telemetry Stream Telemetry Badges */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-300 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 self-stretch lg:self-auto justify-between lg:justify-start">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Live Ingested:</span>
            <span className="text-emerald-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-emerald-900/50">
              {totalEvents} events
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Last Webhook:</span>
            <span className="text-slate-300">
              {lastEventTime ? new Date(lastEventTime).toLocaleTimeString() : 'Awaiting stream...'}
            </span>
          </div>

          {isStreaming && (
            <span className="flex items-center gap-1.5 text-emerald-400 font-sans font-medium text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Streaming Active
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
