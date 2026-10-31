import sqlite3
import os
from typing import List, Dict, Any, Optional
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "aegis_audit.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            reviewer_id TEXT NOT NULL,
            action TEXT NOT NULL,
            scenario TEXT NOT NULL,
            zone_id TEXT NOT NULL,
            heuristic_score REAL NOT NULL,
            decision_tier TEXT NOT NULL,
            rationale TEXT NOT NULL,
            data_quality_warnings TEXT NOT NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scenario_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def log_governance_action(
    reviewer_id: str,
    action: str,
    scenario: str,
    zone_id: str,
    heuristic_score: float,
    decision_tier: str,
    rationale: str,
    data_quality_warnings: List[str]
) -> int:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    ts = datetime.utcnow().isoformat() + "Z"
    warnings_str = "; ".join(data_quality_warnings) if data_quality_warnings else "None"
    cursor.execute("""
        INSERT INTO audit_logs 
        (timestamp, reviewer_id, action, scenario, zone_id, heuristic_score, decision_tier, rationale, data_quality_warnings)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (ts, reviewer_id, action, scenario, zone_id, heuristic_score, decision_tier, rationale, warnings_str))
    record_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return record_id

def get_audit_logs(limit: int = 50) -> List[Dict[str, Any]]:
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, timestamp, reviewer_id, action, scenario, zone_id, heuristic_score, decision_tier, rationale, data_quality_warnings
        FROM audit_logs
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    logs = []
    for r in rows:
        logs.append({
            "id": r[0],
            "timestamp": r[1],
            "reviewer_id": r[2],
            "action": r[3],
            "scenario": r[4],
            "zone_id": r[5],
            "heuristic_score": r[6],
            "decision_tier": r[7],
            "rationale": r[8],
            "data_quality_warnings": r[9]
        })
    return logs

# Initialize DB on module import
init_db()
