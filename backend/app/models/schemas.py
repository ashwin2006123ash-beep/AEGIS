from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime

# Zone Definitions
ZONE_NAMES = {
    "Z1_SATHY": "Zone 1 — Sathyamangalam",
    "Z2_GOBI": "Zone 2 — Gobichettipalayam",
    "Z3_ERODE": "Zone 3 — Erode Urban",
    "Z4_PERUNDURAI": "Zone 4 — Perundurai",
    "Z5_BHAVANI": "Zone 5 — Bhavani",
}

# Source Categories
SOURCE_CATEGORIES = [
    "pharmacy_pos",
    "school_workplace_absenteeism",
    "clinic_syndromic",
    "diagnostic_lab",
    "hospital_capacity",
    "environmental_weather",
    "mobility_calendar"
]

class ZoneStatus(BaseModel):
    zone_id: str
    zone_name: str
    status_color: Literal["emerald", "amber", "rose"]
    severity_level: Literal["Normal", "Investigation", "Priority Review"]
    anomaly_score: float
    contributing_signals: List[str]
    last_updated: str
    data_freshness_minutes: int
    active_anomaly: bool = False

class TelemetryEvent(BaseModel):
    id: Optional[str] = None
    source: str
    zone: str
    signal: str
    value: float
    unit: str
    timestamp: str
    data_mode: Literal["synthetic_demo", "file_upload", "authorized_integration"] = "synthetic_demo"
    pii_present: bool = False
    small_cell_suppressed: bool = False
    metadata: Optional[Dict[str, Any]] = None

class IngestionStatusResponse(BaseModel):
    sources: Dict[str, Dict[str, Any]]
    total_events_ingested: int
    last_event_timestamp: Optional[str]
    stream_active: bool
    active_scenario: str

class PrivacyValidationResult(BaseModel):
    is_valid: bool
    pii_detected: bool
    detected_fields: List[str]
    small_cell_suppressed: bool
    original_record_preview: Dict[str, Any]
    sanitized_record: Optional[Dict[str, Any]]
    message: str

class AgentEvaluation(BaseModel):
    agent_id: str
    agent_title: str
    role_description: str
    status: Literal["normal", "investigating", "alert"]
    headline: str
    findings: List[str]
    observations_supporting: List[str]
    alternative_explanations: List[str]
    missing_evidence: List[str]
    reasoning: str

class ThreeAgentEngineResponse(BaseModel):
    epidemiologist: AgentEvaluation
    skeptic: AgentEvaluation
    arbiter: AgentEvaluation
    verdict_tier: Literal["Tier 0", "Tier 1", "Tier 2"]
    verdict_label: str
    heuristic_evidence_score: float
    uncertainty_statement: str
    cross_source_agreement: float
    corroborating_sources: List[str]

class ForecastDay(BaseModel):
    date: str
    day_offset: int
    is_historical: bool
    demand_beds: float
    lower_bound: float
    upper_bound: float
    capacity_threshold: int = 120

class CapacityForecast(BaseModel):
    zone_id: str
    hospital_name: str
    available_beds: int
    forecast_days: List[ForecastDay]
    capacity_exceeded: bool
    exceeded_date: Optional[str]
    projected_max_shortfall: float
    methodology: str
    data_limitation_warning: Optional[str]

class TimelinePoint(BaseModel):
    date: str
    pharmacy_demand_z: Optional[float] = None
    clinic_visits_z: Optional[float] = None
    lab_positivity_z: Optional[float] = None
    absenteeism_z: Optional[float] = None
    rainfall_mm: Optional[float] = None
    holiday_flag: Optional[int] = None
    batch_upload_flag: Optional[int] = None
    reporting_gap: Optional[int] = None
    raw_pharmacy: Optional[float] = None
    raw_clinic: Optional[float] = None
    raw_lab_positivity: Optional[float] = None
    raw_absenteeism: Optional[float] = None

class DashboardSummaryResponse(BaseModel):
    active_scenario: str
    active_scenario_title: str
    selected_zone: str
    cross_source_agreement: float
    anomaly_severity: float
    evidence_quality: float
    data_completeness: float
    corroborating_sources_count: int
    false_alarm_flags: List[str]
    heuristic_evidence_score: float
    decision_tier: Literal["Tier 0", "Tier 1", "Tier 2"]
    decision_tier_label: str
    uncertainty_statement: str
    zones: Dict[str, ZoneStatus]
    agent_evaluations: ThreeAgentEngineResponse
    capacity_forecast: CapacityForecast
    signal_attributions: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    total_ingested_events: int
    system_status: str = "operational"
    demo_mode: bool = True

class CustomScenarioRequest(BaseModel):
    zone_id: str = "Z1_SATHY"
    pharmacy_demand_change_pct: float = Field(0.0, ge=-100.0, le=500.0)
    clinic_visit_change_pct: float = Field(0.0, ge=-100.0, le=500.0)
    lab_positivity_change_pct: float = Field(0.0, ge=-100.0, le=500.0)
    absenteeism_change_pct: float = Field(0.0, ge=-100.0, le=500.0)
    data_completeness_pct: float = Field(100.0, ge=10.0, le=100.0)
    reporting_gap_present: bool = False
    batch_upload_spike: bool = False
    heavy_rainfall_flag: bool = False
    festival_holiday_flag: bool = False

class GovernanceActionRequest(BaseModel):
    reviewer_id: str
    action: Literal["authorize_plan", "downgrade_investigation", "dismiss_alert", "reset_scenario"]
    scenario: str
    zone_id: str
    heuristic_score: float
    decision_tier: str
    rationale: str
    data_quality_warnings: List[str] = []

class GovernanceAuditRecord(BaseModel):
    id: int
    timestamp: str
    reviewer_id: str
    action: str
    scenario: str
    zone_id: str
    heuristic_score: float
    decision_tier: str
    rationale: str
    data_quality_warnings: str
