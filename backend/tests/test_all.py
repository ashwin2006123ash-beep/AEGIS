import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.data_store import data_store
from backend.app.services.privacy_scrubber import inspect_and_sanitize_payload
from backend.app.analytics.engine import analytics_engine
from backend.app.analytics.forecaster import capacity_forecaster

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "AEGIS-Epi" in data["service"]
    assert "privacy_engine" in data

def test_privacy_scrubber_rejection():
    # Direct identifiers must be strictly rejected
    bad_payload = {
        "source": "pharmacy_pos",
        "zone": "Z1_SATHY",
        "patient_name": "Arun Kumar",
        "phone_number": "9842112345",
        "value": 12,
        "signal": "fever_medicine_demand"
    }
    result = inspect_and_sanitize_payload(bad_payload)
    assert result.is_valid is False
    assert result.pii_detected is True
    assert "patient_name" in result.detected_fields or "phone_number" in result.detected_fields

def test_privacy_scrubber_small_cell_suppression():
    small_cell_payload = {
        "source": "clinic_syndromic",
        "zone": "Z1_SATHY",
        "value": 3,
        "signal": "ili_cases"
    }
    result = inspect_and_sanitize_payload(small_cell_payload)
    assert result.is_valid is True
    assert result.small_cell_suppressed is True
    assert result.sanitized_record["value"] == 5

def test_ingest_pos_endpoint_privacy_enforcement():
    # Attempting to post direct identifiers to API returns 422
    response = client.post("/api/v1/ingest/pos", json={
        "customer_name": "Ramesh",
        "phone": "+91 94433-22110",
        "value": 20,
        "signal": "fever_medicine_demand",
        "zone": "Z1_SATHY"
    })
    assert response.status_code == 422
    assert "Privacy Minimization Violation" in response.text

    # Valid sanitized payload succeeds
    valid_resp = client.post("/api/v1/ingest/pos", json={
        "zone": "Z1_SATHY",
        "value": 45,
        "signal": "fever_medicine_demand",
        "unit": "units_sold"
    })
    assert valid_resp.status_code == 200
    assert valid_resp.json()["status"] == "success"

def test_scenarios_differentiation():
    # Scenario A: Festival + Monsoon
    resp_a = client.post("/api/v1/scenarios/activate", json={"scenario": "scenario_a"})
    assert resp_a.status_code == 200
    summary_a = client.get("/api/v1/dashboard/summary?zone_id=Z1_SATHY").json()
    assert summary_a["active_scenario"] == "scenario_a"
    # Confounders like rain or holiday must be flagged
    assert any("Rainfall" in f or "Holiday" in f or "Retail" in f for f in summary_a["false_alarm_flags"])
    # Not Tier 2 because clinic/lab are flat!
    assert summary_a["decision_tier"] in ["Tier 0", "Tier 1"]

    # Scenario B: Lab Batch-Upload Artifact
    resp_b = client.post("/api/v1/scenarios/activate", json={"scenario": "scenario_b"})
    assert resp_b.status_code == 200
    summary_b = client.get("/api/v1/dashboard/summary?zone_id=Z1_SATHY").json()
    assert summary_b["active_scenario"] == "scenario_b"
    assert any("Batch" in f or "Gap" in f for f in summary_b["false_alarm_flags"])
    assert summary_b["decision_tier"] in ["Tier 0", "Tier 1"]

    # Scenario C: Emerging Multi-Signal Health Event
    resp_c = client.post("/api/v1/scenarios/activate", json={"scenario": "scenario_c"})
    assert resp_c.status_code == 200
    summary_c = client.get("/api/v1/dashboard/summary?zone_id=Z1_SATHY").json()
    assert summary_c["active_scenario"] == "scenario_c"
    assert summary_c["decision_tier"] == "Tier 2"
    assert summary_c["corroborating_sources_count"] >= 3
    assert summary_c["cross_source_agreement"] >= 0.75
    # Capacity forecast should detect threshold crossing
    assert summary_c["capacity_forecast"]["capacity_exceeded"] is True
    assert summary_c["capacity_forecast"]["projected_max_shortfall"] > 0

def test_custom_scenario_recalculation():
    # Apply custom sliders: only pharmacy rises (+150%), clinic and lab 0%
    resp = client.post("/api/v1/analysis/custom-scenario", json={
        "zone_id": "Z1_SATHY",
        "pharmacy_demand_change_pct": 150.0,
        "clinic_visit_change_pct": 0.0,
        "lab_positivity_change_pct": 0.0,
        "absenteeism_change_pct": 0.0,
        "data_completeness_pct": 100.0,
        "heavy_rainfall_flag": False
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["active_scenario"] == "custom"
    # Should not declare Tier 2 because it's a single-source rise
    assert data["decision_tier"] in ["Tier 0", "Tier 1"]
    assert data["corroborating_sources_count"] <= 2

def test_governance_action_persistence():
    # Rationale is required for downgrade
    bad_gov = client.post("/api/v1/governance/action", json={
        "reviewer_id": "OFFICER-007",
        "action": "downgrade_investigation",
        "scenario": "scenario_a",
        "zone_id": "Z1_SATHY",
        "heuristic_score": 42.0,
        "decision_tier": "Tier 1",
        "rationale": ""
    })
    assert bad_gov.status_code == 400

    # Valid governance submission
    good_gov = client.post("/api/v1/governance/action", json={
        "reviewer_id": "DEMO-OFFICER-ERODE-01",
        "action": "authorize_plan",
        "scenario": "scenario_c",
        "zone_id": "Z1_SATHY",
        "heuristic_score": 84.5,
        "decision_tier": "Tier 2",
        "rationale": "Field rapid response team authorized for Sathyamangalam based on multi-source clinic and lab corroboration."
    })
    assert good_gov.status_code == 200
    assert "audit_record_id" in good_gov.json()

    # Verify audit log retrieval from SQLite
    audit_resp = client.get("/api/v1/governance/audit-log")
    assert audit_resp.status_code == 200
    records = audit_resp.json()["records"]
    assert len(records) > 0
    assert records[0]["reviewer_id"] == "DEMO-OFFICER-ERODE-01"

def test_simulated_stream_webhook_generator():
    resp = client.post("/api/v1/ingestion/stream/next")
    assert resp.status_code == 200
    evt = resp.json()["event"]
    assert evt["data_mode"] == "synthetic_demo"
    assert evt["pii_present"] is False
    assert evt["source"] in [
        "pharmacy_pos", "clinic_syndromic", "diagnostic_lab",
        "school_workplace_absenteeism", "hospital_capacity",
        "environmental_weather", "mobility_calendar"
    ]
