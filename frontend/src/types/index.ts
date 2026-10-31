export interface ZoneStatus {
  zone_id: string;
  zone_name: string;
  status_color: 'emerald' | 'amber' | 'rose';
  severity_level: 'Normal' | 'Investigation' | 'Priority Review';
  anomaly_score: number;
  contributing_signals: string[];
  last_updated: string;
  data_freshness_minutes: number;
  active_anomaly: boolean;
}

export interface TelemetryEvent {
  id?: string;
  source: string;
  zone: string;
  signal: string;
  value: number;
  unit: string;
  timestamp: string;
  data_mode: 'synthetic_demo' | 'file_upload' | 'authorized_integration';
  pii_present: boolean;
  small_cell_suppressed: boolean;
  metadata?: Record<string, any>;
}

export interface IngestionStatusResponse {
  sources: Record<string, {
    name: string;
    status: string;
    freshness_minutes: number;
    records_received: number;
    signal_types: string[];
    validation_status: string;
    source_type: string;
    last_sync: string;
  }>;
  total_events_ingested: number;
  last_event_timestamp: string | null;
  stream_active: boolean;
  active_scenario: string;
}

export interface PrivacyDemoScrubber {
  raw_record: Record<string, any>;
  redacted_fields: string[];
  sanitized_event: Record<string, any>;
  k_anonymity_note: string;
}

export interface AgentEvaluation {
  agent_id: string;
  agent_title: string;
  role_description: string;
  status: 'normal' | 'investigating' | 'alert';
  headline: string;
  findings: string[];
  observations_supporting: string[];
  alternative_explanations: string[];
  missing_evidence: string[];
  reasoning: string;
}

export interface ThreeAgentEngineResponse {
  epidemiologist: AgentEvaluation;
  skeptic: AgentEvaluation;
  arbiter: AgentEvaluation;
  verdict_tier: 'Tier 0' | 'Tier 1' | 'Tier 2';
  verdict_label: string;
  heuristic_evidence_score: number;
  uncertainty_statement: string;
  cross_source_agreement: number;
  corroborating_sources: string[];
}

export interface ForecastDay {
  date: string;
  day_offset: number;
  is_historical: boolean;
  demand_beds: number;
  lower_bound: number;
  upper_bound: number;
  capacity_threshold: number;
}

export interface CapacityForecast {
  zone_id: string;
  hospital_name: string;
  available_beds: number;
  forecast_days: ForecastDay[];
  capacity_exceeded: boolean;
  exceeded_date: string | null;
  projected_max_shortfall: number;
  methodology: string;
  data_limitation_warning: string | null;
}

export interface TimelinePoint {
  date: string;
  pharmacy_demand_z?: number;
  clinic_visits_z?: number;
  lab_positivity_z?: number;
  absenteeism_z?: number;
  rainfall_mm?: number;
  holiday_flag?: number;
  batch_upload_flag?: number;
  reporting_gap?: number;
  raw_pharmacy?: number;
  raw_clinic?: number;
  raw_lab_positivity?: number;
  raw_absenteeism?: number;
}

export interface SignalAttribution {
  signal_name: string;
  source_category: string;
  current_status: string;
  z_score: number;
  contribution_level: string;
  role: string;
  explanation: string;
}

export interface RecommendationItem {
  id: string;
  title: string;
  tier: string;
  action_type: string;
  rationale: string;
  supporting_evidence: string;
  remaining_uncertainty: string;
  next_step: string;
}

export interface DashboardSummaryResponse {
  active_scenario: string;
  active_scenario_title: string;
  selected_zone: string;
  cross_source_agreement: number;
  anomaly_severity: number;
  evidence_quality: number;
  data_completeness: number;
  corroborating_sources_count: number;
  false_alarm_flags: string[];
  heuristic_evidence_score: number;
  decision_tier: 'Tier 0' | 'Tier 1' | 'Tier 2';
  decision_tier_label: string;
  uncertainty_statement: string;
  zones: Record<string, ZoneStatus>;
  agent_evaluations: ThreeAgentEngineResponse;
  capacity_forecast: CapacityForecast;
  signal_attributions: SignalAttribution[];
  recommendations: RecommendationItem[];
  total_ingested_events: number;
  system_status: string;
  demo_mode: boolean;
}

export interface CustomScenarioRequest {
  zone_id: string;
  pharmacy_demand_change_pct: number;
  clinic_visit_change_pct: number;
  lab_positivity_change_pct: number;
  absenteeism_change_pct: number;
  data_completeness_pct: number;
  reporting_gap_present: boolean;
  batch_upload_spike: boolean;
  heavy_rainfall_flag: boolean;
  festival_holiday_flag: boolean;
}

