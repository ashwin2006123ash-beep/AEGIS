import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { TelemetryHubPage } from './pages/TelemetryHubPage';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { ClientDashboardPage } from './pages/ClientDashboardPage';
import { CustomSignalModal } from './components/CustomSignalModal';
import { RoleSwitcherModal } from './components/RoleSwitcherModal';
import { api, getAuthToken } from './services/api';
import type {
  DashboardSummaryResponse,
  IngestionStatusResponse,
  TimelinePoint,
  TelemetryEvent,
  UserProfile,
} from './types';

export const App: React.FC = () => {
  // Check URL query parameters for initial dashboard route
  const getInitialTab = (): 'command' | 'client' | 'telemetry' => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') || params.get('dashboard');
      if (tab === 'client') return 'client';
      if (tab === 'telemetry') return 'telemetry';
      if (tab === 'admin' || tab === 'command') return 'command';
    }
    return 'command';
  };

  const [currentTab, setCurrentTab] = useState<'telemetry' | 'command' | 'client'>(getInitialTab);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState<boolean>(false);

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

  // Sync browser URL parameter when tab changes
  const handleTabChange = (newTab: 'telemetry' | 'command' | 'client') => {
    setCurrentTab(newTab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('dashboard', newTab === 'command' ? 'admin' : newTab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Initialize Auth: check existing session or auto-login with default demo account
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (getAuthToken()) {
          const me = await api.getMe();
          if (me?.user) {
            setCurrentUser(me.user);
            return;
          }
        }
        // Auto-login with default admin demo account if no token
        const loginRes = await api.login('admin', 'AdminPass123!');
        setCurrentUser(loginRes.user);
      } catch (err) {
        console.warn('Initial auth session check completed with fallback:', err);
      }
    };
    initAuth();
  }, []);

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

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    if (user.role === 'client') {
      handleTabChange('client');
    } else {
      handleTabChange('command');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Global Navigation Bar */}
      <Header
        currentTab={currentTab}
        onTabChange={handleTabChange}
        selectedZone={selectedZone}
        onZoneChange={(newZone) => {
          setSelectedZone(newZone);
          loadDashboardData(newZone);
        }}
        summary={summary}
        backendOnline={backendOnline}
        currentUser={currentUser}
        onOpenRoleSwitcher={() => setRoleModalOpen(true)}
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
        ) : currentTab === 'client' ? (
          <ClientDashboardPage
            currentUser={currentUser}
            onOpenRoleSwitcher={() => setRoleModalOpen(true)}
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
            onSelectOrganization={(_orgId) => {
              handleTabChange('client');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 px-4 text-xs text-slate-500 text-center font-mono space-y-1">
        <div>
          AEGIS-Epi • AI-Powered Public Health Early-Warning & Causal Decision Intelligence Platform
        </div>
        <div className="text-[11px] text-slate-400">
          TCS AI for Impact Hackathon • Separate Client & Central Public Health Dashboards • Automated Medical Interventions Disabled
        </div>
      </footer>

      {/* Custom Signal Spike Injection Modal */}
      <CustomSignalModal
        isOpen={customModalOpen}
        onClose={() => setCustomModalOpen(false)}
        selectedZone={selectedZone}
        onScenarioApplied={() => loadDashboardData(selectedZone)}
      />

      {/* Identity & Role Switcher Modal */}
      <RoleSwitcherModal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default App;
