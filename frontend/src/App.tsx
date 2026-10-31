import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { TelemetryHubPage } from './pages/TelemetryHubPage';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { CustomSignalModal } from './components/CustomSignalModal';
import { api } from './services/api';
import type {
  DashboardSummaryResponse,
  IngestionStatusResponse,
  TimelinePoint,
  TelemetryEvent,
} from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'telemetry' | 'command'>('command');
  const [selectedZone, setSelectedZone] = useState<string>('Z1_SATHY');
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [ingestionStatus, setIngestionStatus] = useState<IngestionStatusResponse | null>(null);
  const [recentEvents, setRecentEvents] = useState<TelemetryEvent[]>([]);
  
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingScenario, setLoadingScenario] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [customModalOpen, setCustomModalOpen] = useState<boolean>(false);

  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load dashboard and timeline data
  const loadDashboardData = useCallback(async (zoneId: string = selectedZone) => {
    try {
      const [sumRes, timeRes, ingRes, evtRes] = await Promise.all([
        api.getDashboardSummary(zoneId),
        api.getTimeline(zoneId),
        api.getIngestionStatus(),
        api.getIngestedEvents(30),
      ]);
      setSummary(sumRes);
      setTimeline(timeRes.timeline || []);
      setIngestionStatus(ingRes);
      setRecentEvents(evtRes.events || []);
      setBackendOnline(true);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setBackendOnline(false);
    }
  }, [selectedZone]);

  // Initial load
  useEffect(() => {
    loadDashboardData(selectedZone);
  }, [loadDashboardData, selectedZone]);

  // Handle live stream toggle (~2s interval)
  useEffect(() => {
    if (isStreaming) {
      streamIntervalRef.current = setInterval(async () => {
        try {
          const res = await api.triggerNextStreamEvent();
          if (res?.event) {
            setRecentEvents((prev) => [res.event, ...prev.slice(0, 49)]);
            // Increment total count locally
            setIngestionStatus((prev) => prev ? {
              ...prev,
              total_events_ingested: prev.total_events_ingested + 1,
              last_event_timestamp: res.event.timestamp,
            } : null);
          }
        } catch (err) {
          console.error('Error sending streaming webhook:', err);
        }
      }, 2000);
    } else {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    }

    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    };
  }, [isStreaming]);

  // Scenario Activation
  const handleSelectScenario = async (scenarioKey: string) => {
    setLoadingScenario(true);
    try {
      await api.activateScenario(scenarioKey);
      await loadDashboardData(selectedZone);
    } catch (err) {
      console.error('Error activating scenario:', err);
    } finally {
      setLoadingScenario(false);
    }
  };

  // Scenario Reset
  const handleResetScenario = async () => {
    setLoadingScenario(true);
    try {
      await api.resetScenario();
      await loadDashboardData(selectedZone);
    } catch (err) {
      console.error('Error resetting scenario:', err);
    } finally {
      setLoadingScenario(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData(selectedZone);
    setRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Global Navigation Bar */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        selectedZone={selectedZone}
        onZoneChange={(newZone) => {
          setSelectedZone(newZone);
          loadDashboardData(newZone);
        }}
        summary={summary}
        backendOnline={backendOnline}
        onOpenCustomModal={() => setCustomModalOpen(true)}
        onRefresh={handleManualRefresh}
        refreshing={refreshing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 space-y-6">
        {currentTab === 'telemetry' ? (
          <TelemetryHubPage
            isStreaming={isStreaming}
            onToggleStream={() => setIsStreaming((prev) => !prev)}
            activeScenario={summary?.active_scenario || 'scenario_a'}
            onSelectScenario={handleSelectScenario}
            onReset={handleResetScenario}
            statusData={ingestionStatus}
            events={recentEvents}
            onClearTerminal={() => setRecentEvents([])}
            loadingScenario={loadingScenario}
            onRefreshData={handleManualRefresh}
          />
        ) : (
          <CommandCenterPage
            summary={summary}
            timeline={timeline}
            selectedZone={selectedZone}
            onSelectZone={(newZone) => {
              setSelectedZone(newZone);
              loadDashboardData(newZone);
            }}
            onScenarioReset={handleResetScenario}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 px-4 text-xs text-slate-500 text-center font-mono space-y-1">
        <div>
          AEGIS-Epi • AI-Powered Public Health Early-Warning & Causal Decision Intelligence Platform
        </div>
        <div className="text-[11px] text-slate-400">
          TCS AI for Impact Hackathon • Simulated Telemetry Demo Mode • Automated Medical Interventions Disabled
        </div>
      </footer>

      {/* Custom Signal Spike Injection Modal */}
      <CustomSignalModal
        isOpen={customModalOpen}
        onClose={() => setCustomModalOpen(false)}
        selectedZone={selectedZone}
        onScenarioApplied={() => loadDashboardData(selectedZone)}
      />
    </div>
  );
};

export default App;
