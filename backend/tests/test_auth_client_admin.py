import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_auth_demo_users_list():
    response = client.get("/api/v1/auth/demo-users")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 6
    roles = {u["role"] for u in data}
    assert "admin" in roles
    assert "client" in roles
    usernames = [u["username"] for u in data]
    assert "admin" in usernames
    assert "pharm_sathy" in usernames
    assert "clinic_erode" in usernames

def test_auth_login_success_and_me():
    # 1. Admin login
    admin_res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "AdminPass123!"
    })
    assert admin_res.status_code == 200
    admin_data = admin_res.json()
    assert "access_token" in admin_data
    assert admin_data["user"]["role"] == "admin"
    admin_token = admin_data["access_token"]

    # Check /me with token
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["user"]["username"] == "admin"

    # 2. Client login
    client_res = client.post("/api/v1/auth/login", json={
        "username": "pharm_sathy",
        "password": "ClientPass123!"
    })
    assert client_res.status_code == 200
    client_data = client_res.json()
    assert client_data["user"]["role"] == "client"
    assert client_data["user"]["organization_id"] == "PHARM_SATHY_01"

def test_auth_login_invalid_credentials():
    bad_res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "WrongPassword999!"
    })
    assert bad_res.status_code == 401
    assert "Invalid username or password" in bad_res.json()["detail"]

def test_client_dashboard_endpoints():
    login_res = client.post("/api/v1/auth/login", json={
        "username": "pharm_sathy",
        "password": "ClientPass123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Profile
    prof_res = client.get("/api/v1/client/profile", headers=headers)
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["organization_id"] == "PHARM_SATHY_01"
    assert prof["type"] == "pharmacy"
    assert "connector" in prof

    # Analysis
    analysis_res = client.get("/api/v1/client/analysis", headers=headers)
    assert analysis_res.status_code == 200
    analysis = analysis_res.json()
    assert "metrics" in analysis
    assert "recommendations" in analysis
    assert "timeline" in analysis
    assert len(analysis["timeline"]) > 0

    # Connector Sync
    sync_res = client.post("/api/v1/client/connector/sync", headers=headers)
    assert sync_res.status_code == 200
    assert sync_res.json()["status"] == "success"

    # Connector Config
    cfg_res = client.post("/api/v1/client/connector/config", json={
        "endpoint_url": "https://api.sathy.healthnet.gov.in/v1/pharmacy/custom",
        "auth_type": "mutual_tls",
        "cadence": "realtime",
        "small_cell_masking": True
    }, headers=headers)
    assert cfg_res.status_code == 200

def test_client_tenant_isolation_enforcement():
    # pharm_sathy is assigned to PHARM_SATHY_01
    login_res = client.post("/api/v1/auth/login", json={
        "username": "pharm_sathy",
        "password": "ClientPass123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempting to access another organization's telemetry must yield 403 Tenant Violation
    cross_res = client.get("/api/v1/client/profile?org_id=CLINIC_ERODE_01", headers=headers)
    assert cross_res.status_code == 403
    assert "Tenant Violation" in cross_res.json()["detail"]

def test_client_csv_upload_privacy_enforcement():
    login_res = client.post("/api/v1/auth/login", json={
        "username": "pharm_sathy",
        "password": "ClientPass123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. CSV containing PII direct identifiers must be rejected with 422
    bad_csv = "date,value,patient_name,phone\n2026-10-25,12,John Doe,9998887776\n"
    res_pii = client.post(
        "/api/v1/client/upload-csv",
        files={"file": ("pos_data.csv", bad_csv, "text/csv")},
        headers=headers
    )
    assert res_pii.status_code == 422
    assert "Privacy Minimization Violation" in res_pii.text

    # 2. Valid aggregate CSV succeeds and applies small-cell suppression (<5)
    good_csv = "date,value,unit\n2026-10-26,3,units_sold\n2026-10-27,45,units_sold\n"
    res_good = client.post(
        "/api/v1/client/upload-csv",
        files={"file": ("pos_clean.csv", good_csv, "text/csv")},
        headers=headers
    )
    assert res_good.status_code == 200
    data = res_good.json()
    assert data["rows_ingested"] == 2
    assert data["small_cells_suppressed"] == 1  # 3 was masked to 5

def test_admin_dashboard_endpoints():
    # 1. Client trying to access admin endpoint gets 403
    client_login = client.post("/api/v1/auth/login", json={
        "username": "pharm_sathy",
        "password": "ClientPass123!"
    })
    client_token = client_login.json()["access_token"]
    forbidden_res = client.get("/api/v1/admin/locations", headers={"Authorization": f"Bearer {client_token}"})
    assert forbidden_res.status_code == 403

    # 2. Admin login
    admin_login = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "AdminPass123!"
    })
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Locations
    locs_res = client.get("/api/v1/admin/locations", headers=admin_headers)
    assert locs_res.status_code == 200
    locations = locs_res.json()["locations"]
    assert len(locations) >= 3
    loc_ids = [l["id"] for l in locations]
    assert "SATHYAMANGALAM" in loc_ids
    assert "ERODE" in loc_ids
    assert "GOBICHETTIPALAYAM" in loc_ids

    # Organizations
    orgs_res = client.get("/api/v1/admin/organizations", headers=admin_headers)
    assert orgs_res.status_code == 200
    assert len(orgs_res.json()["organizations"]) >= 10

    # Summary for Sathyamangalam
    sum_res = client.get("/api/v1/admin/summary?location_id=SATHYAMANGALAM", headers=admin_headers)
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert summary["location"]["id"] == "SATHYAMANGALAM"
    assert "executive_metrics" in summary
    assert "agent_evaluations" in summary
    assert "capacity_forecast" in summary
    assert "signal_attributions" in summary
    assert "recommendations" in summary
    assert len(summary["recommendations"]) > 0

    # Human-in-the-Loop Governance Action
    gov_action_res = client.post("/api/v1/admin/governance/action", json={
        "action": "APPROVE",
        "location_id": "SATHYAMANGALAM",
        "rationale": "Field rapid response unit deployed to Sathyamangalam based on multi-source confirmation.",
        "recommendation_id": "REC-SATHYAMANGALAM-01",
        "priority_level": "Critical"
    }, headers=admin_headers)
    assert gov_action_res.status_code == 200
    assert gov_action_res.json()["status"] == "success"

    # Admin Audit Log
    audit_res = client.get("/api/v1/admin/governance/audit-log?location_id=SATHYAMANGALAM", headers=admin_headers)
    assert audit_res.status_code == 200
    assert len(audit_res.json()["audit_logs"]) > 0

