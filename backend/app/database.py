import sqlite3
import os
import hashlib
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "aegis_audit.db")

def hash_password(password: str) -> str:
    """Hash password with SHA-256 and constant salt for demo security."""
    salt = "aegis_epi_salt_2026"
    return hashlib.sha256((salt + password).encode('utf-8')).hexdigest()

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Locations
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS locations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            district TEXT NOT NULL,
            state TEXT NOT NULL,
            population INTEGER NOT NULL,
            hospital_name TEXT NOT NULL,
            bed_capacity INTEGER NOT NULL DEFAULT 120,
            active INTEGER NOT NULL DEFAULT 1
        )
    """)

    # 2. Organizations (Clients)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS organizations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL, -- pharmacy, clinic, laboratory, school, hospital
            location_id TEXT NOT NULL,
            api_key TEXT NOT NULL,
            contact_email TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL,
            FOREIGN KEY (location_id) REFERENCES locations(id)
        )
    """)

    # 3. Users
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL, -- client, admin
            organization_id TEXT,
            location_id TEXT,
            full_name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (location_id) REFERENCES locations(id)
        )
    """)

    # 4. Source Connectors & Sync Status
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS source_connectors (
            id TEXT PRIMARY KEY,
            organization_id TEXT NOT NULL,
            location_id TEXT NOT NULL,
            source_type TEXT NOT NULL,
            connector_type TEXT NOT NULL DEFAULT 'api', -- api, csv, simulated
            endpoint_url TEXT,
            auth_type TEXT DEFAULT 'mutual_tls',
            sync_status TEXT NOT NULL DEFAULT 'connected_simulated',
            last_sync_timestamp TEXT NOT NULL,
            records_count INTEGER NOT NULL DEFAULT 0,
            config_json TEXT,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (location_id) REFERENCES locations(id)
        )
    """)

    # 5. Aggregated Observations (Tenant and Location Isolated)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS aggregated_observations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id TEXT NOT NULL,
            location_id TEXT NOT NULL,
            source_type TEXT NOT NULL,
            signal_type TEXT NOT NULL,
            date TEXT NOT NULL,
            value REAL NOT NULL,
            unit TEXT NOT NULL,
            is_synthetic INTEGER NOT NULL DEFAULT 1,
            data_mode TEXT NOT NULL DEFAULT 'synthetic_demo',
            small_cell_masked INTEGER NOT NULL DEFAULT 0,
            metadata_json TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (location_id) REFERENCES locations(id)
        )
    """)

    # Index for fast tenant & location queries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_obs_org_date ON aggregated_observations(organization_id, date)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_obs_loc_date ON aggregated_observations(location_id, date)
    """)

    # 6. Client Analyses
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS client_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id TEXT NOT NULL,
            location_id TEXT NOT NULL,
            analysis_date TEXT NOT NULL,
            baseline_mean REAL NOT NULL,
            baseline_std REAL NOT NULL,
            current_value REAL NOT NULL,
            current_z_score REAL NOT NULL,
            anomaly_detected INTEGER NOT NULL,
            severity_tier TEXT NOT NULL,
            trend_summary TEXT NOT NULL,
            data_completeness REAL NOT NULL,
            recommendations_json TEXT NOT NULL,
            algorithm_version TEXT NOT NULL DEFAULT 'client-zscore-v1.2',
            created_at TEXT NOT NULL,
            FOREIGN KEY (organization_id) REFERENCES organizations(id)
        )
    """)

    # 7. Central Governance Audit Logs (Preserving & expanding existing schema)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            reviewer_id TEXT NOT NULL,
            action TEXT NOT NULL,
            scenario TEXT NOT NULL,
            zone_id TEXT NOT NULL,
            location_id TEXT,
            organization_id TEXT,
            heuristic_score REAL NOT NULL,
            decision_tier TEXT NOT NULL,
            rationale TEXT NOT NULL,
            data_quality_warnings TEXT NOT NULL
        )
    """)

    # Migration: ensure location_id and organization_id exist in audit_logs
    cursor.execute("PRAGMA table_info(audit_logs)")
    columns = [col[1] for col in cursor.fetchall()]
    if "location_id" not in columns:
        cursor.execute("ALTER TABLE audit_logs ADD COLUMN location_id TEXT")
    if "organization_id" not in columns:
        cursor.execute("ALTER TABLE audit_logs ADD COLUMN organization_id TEXT")

    # 8. Scenario & Application State
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scenario_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    conn.commit()
    seed_demo_data(cursor)
    conn.commit()
    conn.close()

