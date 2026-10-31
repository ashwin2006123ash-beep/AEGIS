import React from 'react';
import { ExecutiveSummary } from '../components/command/ExecutiveSummary';
import { FiveZoneDistrictMap } from '../components/command/FiveZoneDistrictMap';
import { MultiSignalTimeline } from '../components/command/MultiSignalTimeline';
import { SignalAttribution } from '../components/command/SignalAttribution';
import { ThreeAgentEnginePanel } from '../components/command/ThreeAgentEnginePanel';
import { CapacityForecasterPanel } from '../components/command/CapacityForecasterPanel';
import { RecommendationPlaybook } from '../components/command/RecommendationPlaybook';
import { GovernanceReviewPanel } from '../components/command/GovernanceReviewPanel';
import { ConnectedOrganizationsList } from '../components/command/ConnectedOrganizationsList';
import type { DashboardSummaryResponse, TimelinePoint } from '../types';

interface CommandCenterPageProps {
  summary: DashboardSummaryResponse | null;
  timeline: TimelinePoint[];
  selectedZone: string;
  onSelectZone: (zoneId: string) => void;
  onScenarioReset: () => void;
  onSelectOrganization?: (orgId: string) => void;
}

export const CommandCenterPage: React.FC<CommandCenterPageProps> = ({
  summary,
  timeline,
  selectedZone,
  onSelectZone,
  onScenarioReset,
  onSelectOrganization,
}) => {
  if (!summary) return null;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. Executive Summary & Decision Tier Banner */}
      <ExecutiveSummary summary={summary} />

      {/* 2. Map & Timeline Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-5 flex flex-col">
          <FiveZoneDistrictMap
            zones={summary.zones}
            selectedZone={selectedZone}
            onSelectZone={onSelectZone}
          />
        </div>
        <div className="xl:col-span-7 flex flex-col">
          <MultiSignalTimeline
            timeline={timeline}
            selectedZone={selectedZone}
          />
        </div>
      </div>

      {/* 3. Connected Sentinel Organizations (Edge Client Partners) */}
      <ConnectedOrganizationsList
        selectedZone={selectedZone}
        onSelectOrganization={onSelectOrganization}
      />

      {/* 4. Signal Attribution Breakdown */}
      <SignalAttribution attributions={summary.signal_attributions} />

      {/* 5. Three-Agent Evidence Evaluation Engine */}
      <ThreeAgentEnginePanel agentsData={summary.agent_evaluations} />

      {/* 6. Seven-Day Healthcare Capacity Forecaster */}
      <CapacityForecasterPanel forecast={summary.capacity_forecast} />

      {/* 7. Dynamic Recommendation Action Playbook */}
      <RecommendationPlaybook
        recommendations={summary.recommendations}
        tier={summary.decision_tier}
      />

      {/* 8. Human-in-the-Loop Governance & Persistent Audit Log */}
      <GovernanceReviewPanel
        activeScenario={summary.active_scenario}
        selectedZone={selectedZone}
        heuristicScore={summary.heuristic_evidence_score}
        decisionTier={summary.decision_tier}
        onScenarioReset={onScenarioReset}
      />
    </div>
  );
};
