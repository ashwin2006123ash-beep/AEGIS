import random
import uuid
from datetime import datetime
from typing import Dict, Any
from ..models.schemas import TelemetryEvent
from .data_store import data_store

ZONES = ["Z1_SATHY", "Z2_GOBI", "Z3_ERODE", "Z4_PERUNDURAI", "Z5_BHAVANI"]

SOURCES_AND_SIGNALS = [
    ("pharmacy_pos", "fever_medicine_demand", "units_sold", 45.0, 160.0),
    ("clinic_syndromic", "ili_cases", "cases", 15.0, 115.0),
    ("diagnostic_lab", "test_positivity_pct", "percentage", 3.0, 28.0),
    ("school_workplace_absenteeism", "absenteeism_pct", "percentage", 4.0, 22.0),
    ("hospital_capacity", "occupied_beds", "beds", 40.0, 118.0),
    ("environmental_weather", "rainfall_mm", "mm", 0.0, 85.0),
    ("mobility_calendar", "transit_inflow", "index", 80.0, 150.0),
]

def generate_live_synthetic_event() -> Dict[str, Any]:
    """
    Generates a realistic simulated telemetry webhook event reflecting the currently active scenario.
    """
    source, signal, unit, min_val, max_val = random.choice(SOURCES_AND_SIGNALS)
    
    # Weight towards target zones if in an anomaly scenario
    if data_store.active_scenario in ["scenario_a", "scenario_c"]:
        zone = random.choice(["Z1_SATHY", "Z1_SATHY", "Z2_GOBI", "Z5_BHAVANI", "Z3_ERODE", "Z4_PERUNDURAI"])
    else:
        zone = random.choice(ZONES)

    # Reflect active scenario behavior
    if data_store.active_scenario == "scenario_a":
        if source == "pharmacy_pos" and zone in ["Z1_SATHY", "Z5_BHAVANI"]:
            val = random.uniform(110.0, 155.0)
        elif source == "environmental_weather":
            val = random.uniform(45.0, 82.0)
        elif source == "clinic_syndromic":
            val = random.uniform(18.0, 24.0)  # flat!
        else:
            val = random.uniform(min_val, (min_val + max_val) / 2.0)
    elif data_store.active_scenario == "scenario_b":
        if source == "diagnostic_lab" and zone == "Z1_SATHY":
            val = random.uniform(140.0, 195.0)  # batch volume
            signal = "total_tests"
            unit = "tests_count"
        elif source == "clinic_syndromic":
            val = random.uniform(17.0, 23.0)  # flat
        else:
            val = random.uniform(min_val, (min_val + max_val) / 2.0)
    elif data_store.active_scenario == "scenario_c":
        if zone in ["Z1_SATHY", "Z2_GOBI"]:
            val = random.uniform(max_val * 0.75, max_val)  # coordinated elevated
        else:
            val = random.uniform(min_val, (min_val + max_val) / 2.0)
    else:
        val = random.uniform(min_val, (min_val + max_val) / 2.0)

    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    event = {
        "id": f"evt-{uuid.uuid4().hex[:8]}",
        "source": source,
        "zone": zone,
        "signal": signal,
        "value": round(float(val), 1),
        "unit": unit,
        "timestamp": now_iso,
        "data_mode": "synthetic_demo",
        "pii_present": False,
        "small_cell_suppressed": False,
        "metadata": {
            "transmission_protocol": "HTTPS_REST_WEBHOOK",
            "source_facility_id": f"FAC-{zone}-01",
            "data_schema_version": "v1.4",
            "is_synthetic": True
        }
    }

    # Automatically record into data store
    data_store.record_ingested_event(event)
    return event