def seed_demo_data(cursor):
    """Seed locations, organizations, users, connectors, and initial observations."""
    # Check if locations already seeded
    cursor.execute("SELECT COUNT(*) FROM locations")
    if cursor.fetchone()[0] > 0:
        return

    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # 1. Seed Locations
    locations_data = [
        ("SATHYAMANGALAM", "Sathyamangalam", "Erode District", "Tamil Nadu", 285000, "Sathyamangalam Government Taluk Hospital", 120),
        ("ERODE", "Erode Urban", "Erode District", "Tamil Nadu", 540000, "Erode Government Medical College Hospital", 250),
        ("GOBICHETTIPALAYAM", "Gobichettipalayam", "Erode District", "Tamil Nadu", 390000, "Gobichettipalayam Government Taluk Hospital", 150)
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO locations (id, name, district, state, population, hospital_name, bed_capacity)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, locations_data)

    # 2. Seed Organizations
    orgs_data = [
        # Sathyamangalam Orgs
        ("PHARM_SATHY_01", "Sathyamangalam Care Pharmacy Network", "pharmacy", "SATHYAMANGALAM", "key_pharm_sathy_984", "billing@sathycarepharm.in", "active", now_iso),
        ("CLINIC_SATHY_01", "Sathyamangalam Rural Outpatient Polyclinic", "clinic", "SATHYAMANGALAM", "key_clinic_sathy_214", "director@sathyhealth.org", "active", now_iso),
        ("LAB_SATHY_01", "Sathy Diagnostic & Molecular PathLab", "laboratory", "SATHYAMANGALAM", "key_lab_sathy_551", "lis@sathydiag.in", "active", now_iso),
        ("SCHOOL_SATHY_01", "Sathyamangalam Government Higher Secondary School", "school", "SATHYAMANGALAM", "key_school_sathy_312", "admin@sathyschool.edu.in", "active", now_iso),
        ("HOSP_SATHY_01", "Sathyamangalam Taluk Hospital Census", "hospital", "SATHYAMANGALAM", "key_hosp_sathy_778", "census@sathyhospital.gov.in", "active", now_iso),

        # Erode Urban Orgs
        ("PHARM_ERODE_01", "Erode Central Retail Pharmaceuticals", "pharmacy", "ERODE", "key_pharm_erode_112", "ops@erodecentralpharm.in", "active", now_iso),
        ("CLINIC_ERODE_01", "Erode Urban Primary Health Center", "clinic", "ERODE", "key_clinic_erode_334", "nodal@erodeuphc.gov.in", "active", now_iso),
        ("LAB_ERODE_01", "Erode District Referral Diagnostic Laboratory", "laboratory", "ERODE", "key_lab_erode_665", "records@erodelab.gov.in", "active", now_iso),
        ("SCHOOL_ERODE_01", "Erode City Public Educational Collective", "school", "ERODE", "key_school_erode_889", "attendance@erodecityschools.org", "active", now_iso),
        ("HOSP_ERODE_01", "Erode Medical College Resource Center", "hospital", "ERODE", "key_hosp_erode_441", "superintendent@erodemed.gov.in", "active", now_iso),

        # Gobichettipalayam Orgs
        ("PHARM_GOBI_01", "Gobi Farmers Cooperative Medicals", "pharmacy", "GOBICHETTIPALAYAM", "key_pharm_gobi_552", "counter@gobimedicals.in", "active", now_iso),
        ("CLINIC_GOBI_01", "Gobichettipalayam Community Health Center", "clinic", "GOBICHETTIPALAYAM", "key_clinic_gobi_874", "clinic@gobichc.gov.in", "active", now_iso),
        ("LAB_GOBI_01", "Gobi PathLabs & Clinical Micro", "laboratory", "GOBICHETTIPALAYAM", "key_lab_gobi_221", "info@gobipathlabs.in", "active", now_iso),
        ("SCHOOL_GOBI_01", "Gobichettipalayam Municipal School Council", "school", "GOBICHETTIPALAYAM", "key_school_gobi_992", "office@gobischools.org", "active", now_iso),
        ("HOSP_GOBI_01", "Gobichettipalayam Taluk Hospital Census", "hospital", "GOBICHETTIPALAYAM", "key_hosp_gobi_118", "census@gobihospital.gov.in", "active", now_iso)
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO organizations (id, name, type, location_id, api_key, contact_email, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, orgs_data)

    # 3. Seed Users
    # Password: AdminPass123! for admin, ClientPass123! for client users
    admin_hash = hash_password("AdminPass123!")
    client_hash = hash_password("ClientPass123!")

    users_data = [
        # Administrator
        ("user_admin", "admin", admin_hash, "admin", None, None, "Dr. K. Jayashree (Chief District Epidemiologist)", now_iso),
        
        # Sathy Clients
        ("user_pharm_sathy", "pharm_sathy", client_hash, "client", "PHARM_SATHY_01", "SATHYAMANGALAM", "R. Subramanian (Lead Pharmacist)", now_iso),
        ("user_clinic_sathy", "clinic_sathy", client_hash, "client", "CLINIC_SATHY_01", "SATHYAMANGALAM", "Dr. M. Sangeetha (Senior Medical Officer)", now_iso),
        ("user_lab_sathy", "lab_sathy", client_hash, "client", "LAB_SATHY_01", "SATHYAMANGALAM", "K. Parthiban (LIS Technical Director)", now_iso),
        ("user_school_sathy", "school_sathy", client_hash, "client", "SCHOOL_SATHY_01", "SATHYAMANGALAM", "V. Meenakshi (Attendance Registrar)", now_iso),
        ("user_hosp_sathy", "hosp_sathy", client_hash, "client", "HOSP_SATHY_01", "SATHYAMANGALAM", "S. Prakash (Hospital Superintendent)", now_iso),

        # Erode Clients
        ("user_pharm_erode", "pharm_erode", client_hash, "client", "PHARM_ERODE_01", "ERODE", "A. Karthik (Retail Dispensary Lead)", now_iso),
        ("user_clinic_erode", "clinic_erode", client_hash, "client", "CLINIC_ERODE_01", "ERODE", "Dr. S. Anitha (UPHC In-Charge)", now_iso),
        ("user_lab_erode", "lab_erode", client_hash, "client", "LAB_ERODE_01", "ERODE", "G. Narayanan (Chief Microbiologist)", now_iso),
        ("user_school_erode", "school_erode", client_hash, "client", "SCHOOL_ERODE_01", "ERODE", "T. Rajeshwari (School Health Coordinator)", now_iso),
        ("user_hosp_erode", "hosp_erode", client_hash, "client", "HOSP_ERODE_01", "ERODE", "Dr. V. Chandran (Medical Superintendent)", now_iso),

        # Gobi Clients
        ("user_pharm_gobi", "pharm_gobi", client_hash, "client", "PHARM_GOBI_01", "GOBICHETTIPALAYAM", "N. Balamurugan (Chief Chemist)", now_iso),
        ("user_clinic_gobi", "clinic_gobi", client_hash, "client", "CLINIC_GOBI_01", "GOBICHETTIPALAYAM", "Dr. P. Revathi (Block Medical Officer)", now_iso),
        ("user_lab_gobi", "lab_gobi", client_hash, "client", "LAB_GOBI_01", "GOBICHETTIPALAYAM", "M. Dhanasekaran (Lab Manager)", now_iso),
        ("user_school_gobi", "school_gobi", client_hash, "client", "SCHOOL_GOBI_01", "GOBICHETTIPALAYAM", "K. Sumathi (Headmistress & Health Rep)", now_iso),
        ("user_hosp_gobi", "hosp_gobi", client_hash, "client", "HOSP_GOBI_01", "GOBICHETTIPALAYAM", "R. Dinesh (Hospital Census Lead)", now_iso)
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO users (id, username, password_hash, role, organization_id, location_id, full_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, users_data)

    # 4. Seed Connectors
    for org in orgs_data:
        org_id, org_name, org_type, loc_id = org[0], org[1], org[2], org[3]
        endpoint = f"https://api.{loc_id.lower()}.healthnet.gov.in/v1/{org_type}/feed"
        cursor.execute("""
            INSERT OR IGNORE INTO source_connectors 
            (id, organization_id, location_id, source_type, connector_type, endpoint_url, auth_type, sync_status, last_sync_timestamp, records_count, config_json)
            VALUES (?, ?, ?, ?, 'api', ?, 'mutual_tls', 'connected_simulated', ?, 140, ?)
        """, (
            f"conn_{org_id.lower()}", org_id, loc_id, f"{org_type}_feed", endpoint, now_iso,
            json.dumps({"sync_cadence": "hourly", "schema_version": "v2.1", "encryption": "TLS_1_3", "small_cell_masking": True})
        ))

    # 5. Populate initial 14-day aggregated observations from synthetic files
    seed_observations_from_scenarios(cursor)

def seed_observations_from_scenarios(cursor):
    """Seed aggregated observations for each organization based on location."""
    import csv
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    scenario_c_path = os.path.join(root_dir, "data", "synthetic", "scenario_c.csv")
    scenario_a_path = os.path.join(root_dir, "data", "synthetic", "scenario_a.csv")

    if not os.path.exists(scenario_c_path):
        return

    # Map zones in CSV to our locations
    zone_to_loc = {
        "Z1_SATHY": "SATHYAMANGALAM",
        "Z2_GOBI": "GOBICHETTIPALAYAM",
        "Z3_ERODE": "ERODE",
        "Z4_PERUNDURAI": "ERODE",
        "Z5_BHAVANI": "SATHYAMANGALAM"
    }

    type_to_source = {
        "pharmacy": "pharmacy_pos",
        "clinic": "clinic_syndromic",
        "laboratory": "diagnostic_lab",
        "school": "absenteeism",
        "hospital": "hospital_capacity"
    }

    # Fetch organizations mapping
    cursor.execute("SELECT id, type, location_id FROM organizations")
    org_lookup = {}
    for r in cursor.fetchall():
        org_lookup[(r[1], r[2])] = r[0]

    with open(scenario_c_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            loc_id = zone_to_loc.get(row["zone_id"], "SATHYAMANGALAM")
            src_type = row["source_type"]
            sig_type = row["signal_type"]
            dt = row["date"]
            val = float(row["value"])
            unit = row["unit"]

            # find matching org
            # map source_type to org_type
            org_type = "pharmacy"
            if "clinic" in src_type: org_type = "clinic"
            elif "lab" in src_type: org_type = "laboratory"
            elif "absenteeism" in src_type: org_type = "school"
            elif "hospital" in src_type: org_type = "hospital"

            org_id = org_lookup.get((org_type, loc_id), f"PHARM_{loc_id}_01")
            now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

            cursor.execute("""
                INSERT INTO aggregated_observations
                (organization_id, location_id, source_type, signal_type, date, value, unit, is_synthetic, data_mode, small_cell_masked, metadata_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'synthetic_demo', 0, ?, ?)
            """, (
                org_id, loc_id, src_type, sig_type, dt, val, unit,
                json.dumps({"rainfall_mm": float(row.get("rainfall_mm", 0)), "holiday_flag": int(float(row.get("holiday_flag", 0)))}),
                now_iso
            ))

def log_governance_action(
    reviewer_id: str,
    action: str,
    scenario: str,
    zone_id: str,
    heuristic_score: float,
    decision_tier: str,
    rationale: str,
    data_quality_warnings: List[str],
    location_id: Optional[str] = "SATHYAMANGALAM",
    organization_id: Optional[str] = None
) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    ts = datetime.utcnow().isoformat() + "Z"
    warnings_str = "; ".join(data_quality_warnings) if data_quality_warnings else "None"
    cursor.execute("""
        INSERT INTO audit_logs 
        (timestamp, reviewer_id, action, scenario, zone_id, location_id, organization_id, heuristic_score, decision_tier, rationale, data_quality_warnings)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (ts, reviewer_id, action, scenario, zone_id, location_id, organization_id, heuristic_score, decision_tier, rationale, warnings_str))
    record_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return record_id

def get_audit_logs(limit: int = 50, location_id: Optional[str] = None, organization_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT id, timestamp, reviewer_id, action, scenario, zone_id, location_id, organization_id, heuristic_score, decision_tier, rationale, data_quality_warnings
        FROM audit_logs
    """
    params = []
    conditions = []
    if location_id:
        conditions.append("(location_id = ? OR location_id IS NULL)")
        params.append(location_id)
    if organization_id:
        conditions.append("organization_id = ?")
        params.append(organization_id)
        
    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()

    logs = []
    for r in rows:
        logs.append({
            "id": r["id"],
            "timestamp": r["timestamp"],
            "reviewer_id": r["reviewer_id"],
            "action": r["action"],
            "scenario": r["scenario"],
            "zone_id": r["zone_id"],
            "location_id": r["location_id"] or "SATHYAMANGALAM",
            "organization_id": r["organization_id"],
            "heuristic_score": r["heuristic_score"],
            "decision_tier": r["decision_tier"],
            "rationale": r["rationale"],
            "data_quality_warnings": r["data_quality_warnings"]
        })
    return logs

# Initialize DB on module import
init_db()