export interface GovernanceAuditRecord {
  id: number;
  timestamp: string;
  reviewer_id: string;
  action: string;
  scenario: string;
  zone_id: string;
  location_id?: string;
  organization_id?: string;
  heuristic_score: number;
  decision_tier: string;
  rationale: string;
  data_quality_warnings: string;
}

// Authentication & Users
export interface UserProfile {
  id: string;
  username: string;
  role: 'admin' | 'client';
  organization_id?: string | null;
  location_id?: string | null;
  full_name: string;
  organization_name?: string | null;
  organization_type?: string | null;
  location_name?: string | null;
}

export interface DemoUser {
  role: 'admin' | 'client';
  username: string;
  password: string;
  label: string;
  organization: string;
  location: string;
  description: string;
}

// Client Dashboard Types
export interface ConnectorInfo {
  status: string;
  last_sync: string;
  records_count: number;
  endpoint_url?: string;
  auth_type?: string;
  source_type?: string;
  config?: Record<string, any>;
}

export interface ClientOrganizationProfile {
  organization_id: string;
  name: string;
  type: string;
  location_id: string;
  location_name: string;
  district: string;
  state: string;
  contact_email: string;
  status: string;
  connector: ConnectorInfo;
  privacy_guarantee: string;
}

export interface ClientTimelinePoint {
  date: string;
  value: number;
  unit: string;
  baseline_mean: number;
  upper_bound: number;
  lower_bound: number;
  z_score: number;
  is_anomalous: boolean;
}

export interface ClientRecommendation {
  id: string;
  priority: string;
  action: string;
  rationale: string;
  step: string;
}

export interface ClientAnalysisResponse {
  organization: {
    id: string;
    name: string;
    type: string;
    location_id: string;
    location_name: string;
    connector_status: string;
    last_sync: string;
    records_count: number;
    endpoint_url?: string;
    auth_type?: string;
  };
  metrics: {
    primary_signal: string;
    unit: string;
    current_value: number;
    baseline_mean: number;
    baseline_std: number;
    current_z_score: number;
    percentage_change: number;
    anomaly_detected: boolean;
    severity_level: string;
    severity_badge: string;
    data_completeness: number;
    analysis_date: string;
    algorithm_version: string;
  };
  ingestion_health: {
    status: string;
    warnings: string[];
  };
  timeline: ClientTimelinePoint[];
  recommendations: ClientRecommendation[];
  disclaimer: string;
}

export interface ClientObservationRecord {
  id: number;
  date: string;
  signal_type: string;
  value: number;
  unit: string;
  data_mode: string;
  small_cell_masked: number;
  created_at: string;
}

// Central Public Health Dashboard Types
export interface AdminLocation {
  id: string;
  name: string;
  district: string;
  state: string;
  population: number;
  active: boolean;
  organization_count: number;
  connected_sources_count: number;
  facility: string;
  risk_profile: string;
}

export interface AdminOrganization {
  id: string;
  name: string;
  type: string;
  location_id: string;
  location_name: string;
  status: string;
  connector: {
    source_type: string;
    sync_status: string;
    last_sync: string;
    records_count: number;
    endpoint_url?: string;
  };
  privacy_scope: string;
}

export interface AdminRecommendation {
  id: string;
  title: string;
  tier: string;
  action_type: string;
  priority: string;
  rationale: string;
  supporting_evidence: string;
  remaining_uncertainty: string;
  suggested_next_step: string;
  review_status: string;
}

export interface AdminSummaryResponse {
  location: {
    id: string;
    name: string;
    district: string;
    population: number;
    facility: string;
    risk_profile: string;
    coordinates: { lat: number; lng: number };
  };
  analysis_timestamp: string;
  active_scenario: string;
  active_scenario_title: string;
  executive_metrics: {
    cross_source_agreement: number;
    anomaly_severity: number;
    evidence_quality: number;
    data_completeness: number;
    corroborating_sources_count: number;
    false_alarm_flags: string[];
    heuristic_evidence_score: number;
    decision_tier: 'Tier 0' | 'Tier 1' | 'Tier 2';
    decision_tier_label: string;
    uncertainty_statement: string;
  };
  connected_organizations: {
    id: string;
    name: string;
    type: string;
    sync_status: string;
    last_sync: string;
    records_count: number;
  }[];
  agent_evaluations: ThreeAgentEngineResponse;
  capacity_forecast: CapacityForecast;
  signal_attributions: SignalAttribution[];
  recommendations: AdminRecommendation[];
  recent_audit_decisions: {
    id: number;
    timestamp: string;
    reviewer_id: string;
    action: string;
    decision_tier: string;
    rationale: string;
  }[];
  privacy_status: {
    pii_filtered: boolean;
    small_cell_masking: string;
    data_minimization: string;
  };
  synthetic_demo_label: string;
}
