from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict, Any
from copy import deepcopy
from ..models.schemas import CustomScenarioRequest, CapacityForecast
from ..services.data_store import data_store
from ..analytics.engine import analytics_engine
from ..analytics.agents import three_agent_engine
from ..analytics.forecaster import capacity_forecaster

router = APIRouter(prefix="/api/v1/analysis", tags=["Analysis"])

@router.get("/timeline")
def get_analysis_timeline(zone_id: Optional[str] = Query("Z1_SATHY")):
    data = data_store.get_active_data()
    selected_zone = zone_id if zone_id and zone_id in ["Z1_SATHY", "Z2_GOBI", "Z3_ERODE", "Z4_PERUNDURAI", "Z5_BHAVANI"] else "Z1_SATHY"
    timeline = analytics_engine.compute_timeline_and_anomalies(data, zone_filter=selected_zone)
    return {
        "zone_id": selected_zone,
        "active_scenario": data_store.active_scenario,
        "points_count": len(timeline),
        "timeline": timeline
    }

@router.get("/forecast", response_model=CapacityForecast)
def get_capacity_forecast(zone_id: Optional[str] = Query("Z1_SATHY")):
    data = data_store.get_active_data()
    selected_zone = zone_id if zone_id and zone_id in ["Z1_SATHY", "Z2_GOBI", "Z3_ERODE", "Z4_PERUNDURAI", "Z5_BHAVANI"] else "Z1_SATHY"
    return capacity_forecaster.forecast_7_days(data, zone_id=selected_zone)

@router.get("/current")
def get_current_analysis(zone_id: Optional[str] = Query("Z1_SATHY")):
    data = data_store.get_active_data()
    selected_zone = zone_id if zone_id and zone_id in ["Z1_SATHY", "Z2_GOBI", "Z3_ERODE", "Z4_PERUNDURAI", "Z5_BHAVANI"] else "Z1_SATHY"

    agreement, severity, quality, completeness, corroborating_count, flags, heuristic_score, tier, uncertainty = \
        analytics_engine.calculate_executive_metrics(data, zone_id=selected_zone)
    three_agents = three_agent_engine.evaluate_evidence(data, zone_id=selected_zone, active_scenario=data_store.active_scenario)

    return {
        "zone_id": selected_zone,
        "active_scenario": data_store.active_scenario,
        "cross_source_agreement": agreement,
        "anomaly_severity": severity,
        "evidence_quality": quality,
        "data_completeness": completeness,
        "corroborating_sources_count": corroborating_count,
        "false_alarm_flags": flags,
        "heuristic_evidence_score": heuristic_score,
        "decision_tier": tier,
        "uncertainty_statement": uncertainty,
        "agent_evaluations": three_agents
    }

@router.post("/custom-scenario")
def apply_custom_scenario(req: CustomScenarioRequest):
    """
    Applies custom signal changes to the baseline data, updates custom_data,
    sets active_scenario to 'custom', and runs the analytical pipeline dynamically.
    Never returns a hardcoded 55% score!
    """
    # Start from baseline dataset
    base_records = data_store.scenario_data.get("baseline", [])
    if not base_records:
        data_store.load_all_datasets()
        base_records = data_store.scenario_data.get("baseline", [])

    custom_dataset = []
    zone_target = req.zone_id

    all_dates = sorted(list(set(row["date"] for row in base_records)))
    recent_dates = set(all_dates[7:]) if len(all_dates) > 7 else set(all_dates[-4:])

    for row in base_records:
        r = deepcopy(row)
        is_target_row = (r["zone_id"] == zone_target)
        is_recent = (r["date"] in recent_dates)
        
        # Modify signals on recent days based on sliders
        if is_target_row and is_recent and r["source_type"] == "pharmacy_pos" and r["signal_type"] == "fever_medicine_demand":
            multiplier = 1.0 + (req.pharmacy_demand_change_pct / 100.0)
            r["value"] = max(5.0, round(r["value"] * multiplier, 1))

        elif is_target_row and is_recent and r["source_type"] == "clinic_syndromic" and r["signal_type"] == "ili_cases":
            multiplier = 1.0 + (req.clinic_visit_change_pct / 100.0)
            r["value"] = max(5.0, round(r["value"] * multiplier, 1))

        elif is_target_row and is_recent and r["source_type"] == "diagnostic_lab" and r["signal_type"] == "test_positivity_pct":
            multiplier = 1.0 + (req.lab_positivity_change_pct / 100.0)
            r["value"] = max(1.0, round(r["value"] * multiplier, 2))

        elif is_target_row and is_recent and r["source_type"] == "absenteeism" and r["signal_type"] == "absenteeism_pct":
            multiplier = 1.0 + (req.absenteeism_change_pct / 100.0)
            r["value"] = max(2.0, round(r["value"] * multiplier, 1))

        # Hospital bed capacity reaction if clinic visits surge
        elif is_target_row and is_recent and r["source_type"] == "hospital_capacity" and r["signal_type"] == "occupied_beds":
            if req.clinic_visit_change_pct > 50.0:
                surge_factor = 1.0 + (req.clinic_visit_change_pct / 200.0)
                r["value"] = min(145.0, round(r["value"] * surge_factor, 0))

        # Confounder flags
        if is_recent and req.heavy_rainfall_flag:
            r["rainfall_mm"] = 82.5
        if is_recent and req.festival_holiday_flag:
            r["holiday_flag"] = 1
        if is_recent and req.reporting_gap_present and is_target_row and r["source_type"] == "diagnostic_lab":
            r["reporting_gap"] = 1
        if is_recent and req.batch_upload_spike and is_target_row and r["source_type"] == "diagnostic_lab":
            r["batch_upload_flag"] = 1
            if r["signal_type"] == "total_tests":
                r["value"] = 210.0

        custom_dataset.append(r)

    # Store into custom dataset and activate
    data_store.custom_data = custom_dataset
    data_store.activate_scenario("custom")

    # Run analytical pipeline
    agreement, severity, quality, completeness, corroborating_count, flags, heuristic_score, tier, uncertainty = \
        analytics_engine.calculate_executive_metrics(custom_dataset, zone_id=zone_target)
    three_agents = three_agent_engine.evaluate_evidence(custom_dataset, zone_id=zone_target, active_scenario="custom")
    forecast = capacity_forecaster.forecast_7_days(custom_dataset, zone_id=zone_target)

    return {
        "status": "success",
        "zone_id": zone_target,
        "active_scenario": "custom",
        "cross_source_agreement": agreement,
        "anomaly_severity": severity,
        "evidence_quality": quality,
        "data_completeness": completeness,
        "corroborating_sources_count": corroborating_count,
        "false_alarm_flags": flags,
        "heuristic_evidence_score": heuristic_score,
        "decision_tier": tier,
        "uncertainty_statement": uncertainty,
        "agent_evaluations": three_agents,
        "capacity_forecast": forecast
    }

@router.post("/custom-scenario/reset")
def reset_custom_scenario():
    data_store.custom_data = []
    data_store.activate_scenario("scenario_a")
    return {
        "status": "success",
        "active_scenario": "scenario_a",
        "message": "Custom signal injection cleared. Returned to Scenario A."
    }
