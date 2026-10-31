import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from ..services.auth import get_current_user, require_admin
from ..database import get_connection, log_governance_action, get_audit_logs
from ..services.data_store import data_store
from ..analytics.engine import analytics_engine
from ..analytics.agents import three_agent_engine
from ..analytics.forecaster import capacity_forecaster

router = APIRouter(prefix="/api/v1/admin", tags=["Central Administrator Dashboard"])

LOCATION_TO_ZONE = {
    "SATHYAMANGALAM": "Z1_SATHY",
    "GOBICHETTIPALAYAM": "Z2_GOBI",
    "ERODE": "Z3_ERODE"
}

ZONE_TO_LOCATION = {
    "Z1_SATHY": "SATHYAMANGALAM",
    "Z2_GOBI": "GOBICHETTIPALAYAM",
    "Z3_ERODE": "ERODE",
    "Z4_PERUNDURAI": "ERODE",
    "Z5_BHAVANI": "SATHYAMANGALAM"
}

LOCATION_METADATA = {
    "SATHYAMANGALAM": {
        "name": "Sathyamangalam",
        "taluk": "Sathyamangalam Taluk",
        "district": "Erode District",
        "population": 115000,
        "facility": "Sathyamangalam Taluk Hospital (150 Beds)",
        "risk_profile": "Peri-urban Agricultural & Transit Node",
        "coordinates": {"lat": 11.5034, "lng": 77.2343}
    },
    "ERODE": {
        "name": "Erode Urban",
        "taluk": "Erode Taluk",
        "district": "Erode District",
        "population": 521000,
        "facility": "Erode Government Headquarters Hospital (450 Beds)",
        "risk_profile": "Dense Commercial & Industrial Center",
        "coordinates": {"lat": 11.3410, "lng": 77.7172}
    },
    "GOBICHETTIPALAYAM": {
        "name": "Gobichettipalayam",
        "taluk": "Gobichettipalayam Taluk",
        "district": "Erode District",
        "population": 180000,
        "facility": "Gobi Government Hospital (180 Beds)",
        "risk_profile": "Agricultural Hub & Educational Zone",
        "coordinates": {"lat": 11.4549, "lng": 77.4334}
    }
}

class GovernanceActionRequest(BaseModel):
    action: str  # "APPROVE", "ESCALATE", "REQUEST_MORE_DATA", "REJECT", "ACKNOWLEDGE"
    location_id: str
    rationale: str
    recommendation_id: Optional[str] = None
    priority_level: Optional[str] = "High"

