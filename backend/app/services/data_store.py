import os
import csv
from typing import Dict, List, Any, Optional
from datetime import datetime
from ..models.schemas import TelemetryEvent, IngestionStatusResponse

root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
cand1 = os.path.join(root_dir, "data", "synthetic")
cand2 = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "synthetic")
DATA_DIR = cand1 if os.path.exists(cand1) else cand2

class DataStore:
    def __init__(self):
        self.active_scenario: str = "scenario_a"  # default
        self.scenario_titles = {
            "scenario_a": "Scenario A: Festival + Monsoon False-Alarm Candidate",
            "scenario_b": "Scenario B: Laboratory Batch-Upload Artifact",
            "scenario_c": "Scenario C: Emerging Multi-Signal Health Event",
            "custom": "Custom User-Injected Signal Spike"
        }
        self.scenario_data: Dict[str, List[Dict[str, Any]]] = {}
        self.custom_data: List[Dict[str, Any]] = []
        self.ingested_events: List[Dict[str, Any]] = []
        self.stream_active: bool = False
        self.source_metadata: Dict[str, Dict[str, Any]] = self._init_source_metadata()
        self.load_all_datasets()

    def _init_source_metadata(self) -> Dict[str, Dict[str, Any]]:
        return {
            "pharmacy_pos": {
                "name": "Pharmacy POS / Retail Syndromic",
                "status": "connected_simulated",
                "freshness_minutes": 5,
                "records_received": 1420,
                "signal_types": ["fever_medicine_demand", "antipyretic_units"],
                "validation_status": "Privacy Verified (Zero PII)",
                "source_type": "simulated_webhook",
                "last_sync": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            "school_workplace_absenteeism": {
                "name": "School & Workplace Aggregate Absenteeism",
                "status": "connected_simulated",
                "freshness_minutes": 15,
                "records_received": 890,
                "signal_types": ["absenteeism_pct", "unexcused_sick_leaves"],
                "validation_status": "Aggregated & k-Anonymized",
                "source_type": "simulated_webhook",
                "last_sync": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            "clinic_syndromic": {
                "name": "Outpatient Clinic Syndromic Feeds",
                "status": "connected_simulated",
                "freshness_minutes": 8,
                "records_received": 2150,
                "signal_types": ["ili_cases", "acute_fever_visits"],
                "validation_status": "Direct Identifiers Dropped",
                "source_type": "csv_or_api",
                "last_sync": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            "diagnostic_lab": {
                "name": "Diagnostic Laboratory Network",
                "status": "connected_simulated",
                "freshness_minutes": 12,
                "records_received": 1780,
                "signal_types": ["test_positivity_pct", "total_tests"],
                "validation_status": "Batch Ingestion Monitored",
                "source_type": "csv_or_api",
                "last_sync": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            "hospital_capacity": {
                "name": "Hospital Resource & Bed Census",
                "status": "connected_simulated",
                "freshness_minutes": 20,
                "records_received": 940,
                "signal_types": ["occupied_beds", "icu_occupancy"],
                "validation_status": "Aggregated Daily Census",
                "source_type": "csv_or_api",
                "last_sync": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            "environmental_weather": {
                "name": "Weather & Environmental Sensor Grid",
                "status": "connected_simulated",
                "freshness_minutes": 10,
                "records_received": 3400,
                "signal_types": ["rainfall_mm", "temperature_c"],
                "validation_status": "Public Meteorological Data",
                "source_type": "simulated_webhook",
                "last_sync": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            "mobility_calendar": {
                "name": "Mobility Index & Public Calendar",
                "status": "connected_simulated",
                "freshness_minutes": 30,
                "records_received": 1120,
                "signal_types": ["holiday_flag", "festival_flag", "transit_inflow"],
                "validation_status": "Verified Public Feeds",
                "source_type": "simulated_webhook",
                "last_sync": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            }
        }

    def load_all_datasets(self):
        for scenario in ["baseline", "scenario_a", "scenario_b", "scenario_c"]:
            filepath = os.path.join(DATA_DIR, f"{scenario}.csv")
            if os.path.exists(filepath):
                with open(filepath, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    records = []
                    for row in reader:
                        # parse types
                        records.append({
                            "date": row["date"],
                            "zone_id": row["zone_id"],
                            "source_type": row["source_type"],
                            "signal_type": row["signal_type"],
                            "value": float(row["value"]),
                            "unit": row["unit"],
                            "reporting_status": row.get("reporting_status", "normal"),
                            "expected_reporting_interval": row.get("expected_reporting_interval", "daily"),
                            "event_timestamp": row.get("event_timestamp"),
                            "ingestion_timestamp": row.get("ingestion_timestamp"),
                            "is_synthetic": True,
                            "holiday_flag": int(float(row.get("holiday_flag", 0))),
                            "rainfall_mm": float(row.get("rainfall_mm", 0.0)),
                            "temperature_c": float(row.get("temperature_c", 28.0)),
                            "reporting_gap": int(float(row.get("reporting_gap", 0))),
                            "batch_upload_flag": int(float(row.get("batch_upload_flag", 0))),
                            "hospital_capacity": int(float(row.get("hospital_capacity", 120)))
                        })
                    self.scenario_data[scenario] = records

    def get_active_data(self) -> List[Dict[str, Any]]:
        if self.active_scenario == "custom" and self.custom_data:
            return self.custom_data
        return self.scenario_data.get(self.active_scenario, self.scenario_data.get("baseline", []))

    def activate_scenario(self, scenario_key: str):
        if scenario_key in ["scenario_a", "scenario_b", "scenario_c", "baseline", "custom"]:
            self.active_scenario = scenario_key
            # update timestamps on sources
            now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            for src in self.source_metadata.values():
                src["last_sync"] = now_iso

    def record_ingested_event(self, event: Dict[str, Any]):
        self.ingested_events.append(event)
        # update source records count
        src = event.get("source")
        if src in self.source_metadata:
            self.source_metadata[src]["records_received"] += 1
            self.source_metadata[src]["last_sync"] = event.get("timestamp", datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"))

    def get_ingestion_status(self) -> IngestionStatusResponse:
        last_ts = self.ingested_events[-1].get("timestamp") if self.ingested_events else None
        return IngestionStatusResponse(
            sources=self.source_metadata,
            total_events_ingested=len(self.ingested_events),
            last_event_timestamp=last_ts,
            stream_active=self.stream_active,
            active_scenario=self.active_scenario
        )

# Global singleton store instance
data_store = DataStore()
