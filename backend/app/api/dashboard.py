from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any
from ..models.schemas import DashboardSummaryResponse
from ..services.data_store import data_store
from ..analytics.engine import analytics_engine
from ..analytics.agents import three_agent_engine
from ..analytics.forecaster import capacity_forecaster

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])

def generate_signal_attributions(timeline: List[Dict[str, Any]], false_alarm_flags: List[str]) -> List[Dict[str, Any]]:
    if not timeline:
        return []
    latest = timeline[-1]
    pharm_z = latest.get("pharmacy_demand_z", 0.0)
    clinic_z = latest.get("clinic_visits_z", 0.0)
    lab_z = latest.get("lab_positivity_z", 0.0)
    abs_z = latest.get("absenteeism_z", 0.0)
    rain = latest.get("rainfall_mm", 0.0)
    holiday = latest.get("holiday_flag", 0)

    attributions = [
        {
            "signal_name": "Pharmacy Antipyretic Demand",
            "source_category": "Retail POS Feeds",
            "current_status": "Elevated" if pharm_z >= 1.8 else "Normal",
            "z_score": pharm_z,
            "contribution_level": "High" if pharm_z >= 2.5 else ("Moderate" if pharm_z >= 1.8 else "Baseline"),
            "role": "Strengthens hypothesis" if pharm_z >= 1.8 else "Neutral baseline",
            "explanation": "Elevated over-the-counter antipyretic sales reflect community-level symptomatic self-medication."
        },
        {
            "signal_name": "Clinic Syndromic Consultations",
            "source_category": "Primary Care Outpatient",
            "current_status": "Elevated" if clinic_z >= 1.8 else "Normal",
            "z_score": clinic_z,
            "contribution_level": "Critical" if clinic_z >= 2.5 else ("Moderate" if clinic_z >= 1.8 else "Baseline"),
            "role": "Strengthens clinical hypothesis" if clinic_z >= 1.8 else "Disconfirms widespread clinical surge",
            "explanation": "Outpatient ILI consultations provide high-specificity medical confirmation of symptomatic illness."
        },
        {
            "signal_name": "Diagnostic Laboratory Positivity",
            "source_category": "Clinical Diagnostics",
            "current_status": "Elevated" if lab_z >= 1.8 else "Normal",
            "z_score": lab_z,
            "contribution_level": "Critical" if lab_z >= 2.5 else ("Moderate" if lab_z >= 1.8 else "Baseline"),
            "role": "Confirmatory biological signal" if lab_z >= 1.8 else "Neutral",
            "explanation": "Laboratory positivity rate isolates biological pathogen activity from non-specific demand artifacts."
        },
        {
            "signal_name": "Institutional Absenteeism",
            "source_category": "Schools & Workplaces",
            "current_status": "Elevated" if abs_z >= 1.8 else "Normal",
            "z_score": abs_z,
            "contribution_level": "Moderate" if abs_z >= 1.8 else "Baseline",
            "role": "Corroborates community disruption" if abs_z >= 1.8 else "Neutral",
            "explanation": "Population-level absenteeism tracks early community-wide productivity impairment and morbidity."
        },
        {
            "signal_name": "Meteorological & Calendar Telemetry",
            "source_category": "Environmental / Municipal",
            "current_status": "Potential Confounder Active" if (rain > 25.0 or holiday == 1) else "Baseline Clean",
            "z_score": round(rain / 20.0, 1),
            "contribution_level": "High Confounder" if (rain > 25.0 or holiday == 1) else "None",
            "role": "Weakens outbreak hypothesis (Non-epidemic explanation)" if (rain > 25.0 or holiday == 1) else "Supports genuine signal",
            "explanation": "Monsoon rainfall and festival holidays trigger retail stocking and travel absences independent of disease."
        }
    ]
    return attributions