@router.get("/locations")
def list_locations(user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve all authorized surveillance locations with connected organization statistics."""
    require_admin(user)
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT l.id, l.name, l.district, l.state, l.population, l.active,
               COUNT(DISTINCT o.id) as organization_count,
               COUNT(DISTINCT c.id) as connected_sources_count
        FROM locations l
        LEFT JOIN organizations o ON l.id = o.location_id
        LEFT JOIN source_connectors c ON o.id = c.organization_id
        GROUP BY l.id
        ORDER BY l.name ASC
    """)
    rows = cursor.fetchall()
    conn.close()

    locations = []
    for r in rows:
        meta = LOCATION_METADATA.get(r["id"], {})
        locations.append({
            "id": r["id"],
            "name": r["name"],
            "district": r["district"],
            "state": r["state"],
            "population": r["population"],
            "active": bool(r["active"]),
            "organization_count": r["organization_count"],
            "connected_sources_count": r["connected_sources_count"],
            "facility": meta.get("facility", "Taluk Health Facility"),
            "risk_profile": meta.get("risk_profile", "Municipal Area")
        })

    return {
        "status": "success",
        "count": len(locations),
        "locations": locations,
        "active_timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    }

@router.get("/organizations")
def list_organizations(
    location_id: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve authorized client organizations and their source connector status."""
    require_admin(user)
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT o.id, o.name, o.type, o.location_id, o.contact_email, o.status,
               l.name as location_name,
               c.source_type, c.sync_status, c.last_sync_timestamp, c.records_count, c.endpoint_url
        FROM organizations o
        JOIN locations l ON o.location_id = l.id
        LEFT JOIN source_connectors c ON o.id = c.organization_id
    """
    params = []
    if location_id:
        query += " WHERE o.location_id = ?"
        params.append(location_id)
    query += " ORDER BY o.location_id, o.name"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    organizations = []
    for r in rows:
        organizations.append({
            "id": r["id"],
            "name": r["name"],
            "type": r["type"],
            "location_id": r["location_id"],
            "location_name": r["location_name"],
            "status": r["status"],
            "connector": {
                "source_type": r["source_type"] or r["type"],
                "sync_status": r["sync_status"] or "connected_simulated",
                "last_sync": r["last_sync_timestamp"],
                "records_count": r["records_count"] or 0,
                "endpoint_url": r["endpoint_url"]
            },
            "privacy_scope": "Aggregate Telemetry Only (Zero PII Transmitted)"
        })

    return {
        "status": "success",
        "location_filter": location_id or "ALL",
        "count": len(organizations),
        "organizations": organizations
    }

def generate_location_recommendations(
    tier: str, 
    flags: List[str], 
    location_id: str,
    meta: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Generates location-tailored actionable recommendations for public health analysts."""
    loc_name = meta.get("name", location_id)
    facility = meta.get("facility", "Taluk Hospital")
    
    if tier == "Tier 2":
        return [
            {
                "id": f"REC-{location_id}-01",
                "title": f"Deploy Rapid Epidemiological Surveillance Unit to {loc_name}",
                "tier": "Tier 2 — Priority Human Review",
                "action_type": "Field Investigation",
                "priority": "Critical",
                "rationale": f"Statistically significant multi-stream elevation (Z > +2.5) corroborated across pharmacy and primary health clinics in {loc_name}.",
                "supporting_evidence": f"Pharmacy antipyretic demand and clinic syndromic consultations elevated synchronously over 48 hours without confounding rainfall.",
                "remaining_uncertainty": "Specific microbiological pathogen strain, viral vs bacterial etiology, and exact genomic variant remain unverified.",
                "suggested_next_step": f"Direct District Mobile Field Unit to collect 30 paired throat/nasopharyngeal swabs across sentinel primary health centers in {loc_name}.",
                "review_status": "Pending Human Approval"
            },
            {
                "id": f"REC-{location_id}-02",
                "title": f"Pre-emptively Reserve Surge Bed Allocation at {facility}",
                "tier": "Tier 2 — Priority Human Review",
                "action_type": "Hospital Surge Preparedness",
                "priority": "High",
                "rationale": f"Statistical 7-day capacity model projects inpatient admissions exceeding nominal capacity within 72-96 hours.",
                "supporting_evidence": f"Exponential trajectory in syndromic outpatient admissions indicates projected shortfall of 18-25 beds.",
                "remaining_uncertainty": "Exact ICU ventilation requirement vs general medical ward bed utilization ratio.",
                "suggested_next_step": f"Issue advisory to medical superintendent at {facility} to convert Step-Down Ward B to 25 acute respiratory flex beds.",
                "review_status": "Pending Human Approval"
            },
            {
                "id": f"REC-{location_id}-03",
                "title": f"Issue Targeted Primary Care Fever Protocol in {loc_name}",
                "tier": "Tier 2 — Priority Human Review",
                "action_type": "Public Health Advisory",
                "priority": "Moderate",
                "rationale": f"Transit corridor mobility data indicates secondary transmission risk to adjacent taluks.",
                "supporting_evidence": f"Early symptom onset reports concentrated in central bus terminus and bazaar wards.",
                "remaining_uncertainty": "Community self-isolation compliance and OTC antipyretic usage suppression of clinical presentation.",
                "suggested_next_step": f"Dispatch standard operating fever diagnosis SOPs and oral rehydration packets to all licensed dispensaries in {loc_name}.",
                "review_status": "Pending Human Approval"
            }
        ]
    elif tier == "Tier 1":
        return [
            {
                "id": f"REC-{location_id}-01",
                "title": f"Audit Source Data Telemetry & Verify Retail Dispensation in {loc_name}",
                "tier": "Tier 1 — Investigation",
                "action_type": "Data Verification",
                "priority": "Moderate",
                "rationale": f"Elevated retail pharmacy signal detected in {loc_name} without parallel clinical consultation surge.",
                "supporting_evidence": "Pharmacy OTC demand elevated (Z > 1.8) while primary outpatient ILI visits remain within normal baseline variance.",
                "remaining_uncertainty": "Whether retail spike represents genuine early community prodrome or commercial bulk inventory replenishment.",
                "suggested_next_step": f"Telephone 4 sentinel retail pharmacies in {loc_name} to confirm whether individual patient purchases or institutional wholesale occurred.",
                "review_status": "Pending Human Approval"
            },
            {
                "id": f"REC-{location_id}-02",
                "title": f"Cross-Reference Environmental Precipitation & Festival Calendar in {loc_name}",
                "tier": "Tier 1 — Investigation",
                "action_type": "Confounder Assessment",
                "priority": "Low",
                "rationale": f"Confounder flags active ({'; '.join(flags) if flags else 'Local Holiday/Weather'}).",
                "supporting_evidence": "Rainfall or holiday flags may explain institutional absenteeism and transient retail stockpiling.",
                "remaining_uncertainty": "Potential post-monsoon mosquito breeding and vector transmission timeline (7-14 day incubation).",
                "suggested_next_step": f"Coordinate with {loc_name} Municipal Sanitation Department to inspect open storm water drainage channels.",
                "review_status": "Pending Human Approval"
            }
        ]
    else:
        return [
            {
                "id": f"REC-{location_id}-01",
                "title": f"Maintain Routine Epidemiological Surveillance in {loc_name}",
                "tier": "Tier 0 — Low Concern",
                "action_type": "Routine Monitoring",
                "priority": "Routine",
                "rationale": f"All aggregate health telemetry streams for {loc_name} remain within standard statistical variance (+/- 1.5 sigma).",
                "supporting_evidence": "Multi-source agreement < 20%; no clustering detected across pharmacy, clinic, or absenteeism channels.",
                "remaining_uncertainty": "Routine 24-hour ingestion latency from peripheral diagnostic labs.",
                "suggested_next_step": f"Continue passive monitoring and inspect daily sync health reports across {loc_name} nodes.",
                "review_status": "Acknowledged"
            },
            {
                "id": f"REC-{location_id}-02",
                "title": f"Audit Laboratory & Clinic Ingestion Pipeline Cadence",
                "tier": "Tier 0 — Low Concern",
                "action_type": "Data Quality Assurance",
                "priority": "Routine",
                "rationale": "Verify that zero-PII client aggregation scripts are transmitting consistently.",
                "supporting_evidence": "Diagnostic laboratory telemetry confirms steady baseline without batch dump anomalies.",
                "remaining_uncertainty": "Edge connector internet connectivity stability.",
                "suggested_next_step": f"Confirm automated nightly data aggregation heartbeat for all 5 registered organizations in {loc_name}.",
                "review_status": "Acknowledged"
            }
        ]

@router.get("/summary")
def get_admin_summary(
    location_id: str = Query("SATHYAMANGALAM", description="Target location ID (SATHYAMANGALAM, ERODE, GOBICHETTIPALAYAM)"),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Central Population-Level Surveillance Summary:
    Retrieves authorized aggregate data for the specific location, recalculates cross-source AI metrics,
    3-agent evaluation, capacity forecast, and actionable recommendations.
    Strict tenant and location scoping: never mixes records from different locations!
    """
    require_admin(user)

    norm_loc = location_id.strip().upper()
    if norm_loc not in LOCATION_TO_ZONE:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported location ID '{location_id}'. Supported locations: {list(LOCATION_TO_ZONE.keys())}"
        )

    zone_id = LOCATION_TO_ZONE[norm_loc]
    meta = LOCATION_METADATA.get(norm_loc, {})

    # Retrieve all data from active scenario in data_store
    active_data = data_store.get_active_data()

    # Recalculate executive metrics for THIS specific location's zone
    agreement, severity, quality, completeness, corroborating_count, flags, heuristic_score, tier, uncertainty = \
        analytics_engine.calculate_executive_metrics(active_data, zone_id=zone_id)

    # 3-Agent evaluation tailored to this location
    agent_evaluations = three_agent_engine.evaluate_evidence(
        active_data, 
        zone_id=zone_id, 
        active_scenario=data_store.active_scenario
    )

    # 7-day healthcare capacity forecast for this location's hospital
    capacity_forecast = capacity_forecaster.forecast_7_days(active_data, zone_id=zone_id)

    # 14-day aggregated timeline for this location
    timeline = analytics_engine.compute_timeline_and_anomalies(active_data, zone_filter=zone_id)

    # Generate signal attributions from timeline
    attributions = []
    if timeline:
        latest = timeline[-1]
        pharm_z = latest.get("pharmacy_demand_z", 0.0)
        clinic_z = latest.get("clinic_visits_z", 0.0)
        lab_z = latest.get("lab_positivity_z", 0.0)
        abs_z = latest.get("absenteeism_z", 0.0)
        rain = latest.get("rainfall_mm", 0.0)
        holiday = latest.get("holiday_flag", 0)

        attributions = [
            {
                "signal_name": "Pharmacy Antipyretic Sales",
                "source_category": "Retail Over-the-Counter",
                "current_status": "Elevated" if pharm_z >= 1.8 else "Normal",
                "z_score": pharm_z,
                "contribution_level": "High" if pharm_z >= 2.5 else ("Moderate" if pharm_z >= 1.8 else "Baseline"),
                "role": "Strengthens community outbreak hypothesis" if pharm_z >= 1.8 else "Neutral baseline",
                "explanation": f"Daily antipyretic OTC sales in {meta.get('name')} pharmacy network."
            },
            {
                "signal_name": "Primary Outpatient Syndromic ILI",
                "source_category": "Clinical Consultation",
                "current_status": "Elevated" if clinic_z >= 1.8 else "Normal",
                "z_score": clinic_z,
                "contribution_level": "Critical" if clinic_z >= 2.5 else ("Moderate" if clinic_z >= 1.8 else "Baseline"),
                "role": "Confirmatory clinical signal" if clinic_z >= 1.8 else "Disconfirms widespread acute clinical surge",
                "explanation": f"Outpatient influenza-like illness consultations reported by {meta.get('name')} clinics."
            },
            {
                "signal_name": "Diagnostic Laboratory Positivity",
                "source_category": "Pathology Diagnostics",
                "current_status": "Elevated" if lab_z >= 1.8 else "Normal",
                "z_score": lab_z,
                "contribution_level": "Critical" if lab_z >= 2.5 else ("Moderate" if lab_z >= 1.8 else "Baseline"),
                "role": "Confirmatory biological indicator" if lab_z >= 1.8 else "Neutral",
                "explanation": f"Molecular and rapid diagnostic test positivity rate in {meta.get('name')} laboratories."
            },
            {
                "signal_name": "Educational Institutional Absenteeism",
                "source_category": "School Surveillance",
                "current_status": "Elevated" if abs_z >= 1.8 else "Normal",
                "z_score": abs_z,
                "contribution_level": "Moderate" if abs_z >= 1.8 else "Baseline",
                "role": "Corroborates community disruption" if abs_z >= 1.8 else "Neutral",
                "explanation": f"Daily student absenteeism across registered school councils in {meta.get('name')}."
            },
            {
                "signal_name": "Meteorological & Calendar Confounder",
                "source_category": "Environmental Sensors",
                "current_status": "Potential Confounder Active" if (rain > 25.0 or holiday == 1) else "Clean Baseline",
                "z_score": round(rain / 20.0, 1),
                "contribution_level": "High Confounder" if (rain > 25.0 or holiday == 1) else "None",
                "role": "Weakens outbreak hypothesis (Non-epidemic factor)" if (rain > 25.0 or holiday == 1) else "Supports genuine biological surge",
                "explanation": f"Precipitation ({rain} mm) and holiday flag ({holiday}) evaluated for non-disease retail stockpiling."
            }
        ]

    # Location-tailored recommendations playbook (Final Analytical Section)
    recommendations = generate_location_recommendations(tier, flags, norm_loc, meta)

    # Fetch connected organizations for this location
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT o.id, o.name, o.type, c.sync_status, c.last_sync_timestamp, c.records_count
        FROM organizations o
        LEFT JOIN source_connectors c ON o.id = c.organization_id
        WHERE o.location_id = ?
    """, (norm_loc,))
    org_rows = cursor.fetchall()
    
    # Fetch recent audit decisions for this location
    cursor.execute("""
        SELECT id, timestamp, reviewer_id, action, decision_tier, rationale
        FROM audit_logs
        WHERE location_id = ? OR location_id IS NULL
        ORDER BY id DESC LIMIT 5
    """, (norm_loc,))
    recent_audits = cursor.fetchall()
    conn.close()

    orgs_summary = [
        {
            "id": r["id"],
            "name": r["name"],
            "type": r["type"],
            "sync_status": r["sync_status"] or "connected_simulated",
            "last_sync": r["last_sync_timestamp"],
            "records_count": r["records_count"] or 0
        }
        for r in org_rows
    ]

    return {
        "location": {
            "id": norm_loc,
            "name": meta.get("name", norm_loc),
            "district": meta.get("district", "Erode District"),
            "population": meta.get("population", 100000),
            "facility": meta.get("facility", "Taluk Health Facility"),
            "risk_profile": meta.get("risk_profile", "Urban Area"),
            "coordinates": meta.get("coordinates", {"lat": 11.5, "lng": 77.2})
        },
        "analysis_timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "active_scenario": data_store.active_scenario,
        "active_scenario_title": data_store.scenario_titles.get(data_store.active_scenario, "Active Scenario"),
        "executive_metrics": {
            "cross_source_agreement": agreement,
            "anomaly_severity": severity,
            "evidence_quality": quality,
            "data_completeness": completeness,
            "corroborating_sources_count": corroborating_count,
            "false_alarm_flags": flags,
            "heuristic_evidence_score": heuristic_score,
            "decision_tier": tier,
            "decision_tier_label": f"{tier} — {'Priority Human Review' if tier=='Tier 2' else ('Investigation' if tier=='Tier 1' else 'Low Concern')}",
            "uncertainty_statement": uncertainty
        },
        "connected_organizations": orgs_summary,
        "agent_evaluations": agent_evaluations,
        "capacity_forecast": capacity_forecast,
        "signal_attributions": attributions,
        "recommendations": recommendations,
        "recent_audit_decisions": [
            {
                "id": a["id"],
                "timestamp": a["timestamp"],
                "reviewer_id": a["reviewer_id"],
                "action": a["action"],
                "decision_tier": a["decision_tier"],
                "rationale": a["rationale"]
            }
            for a in recent_audits
        ],
        "privacy_status": {
            "pii_filtered": True,
            "small_cell_masking": "active_k_anonymity",
            "data_minimization": "enforced_client_side"
        },
        "synthetic_demo_label": "SIMULATED EPIDEMIOLOGICAL DATASET — FOR SURVEILLANCE DECISION SUPPORT DEMONSTRATION ONLY"
    }

@router.get("/timeline")
def get_admin_timeline(
    location_id: str = Query("SATHYAMANGALAM"),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve 14-day aggregated multi-source time-series for the selected location."""
    require_admin(user)
    norm_loc = location_id.strip().upper()
    zone_id = LOCATION_TO_ZONE.get(norm_loc, "Z1_SATHY")
    active_data = data_store.get_active_data()
    timeline = analytics_engine.compute_timeline_and_anomalies(active_data, zone_filter=zone_id)
    return {
        "location_id": norm_loc,
        "zone_id": zone_id,
        "timeline_points": len(timeline),
        "data": timeline
    }

@router.get("/forecast")
def get_admin_forecast(
    location_id: str = Query("SATHYAMANGALAM"),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve 7-day hospital bed capacity forecast for the selected location."""
    require_admin(user)
    norm_loc = location_id.strip().upper()
    zone_id = LOCATION_TO_ZONE.get(norm_loc, "Z1_SATHY")
    active_data = data_store.get_active_data()
    forecast = capacity_forecaster.forecast_7_days(active_data, zone_id=zone_id)
    return {
        "location_id": norm_loc,
        "hospital_facility": LOCATION_METADATA.get(norm_loc, {}).get("facility", "Taluk Health Facility"),
        "forecast": forecast
    }

@router.get("/recommendations")
def get_admin_recommendations(
    location_id: str = Query("SATHYAMANGALAM"),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve actionable recommendations playbook for the selected location (Final Analytical Section)."""
    require_admin(user)
    norm_loc = location_id.strip().upper()
    zone_id = LOCATION_TO_ZONE.get(norm_loc, "Z1_SATHY")
    meta = LOCATION_METADATA.get(norm_loc, {})
    active_data = data_store.get_active_data()
    _, _, _, _, _, flags, _, tier, _ = analytics_engine.calculate_executive_metrics(active_data, zone_id=zone_id)
    recs = generate_location_recommendations(tier, flags, norm_loc, meta)
    return {
        "location_id": norm_loc,
        "decision_tier": tier,
        "recommendations": recs
    }

@router.post("/governance/action")
def record_governance_decision(
    req: GovernanceActionRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Human-in-the-Loop Governance:
    Records an authorized public health official's review decision into the SQLite audit ledger.
    Requires server-side admin role verification.
    """
    require_admin(user)
    norm_loc = req.location_id.strip().upper()
    zone_id = LOCATION_TO_ZONE.get(norm_loc, "Z1_SATHY")
    
    # Calculate current score for the audit record
    active_data = data_store.get_active_data()
    _, _, _, _, _, flags, heuristic_score, tier, _ = analytics_engine.calculate_executive_metrics(active_data, zone_id=zone_id)

    record_id = log_governance_action(
        reviewer_id=user.get("username", "admin"),
        action=f"{req.action} (Recommendation: {req.recommendation_id or 'General'})",
        scenario=data_store.active_scenario,
        zone_id=zone_id,
        heuristic_score=heuristic_score,
        decision_tier=tier,
        rationale=req.rationale,
        data_quality_warnings=flags,
        location_id=norm_loc
    )

    return {
        "status": "success",
        "audit_id": record_id,
        "recorded_action": req.action,
        "location_id": norm_loc,
        "reviewer": user.get("username"),
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "message": f"Human review decision '{req.action}' successfully committed to immutable audit ledger."
    }

@router.get("/governance/audit-log")
def get_admin_audit_log(
    location_id: Optional[str] = None,
    limit: int = 50,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve audit logs filtered by location."""
    require_admin(user)
    logs = get_audit_logs(limit=limit, location_id=location_id)
    return {
        "status": "success",
        "count": len(logs),
        "location_filter": location_id or "ALL",
        "audit_logs": logs
    }
