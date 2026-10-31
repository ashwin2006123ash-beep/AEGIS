import React from 'react';
import { StreamController } from '../components/telemetry/StreamController';
import { SourceCategoryCards } from '../components/telemetry/SourceCategoryCards';
import { HospitalBillingIntegration } from '../components/telemetry/HospitalBillingIntegration';
import { PrivacyScrubberDemo } from '../components/telemetry/PrivacyScrubberDemo';
import { LiveTerminal } from '../components/telemetry/LiveTerminal';
import type { IngestionStatusResponse, TelemetryEvent } from '../types';

interface TelemetryHubPageProps {
  isStreaming: boolean;
  onToggleStream: () => void;
  activeScenario: string;
  onSelectScenario: (scenario: string) => void;
  onReset: () => void;
  statusData: IngestionStatusResponse | null;
  events: TelemetryEvent[];
  onClearTerminal: () => void;
  loadingScenario: boolean;
  onRefreshData: () => void;
}

export const TelemetryHubPage: React.FC<TelemetryHubPageProps> = ({
  isStreaming,
  onToggleStream,
  activeScenario,
  onSelectScenario,
  onReset,
  statusData,
  events,
  onClearTerminal,
  loadingScenario,
  onRefreshData,
}) => {
  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Stream & Scenario Controller */}
      <StreamController
        isStreaming={isStreaming}
        onToggleStream={onToggleStream}
        activeScenario={activeScenario}
        onSelectScenario={onSelectScenario}
        onReset={onReset}
        totalEvents={statusData?.total_events_ingested ?? events.length}
        lastEventTime={statusData?.last_event_timestamp || null}
        loadingScenario={loadingScenario}
      />

      {/* Seven Source Category Cards */}
      <SourceCategoryCards statusData={statusData} />

      {/* Hospital/Billing Integration & Live Terminal */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <HospitalBillingIntegration onUploadSuccess={onRefreshData} />
        <LiveTerminal events={events} onClear={onClearTerminal} />
      </div>

      {/* Privacy Scrubber Explanation */}
      <PrivacyScrubberDemo />
    </div>
  );
};