def generate_recommendations(tier: str, false_alarm_flags: List[str], zone_id: str) -> List[Dict[str, Any]]:
    if tier == "Tier 2":
        return [
            {
                "id": "rec-1",
                "title": "Dispatch Rapid Response Surveillance Team",
                "tier": "Tier 2 — Priority Human Review",
                "action_type": "Field Investigation",
                "rationale": "High multi-source corroboration (clinical + laboratory + pharmacy) confirmed in Sathyamangalam.",
                "supporting_evidence": "Z-Scores exceeding +2.5 across independent healthcare feeds.",
                "remaining_uncertainty": "Specific microbiological pathogen and genomic variant unconfirmed.",
                "next_step": "Collect 25 paired acute/convalescent serology samples for confirmatory ELISA / RT-PCR."
            },
            {
                "id": "rec-2",
                "title": "Activate Hospital Surge Bed Capacity Protocol",
                "tier": "Tier 2 — Priority Human Review",
                "action_type": "Capacity Preparedness",
                "rationale": "7-day statistical capacity forecast projects available bed threshold (120 beds) breach within 72 hours.",
                "supporting_evidence": "Occupied beds rising sharply with projected shortfall of 22 beds.",
                "remaining_uncertainty": "ICU vs non-acute ward utilization ratio.",
                "next_step": "Reserve 30 flex beds at Sathyamangalam Taluk Hospital and alert Perundurai Medical College for referral intake."
            },
            {
                "id": "rec-3",
                "title": "Initiate Inter-Zone Public Health Advisory",
                "tier": "Tier 2 — Priority Human Review",
                "action_type": "Communication",
                "rationale": "Mobility telemetry indicates high transit flow between Sathyamangalam and Gobichettipalayam.",
                "supporting_evidence": "Transit inflow index +35% with secondary cluster emerging in Zone 2.",
                "remaining_uncertainty": "Community adherence to preventive measures.",
                "next_step": "Issue targeted fever clinic guidance to primary health centers along the NH-209 corridor."
            }
        ]
    elif tier == "Tier 1":
        return [
            {
                "id": "rec-1",
                "title": "Audit Source-Level Data Completeness & Retail Dispensation",
                "tier": "Tier 1 — Investigation",
                "action_type": "Data Verification",
                "rationale": "Elevated retail or absenteeism signal detected without corroborating clinical outpatient rise.",
                "supporting_evidence": "Pharmacy OTC demand high but outpatient ILI consultations remain flat.",
                "remaining_uncertainty": "Whether pharmacy spike reflects wholesale stocking or mild sub-clinical illness.",
                "next_step": "Contact 5 sentinel retail pharmacies in Zone to verify whether bulk institutional purchases occurred."
            },
            {
                "id": "rec-2",
                "title": "Review Meteorological & Festival Calendar Impact",
                "tier": "Tier 1 — Investigation",
                "action_type": "Confounder Assessment",
                "rationale": "Active monsoon precipitation or holiday schedule accounts for school absenteeism.",
                "supporting_evidence": "; ".join(false_alarm_flags) if false_alarm_flags else "Weather sensor flags",
                "remaining_uncertainty": "Whether rainfall may subsequently trigger vector breeding in 7-10 days.",
                "next_step": "Schedule vector density larval sampling (Aedes Breteau Index) following monsoon drainage."
            }
        ]
    else:
        return [
            {
                "id": "rec-1",
                "title": "Continue Routine Epidemiological Telemetry Surveillance",
                "tier": "Tier 0 — Low Concern",
                "action_type": "Routine Monitoring",
                "rationale": "All core indicators within expected normal variance (+/- 1.5 sigma).",
                "supporting_evidence": "Cross-source agreement < 25%, zero sustained multi-day clusters.",
                "remaining_uncertainty": "Standard surveillance latency (24-48 hours).",
                "next_step": "Maintain automated edge telemetry ingestion and check 24-hour sync health."
            },
            {
                "id": "rec-2",
                "title": "Reconcile Ingestion Cadence & Diagnostic Reporting Gaps",
                "tier": "Tier 0 — Low Concern",
                "action_type": "Technical Reconciliation",
                "rationale": "Batch upload backlogs or reporting gaps resolved without clinical corroboration.",
                "supporting_evidence": "Diagnostic lab telemetry verified as delayed upload batch dump.",
                "remaining_uncertainty": "Laboratory transmission interface stability.",
                "next_step": "Ensure Laboratory Information System (LIS) webhook retry queue operates on 15-minute cadence."
            }
        ]

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(zone_id: Optional[str] = Query("Z1_SATHY")):
    data = data_store.get_active_data()
    selected_zone = zone_id if zone_id and zone_id in ["Z1_SATHY", "Z2_GOBI", "Z3_ERODE", "Z4_PERUNDURAI", "Z5_BHAVANI"] else "Z1_SATHY"

    # Compute metrics
    agreement, severity, quality, completeness, corroborating_count, flags, heuristic_score, tier, uncertainty = \
        analytics_engine.calculate_executive_metrics(data, zone_id=selected_zone)

    # Compute zone statuses
    zones = analytics_engine.evaluate_zone_anomalies(data)

    # 3-Agent evaluation
    three_agents = three_agent_engine.evaluate_evidence(data, zone_id=selected_zone, active_scenario=data_store.active_scenario)

    # 7-day capacity forecast
    forecast = capacity_forecaster.forecast_7_days(data, zone_id=selected_zone)

    # Timeline & signal attributions
    timeline = analytics_engine.compute_timeline_and_anomalies(data, zone_filter=selected_zone)
    attributions = generate_signal_attributions(timeline, flags)
    recommendations = generate_recommendations(tier, flags, selected_zone)

    return DashboardSummaryResponse(
        active_scenario=data_store.active_scenario,
        active_scenario_title=data_store.scenario_titles.get(data_store.active_scenario, "Active Scenario"),
        selected_zone=selected_zone,
        cross_source_agreement=agreement,
        anomaly_severity=severity,
        evidence_quality=quality,
        data_completeness=completeness,
        corroborating_sources_count=corroborating_count,
        false_alarm_flags=flags,
        heuristic_evidence_score=heuristic_score,
        decision_tier=tier,
        decision_tier_label=f"{tier} — {'Priority Human Review' if tier=='Tier 2' else ('Investigation' if tier=='Tier 1' else 'Low Concern')}",
        uncertainty_statement=uncertainty,
        zones=zones,
        agent_evaluations=three_agents,
        capacity_forecast=forecast,
        signal_attributions=attributions,
        recommendations=recommendations,
        total_ingested_events=len(data_store.ingested_events),
        system_status="operational",
        demo_mode=True
    )
