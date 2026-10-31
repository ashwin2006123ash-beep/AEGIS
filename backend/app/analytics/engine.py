import math
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple, Optional
from ..models.schemas import ZoneStatus, ZONE_NAMES

EPSILON = 1e-6
ANOMALY_Z_THRESHOLD = 2.0  # 2 standard deviations above baseline

class AnalyticsEngine:
    def __init__(self):
        pass

    def compute_timeline_and_anomalies(self, data: List[Dict[str, Any]], zone_filter: str = "Z1_SATHY") -> List[Dict[str, Any]]:
        """
        Calculates standardized z-scores and timeline metrics for the selected zone over all available dates.
        Handles zero-variance, missing values, and negative deviations gracefully.
        """
        df = pd.DataFrame(data)
        if df.empty:
            return []

        if zone_filter and zone_filter != "all":
            df_zone = df[df["zone_id"] == zone_filter].copy()
        else:
            # aggregate across zones
            df_zone = df.copy()

        dates = sorted(df_zone["date"].unique())
        timeline = []

        # Pivot signals
        signals = {
            "pharmacy_demand": ("pharmacy_pos", "fever_medicine_demand"),
            "clinic_visits": ("clinic_syndromic", "ili_cases"),
            "lab_positivity": ("diagnostic_lab", "test_positivity_pct"),
            "absenteeism": ("absenteeism", "absenteeism_pct"),
        }

        # Calculate baselines from the first 7 days (or entire set if short)
        baseline_stats = {}
        for sig_key, (src, sig_type) in signals.items():
            sub = df_zone[(df_zone["source_type"] == src) & (df_zone["signal_type"] == sig_type)]
            if not sub.empty:
                # first 7 days baseline
                base_sub = sub[sub["date"].isin(dates[:7])]
                if base_sub.empty:
                    base_sub = sub
                vals = base_sub["value"].values
                mean = float(np.mean(vals))
                std = float(np.std(vals))
                if std < EPSILON:
                    std = 1.0  # Safe fallback for zero variance
                baseline_stats[sig_key] = (mean, std)
            else:
                baseline_stats[sig_key] = (0.0, 1.0)

        for dt in dates:
            dt_sub = df_zone[df_zone["date"] == dt]
            
            # Extract raw values
            pharm_raw = self._get_signal_val(dt_sub, "pharmacy_pos", "fever_medicine_demand")
            clinic_raw = self._get_signal_val(dt_sub, "clinic_syndromic", "ili_cases")
            lab_raw = self._get_signal_val(dt_sub, "diagnostic_lab", "test_positivity_pct")
            abs_raw = self._get_signal_val(dt_sub, "absenteeism", "absenteeism_pct")

            # Extract context
            rainfall = float(dt_sub["rainfall_mm"].max()) if "rainfall_mm" in dt_sub.columns and not dt_sub["rainfall_mm"].isna().all() else 0.0
            holiday = int(dt_sub["holiday_flag"].max()) if "holiday_flag" in dt_sub.columns and not dt_sub["holiday_flag"].isna().all() else 0
            batch_flag = int(dt_sub["batch_upload_flag"].max()) if "batch_upload_flag" in dt_sub.columns and not dt_sub["batch_upload_flag"].isna().all() else 0
            gap_flag = int(dt_sub["reporting_gap"].max()) if "reporting_gap" in dt_sub.columns and not dt_sub["reporting_gap"].isna().all() else 0

            # Compute standardized Z-scores
            pharm_z = (pharm_raw - baseline_stats["pharmacy_demand"][0]) / baseline_stats["pharmacy_demand"][1] if pharm_raw is not None else 0.0
            clinic_z = (clinic_raw - baseline_stats["clinic_visits"][0]) / baseline_stats["clinic_visits"][1] if clinic_raw is not None else 0.0
            lab_z = (lab_raw - baseline_stats["lab_positivity"][0]) / baseline_stats["lab_positivity"][1] if lab_raw is not None else 0.0
            abs_z = (abs_raw - baseline_stats["absenteeism"][0]) / baseline_stats["absenteeism"][1] if abs_raw is not None else 0.0

            timeline.append({
                "date": dt,
                "pharmacy_demand_z": round(float(pharm_z), 2),
                "clinic_visits_z": round(float(clinic_z), 2),
                "lab_positivity_z": round(float(lab_z), 2),
                "absenteeism_z": round(float(abs_z), 2),
                "rainfall_mm": round(rainfall, 1),
                "holiday_flag": holiday,
                "batch_upload_flag": batch_flag,
                "reporting_gap": gap_flag,
                "raw_pharmacy": round(pharm_raw, 1) if pharm_raw is not None else None,
                "raw_clinic": round(clinic_raw, 1) if clinic_raw is not None else None,
                "raw_lab_positivity": round(lab_raw, 2) if lab_raw is not None else None,
                "raw_absenteeism": round(abs_raw, 1) if abs_raw is not None else None,
            })

        return timeline

    def _get_signal_val(self, df_sub: pd.DataFrame, source: str, signal: str) -> Optional[float]:
        sub = df_sub[(df_sub["source_type"] == source) & (df_sub["signal_type"] == signal)]
        if not sub.empty:
            return float(sub["value"].mean())
        return None

    def evaluate_zone_anomalies(self, data: List[Dict[str, Any]]) -> Dict[str, ZoneStatus]:
        """
        Evaluates current anomaly state for each of the 5 zones.
        """
        df = pd.DataFrame(data)
        zone_statuses = {}

        if df.empty:
            for zid, zname in ZONE_NAMES.items():
                zone_statuses[zid] = ZoneStatus(
                    zone_id=zid,
                    zone_name=zname,
                    status_color="emerald",
                    severity_level="Normal",
                    anomaly_score=0.1,
                    contributing_signals=[],
                    last_updated="2026-10-31T10:00:00",
                    data_freshness_minutes=10,
                    active_anomaly=False
                )
            return zone_statuses

        recent_date = df["date"].max()
        recent_df = df[df["date"] == recent_date]

        for zid, zname in ZONE_NAMES.items():
            z_sub = df[df["zone_id"] == zid]
            if z_sub.empty:
                continue

            # Compute z-scores for recent date vs historical first 7 days
            timeline = self.compute_timeline_and_anomalies(data, zone_filter=zid)
            if not timeline:
                continue

            latest = timeline[-1]
            pharm_z = latest.get("pharmacy_demand_z", 0.0)
            clinic_z = latest.get("clinic_visits_z", 0.0)
            lab_z = latest.get("lab_positivity_z", 0.0)
            abs_z = latest.get("absenteeism_z", 0.0)
            batch_flag = latest.get("batch_upload_flag", 0)

            elevated_signals = []
            if pharm_z >= ANOMALY_Z_THRESHOLD:
                elevated_signals.append(f"Pharmacy Antipyretics (Z={pharm_z:.1f})")
            if clinic_z >= ANOMALY_Z_THRESHOLD:
                elevated_signals.append(f"Clinic ILI Visits (Z={clinic_z:.1f})")
            if lab_z >= ANOMALY_Z_THRESHOLD:
                elevated_signals.append(f"Diagnostic Lab Positivity (Z={lab_z:.1f})")
            if abs_z >= ANOMALY_Z_THRESHOLD:
                elevated_signals.append(f"Workplace/School Absenteeism (Z={abs_z:.1f})")

            # Check if this is a coordinated multi-source signal vs isolated
            max_z = max(pharm_z, clinic_z, lab_z, abs_z)
            elevated_count = len(elevated_signals)

            if elevated_count >= 3:
                # Multi-source coordinated spike
                color = "rose"
                severity = "Priority Review"
                score = min(0.95, 0.5 + 0.1 * max_z)
                active = True
            elif elevated_count in [1, 2]:
                color = "amber"
                severity = "Investigation"
                score = min(0.65, 0.3 + 0.08 * max_z)
                active = True
            else:
                color = "emerald"
                severity = "Normal"
                score = max(0.05, min(0.25, 0.05 * max_z))
                active = False

            zone_statuses[zid] = ZoneStatus(
                zone_id=zid,
                zone_name=zname,
                status_color=color,
                severity_level=severity,
                anomaly_score=round(float(score), 2),
                contributing_signals=elevated_signals,
                last_updated="2026-10-31T10:00:00",
                data_freshness_minutes=8,
                active_anomaly=active
            )

        return zone_statuses

    def calculate_executive_metrics(
        self, data: List[Dict[str, Any]], zone_id: str = "Z1_SATHY"
    ) -> Tuple[float, float, float, float, int, List[str], float, str, str]:
        """
        Calculates:
        - cross_source_agreement (0.0 to 1.0)
        - anomaly_severity (0.0 to 1.0)
        - evidence_quality (0.0 to 1.0)
        - data_completeness (0.0 to 1.0)
        - corroborating_sources_count
        - false_alarm_flags
        - heuristic_evidence_score (0 to 100)
        - decision_tier ("Tier 0", "Tier 1", "Tier 2")
        - uncertainty_statement
        """
        timeline = self.compute_timeline_and_anomalies(data, zone_filter=zone_id)
        if not timeline:
            return 0.0, 0.0, 0.5, 0.5, 0, [], 10.0, "Tier 0", "Insufficient data to compute assessment."

        latest = timeline[-1]
        pharm_z = latest.get("pharmacy_demand_z", 0.0)
        clinic_z = latest.get("clinic_visits_z", 0.0)
        lab_z = latest.get("lab_positivity_z", 0.0)
        abs_z = latest.get("absenteeism_z", 0.0)

        # 4 Core independent sources
        elevated = []
        if pharm_z >= 1.8:
            elevated.append("Pharmacy OTC Demand")
        if clinic_z >= 1.8:
            elevated.append("Clinic Syndromic Feeds")
        if lab_z >= 1.8:
            elevated.append("Diagnostic Lab Positivity")
        if abs_z >= 1.8:
            elevated.append("Workplace/School Absenteeism")

        corroborating_count = len(elevated)
        agreement = corroborating_count / 4.0

        # Anomaly severity
        z_scores = [pharm_z, clinic_z, lab_z, abs_z]
        avg_positive_z = float(np.mean([max(0.0, z) for z in z_scores]))
        severity = min(1.0, avg_positive_z / 4.0)

        # Detect potential confounders & artifacts
        false_alarm_flags = []
        recent_rain = any(t.get("rainfall_mm", 0.0) > 30.0 for t in timeline[-4:])
        recent_holiday = any(t.get("holiday_flag", 0) == 1 for t in timeline[-4:])
        batch_artifact = any(t.get("batch_upload_flag", 0) == 1 for t in timeline[-4:])
        reporting_gap = any(t.get("reporting_gap", 0) == 1 for t in timeline[-4:])

        if recent_rain:
            false_alarm_flags.append("Heavy Rainfall Detected (Monsoon Precipitation)")
        if recent_holiday:
            false_alarm_flags.append("Public Holiday / Festival Calendar Inflow")
        if batch_artifact:
            false_alarm_flags.append("Lab Ingestion Batch Surge (Backlog Reconciliation)")
        if reporting_gap:
            false_alarm_flags.append("Laboratory Multi-Day Reporting Gap Detected")

        # Data completeness
        total_expected_points = len(timeline) * 4
        non_null_points = sum(
            (1 if t.get("raw_pharmacy") is not None else 0) +
            (1 if t.get("raw_clinic") is not None else 0) +
            (1 if t.get("raw_lab_positivity") is not None else 0) +
            (1 if t.get("raw_absenteeism") is not None else 0)
            for t in timeline
        )
        data_completeness = round(non_null_points / max(1, total_expected_points), 2)
        evidence_quality = round(data_completeness * (0.6 if (batch_artifact or reporting_gap) else 1.0), 2)

        # Transparent heuristic evidence score computation (0 - 100)
        # Note: Clearly labeled as a heuristic evidence score, NOT a calibrated outbreak probability
        base_score = (agreement * 45.0) + (severity * 35.0) + (evidence_quality * 20.0)

        # Confounder discount
        if (recent_rain or recent_holiday) and (clinic_z < 1.5 and lab_z < 1.5):
            # Sharp OTC/absence rise during rain/festival without clinic/lab corroboration
            base_score = base_score * 0.45
            false_alarm_flags.append("Retail/absence spike uncorroborated by clinical outpatient feeds")
        elif batch_artifact and corroborating_count <= 1:
            # Isolated lab spike from backlog
            base_score = base_score * 0.35

        heuristic_score = round(max(5.0, min(95.0, base_score)), 1)

        # Decision tier classification
        if heuristic_score >= 68.0 and corroborating_count >= 3:
            tier = "Tier 2"
            tier_label = "Tier 2 — Priority Human Review"
            uncertainty = "High multi-source corroboration detected across clinical, laboratory, and community feeds. Clinical etiology remains unconfirmed until confirmatory serology and field epidemiological specimen sequencing are completed."
        elif heuristic_score >= 38.0 or corroborating_count >= 1:
            tier = "Tier 1"
            tier_label = "Tier 1 — Targeted Investigation"
            uncertainty = "Unusual signal deviation detected in partial indicators. Alternative explanations (weather, retail stocking, reporting latency) are plausible. Do not declare an outbreak; execute source-level verification."
        else:
            tier = "Tier 0"
            tier_label = "Tier 0 — Low Concern / Confounded Baseline"
            uncertainty = "No coordinated public health anomaly identified. Deviations, if present, are accounted for by known confounders or single-source reporting latency. Routine monitoring maintained."

        return (
            round(agreement, 2),
            round(severity, 2),
            round(evidence_quality, 2),
            round(data_completeness, 2),
            corroborating_count,
            false_alarm_flags,
            heuristic_score,
            tier,
            uncertainty
        )

analytics_engine = AnalyticsEngine()
