import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from datetime import datetime
from ..database import get_connection

EPSILON = 1e-6
ANOMALY_Z_THRESHOLD = 2.0

class ClientAnalyticsEngine:
    def __init__(self):
        pass

    def analyze_client_organization(self, organization_id: str) -> Dict[str, Any]:
        """
        Executes client-level AI analysis strictly scoped to the specified organization.
        Tenant isolated: only accesses records belonging to organization_id.
        """
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Fetch Organization & Connector Metadata
        cursor.execute("""
            SELECT o.id, o.name, o.type, o.location_id, l.name as location_name,
                   c.endpoint_url, c.auth_type, c.sync_status, c.last_sync_timestamp, c.records_count
            FROM organizations o
            JOIN locations l ON o.location_id = l.id
            LEFT JOIN source_connectors c ON o.id = c.organization_id
            WHERE o.id = ?
        """, (organization_id,))
        org_row = cursor.fetchone()

        if not org_row:
            conn.close()
            return {"error": "Organization not found"}

        # 2. Fetch Aggregated Observations
        cursor.execute("""
            SELECT date, source_type, signal_type, value, unit, is_synthetic, data_mode, metadata_json
            FROM aggregated_observations
            WHERE organization_id = ?
            ORDER BY date ASC
        """, (organization_id,))
        rows = cursor.fetchall()
        conn.close()

        records = [dict(r) for r in rows]

        if not records:
            return self._empty_client_analysis(org_row)

        df = pd.DataFrame(records)
        dates = sorted(df["date"].unique())
        latest_date = dates[-1]

        # Primary signal (for pharmacy: fever_medicine_demand, clinic: ili_cases, lab: test_positivity_pct, etc.)
        primary_signals = df["signal_type"].unique()
        primary_signal = primary_signals[0] if len(primary_signals) > 0 else "demand"
        
        signal_df = df[df["signal_type"] == primary_signal].copy()
        vals = signal_df["value"].values

        # Baseline: first 7 days (or first half)
        baseline_len = min(7, len(vals))
        base_vals = vals[:baseline_len]
        base_mean = float(np.mean(base_vals)) if len(base_vals) > 0 else 0.0
        base_std = float(np.std(base_vals)) if len(base_vals) > 1 else 1.0
        if base_std < EPSILON:
            base_std = 1.0

        current_val = float(vals[-1])
        z_score = round(float((current_val - base_mean) / base_std), 2)
        pct_change = round(float(((current_val - base_mean) / max(1.0, base_mean)) * 100.0), 1)

        is_anomalous = (z_score >= ANOMALY_Z_THRESHOLD)

        # Ingestion & Data Completeness Check
        expected_points = len(dates)
        actual_points = len(signal_df)
        completeness = round(min(1.0, actual_points / max(1, expected_points)), 2)

        # Check for potential data ingestion artifacts
        ingestion_warnings = []
        if len(vals) >= 3 and np.all(vals[-3:] == 0):
            ingestion_warnings.append("Consecutive zero-value reporting gap detected over past 72 hours.")
        if len(vals) >= 2 and (vals[-1] > base_mean * 3.5 and vals[-2] == 0):
            ingestion_warnings.append("Potential batch backlog upload artifact: extreme single-day jump following missing interval.")
        if completeness < 0.8:
            ingestion_warnings.append("Data completeness below operational threshold (reporting hiatus identified).")

        # Severity Tier
        if is_anomalous and z_score >= 3.0:
            severity = "High Divergence"
            tier_badge = "amber"
        elif is_anomalous:
            severity = "Moderate Deviation"
            tier_badge = "amber"
        else:
            severity = "Normal Operational Range"
            tier_badge = "emerald"

        # Timeline generation for Recharts
        timeline = []
        for _, row in signal_df.iterrows():
            d_val = float(row["value"])
            d_z = round(float((d_val - base_mean) / base_std), 2)
            timeline.append({
                "date": row["date"],
                "value": d_val,
                "unit": row["unit"],
                "baseline_mean": round(base_mean, 1),
                "upper_bound": round(base_mean + 2.0 * base_std, 1),
                "lower_bound": round(max(0.0, base_mean - 2.0 * base_std), 1),
                "z_score": d_z,
                "is_anomalous": d_z >= ANOMALY_Z_THRESHOLD
            })

        # Client-Specific Action Recommendations
        recommendations = self._generate_client_recommendations(
            org_row["type"], z_score, pct_change, ingestion_warnings, current_val, base_mean
        )

        return {
            "organization": {
                "id": org_row["id"],
                "name": org_row["name"],
                "type": org_row["type"],
                "location_id": org_row["location_id"],
                "location_name": org_row["location_name"],
                "connector_status": org_row["sync_status"] or "connected_simulated",
                "last_sync": org_row["last_sync_timestamp"] or datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "records_count": org_row["records_count"] or len(records),
                "endpoint_url": org_row["endpoint_url"],
                "auth_type": org_row["auth_type"]
            },
            "metrics": {
                "primary_signal": primary_signal,
                "unit": signal_df["unit"].iloc[-1] if not signal_df.empty else "units",
                "current_value": current_val,
                "baseline_mean": round(base_mean, 1),
                "baseline_std": round(base_std, 1),
                "current_z_score": z_score,
                "percentage_change": pct_change,
                "anomaly_detected": is_anomalous,
                "severity_level": severity,
                "severity_badge": tier_badge,
                "data_completeness": completeness,
                "analysis_date": latest_date,
                "algorithm_version": "client-zscore-v2.0"
            },
            "ingestion_health": {
                "status": "Healthy" if not ingestion_warnings else "Artifacts Detected",
                "warnings": ingestion_warnings
            },
            "timeline": timeline,
            "recommendations": recommendations,
            "disclaimer": "Client-level analysis evaluates single-source statistical divergence. A local anomaly does not establish a confirmed public health outbreak. Multi-source triangulation at Central Command is required."
        }

    def _generate_client_recommendations(
        self, org_type: str, z: float, pct: float, warnings: List[str], current: float, mean: float
    ) -> List[Dict[str, Any]]:
        recs = []

        if warnings:
            recs.append({
                "id": "rec-ingest-1",
                "priority": "High",
                "action": "Reconcile Ingestion Pipeline",
                "rationale": f"Data quality check flagged: {warnings[0]}",
                "step": "Verify whether billing or LIS synchronization experienced connectivity latency or batch queue dumping."
            })

        if org_type == "pharmacy":
            if z >= 2.0:
                recs.append({
                    "id": "rec-pharm-1",
                    "priority": "High",
                    "action": "Stock & Dispensation Audit",
                    "rationale": f"Antipyretic / fever medicine sales elevated by {pct}% (Z={z}σ).",
                    "step": "Audit whether recent transactions represent institutional bulk orders or widespread individual self-medication."
                })
                recs.append({
                    "id": "rec-pharm-2",
                    "priority": "Medium",
                    "action": "Prepare Secondary Inventory",
                    "rationale": "High community demand velocity may deplete antipyretic blister packs within 48 hours.",
                    "step": "Review distributor lead times for Paracetamol 650mg and pediatric oral rehydration solutions."
                })
            else:
                recs.append({
                    "id": "rec-pharm-0",
                    "priority": "Low",
                    "action": "Maintain Routine Dispensary Logging",
                    "rationale": "Over-the-counter medicine movement tracks within standard seasonal variance (+/- 1.5σ).",
                    "step": "Continue automated end-of-day category billing summaries via the edge scrubber adapter."
                })

        elif org_type == "clinic":
            if z >= 2.0:
                recs.append({
                    "id": "rec-clinic-1",
                    "priority": "High",
                    "action": "Syndromic Triage Review",
                    "rationale": f"Influenza-like illness consultations elevated (Z={z}σ, current={current:.0f} vs base={mean:.0f}).",
                    "step": "Cross-check outpatient chief complaints and ensure fever triage masks and PPE are actively deployed."
                })
            else:
                recs.append({
                    "id": "rec-clinic-0",
                    "priority": "Low",
                    "action": "Continue Outpatient Surveillance",
                    "rationale": "Consultation counts remain in expected baseline operational range.",
                    "step": "Submit standard aggregate syndromic counts at close of evening outpatient shift."
                })

        elif org_type == "laboratory":
            if z >= 2.0:
                recs.append({
                    "id": "rec-lab-1",
                    "priority": "High",
                    "action": "Verify Sample Collection vs Ingestion Timestamps",
                    "rationale": f"Positivity or test volume significantly elevated (Z={z}σ).",
                    "step": "Ensure delayed batches are stamped with actual specimen collection date to prevent artificial backlog clustering."
                })
            else:
                recs.append({
                    "id": "rec-lab-0",
                    "priority": "Low",
                    "action": "Routine LIS Diagnostic Reporting",
                    "rationale": "Positivity rate matches normal background baseline.",
                    "step": "Maintain automated daily positive/negative specimen census reporting."
                })

        elif org_type == "school":
            if z >= 2.0:
                recs.append({
                    "id": "rec-school-1",
                    "priority": "Medium",
                    "action": "Institutional Absenteeism Inquest",
                    "rationale": f"Unexcused and sick-leave student absenteeism elevated ({pct}% above normal).",
                    "step": "Survey homeroom advisors to determine whether absence is cluster-based or driven by weather disruptions."
                })
            else:
                recs.append({
                    "id": "rec-school-0",
                    "priority": "Low",
                    "action": "Maintain Standard Attendance Registers",
                    "rationale": "Attendance rates within normal 92-96% academic baseline.",
                    "step": "Continue weekly aggregate attendance reconciliation."
                })

        elif org_type == "hospital":
            if current >= 95:
                recs.append({
                    "id": "rec-hosp-1",
                    "priority": "Critical",
                    "action": "Hospital Surge Bed Readiness Protocol",
                    "rationale": f"Census is approaching or exceeding bed threshold (occupied: {current:.0f} beds).",
                    "step": "Review elective discharge candidates and notify nursing superintendent of flex-bed activation."
                })
            else:
                recs.append({
                    "id": "rec-hosp-0",
                    "priority": "Low",
                    "action": "Routine Bed Census Maintenance",
                    "rationale": f"Hospital bed occupancy ({current:.0f} beds) is within operational safety margins.",
                    "step": "Submit 24-hour midnight bed census to Central Health Authority."
                })

        return recs

    def _empty_client_analysis(self, org_row) -> Dict[str, Any]:
        return {
            "organization": {
                "id": org_row["id"],
                "name": org_row["name"],
                "type": org_row["type"],
                "location_id": org_row["location_id"],
                "location_name": org_row["location_name"],
                "connector_status": "awaiting_data",
                "last_sync": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "records_count": 0
            },
            "metrics": {
                "primary_signal": "none",
                "unit": "none",
                "current_value": 0,
                "baseline_mean": 0,
                "baseline_std": 1,
                "current_z_score": 0.0,
                "percentage_change": 0.0,
                "anomaly_detected": False,
                "severity_level": "No Data Ingested",
                "severity_badge": "slate",
                "data_completeness": 0.0,
                "analysis_date": "N/A",
                "algorithm_version": "client-zscore-v2.0"
            },
            "ingestion_health": {"status": "Awaiting Initial Feed", "warnings": []},
            "timeline": [],
            "recommendations": [
                {
                    "id": "rec-init",
                    "priority": "Medium",
                    "action": "Upload Initial Historical Batch or Trigger Connector",
                    "rationale": "No aggregated telemetry records currently stored for this client organization.",
                    "step": "Use the manual CSV upload panel or click 'Test Sync' to initialize the edge connector feed."
                }
            ],
            "disclaimer": "Client-level analysis requires minimum 5 operational days to calculate valid rolling baselines."
        }

client_analytics_engine = ClientAnalyticsEngine()
