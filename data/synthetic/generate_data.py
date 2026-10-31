import csv
import os
import random
from datetime import datetime, timedelta

DATA_DIR = os.path.dirname(__file__)

ZONES = [
    ("Z1_SATHY", "Zone 1 — Sathyamangalam"),
    ("Z2_GOBI", "Zone 2 — Gobichettipalayam"),
    ("Z3_ERODE", "Zone 3 — Erode Urban"),
    ("Z4_PERUNDURAI", "Zone 4 — Perundurai"),
    ("Z5_BHAVANI", "Zone 5 — Bhavani"),
]

# 14 days from 2026-10-18 to 2026-10-31
BASE_DATE = datetime(2026, 10, 18)
DAYS = 14

def get_dates():
    return [(BASE_DATE + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(DAYS)]

def generate_datasets():
    dates = get_dates()
    
    # 1. Baseline dataset
    generate_scenario_file("baseline.csv", dates, scenario_type="baseline")
    
    # 2. Scenario A: Festival + Monsoon False-Alarm Candidate
    # Surge in pharmacy fever meds & absenteeism in Sathyamangalam (Z1) & Bhavani (Z5),
    # heavy rainfall flag (78mm), festival flag (1), but clinic & lab near baseline.
    generate_scenario_file("scenario_a.csv", dates, scenario_type="scenario_a")
    
    # 3. Scenario B: Laboratory Batch-Upload Artifact
    # In Sathyamangalam (Z1) / Gobichettipalayam (Z2):
    # Days 9-11 show reporting_gap=1, 0 lab records ingested.
    # Day 12 shows huge batch upload spike (180 tests, batch_upload_flag=1).
    # Clinic and pharmacy remain flat at baseline.
    generate_scenario_file("scenario_b.csv", dates, scenario_type="scenario_b")
    
    # 4. Scenario C: Emerging Multi-Signal Health Event
    # Coordinated sustained rise in Z1_SATHY starting day 8 through day 14:
    # Clinic visits 20 -> 45 -> 72 -> 98 -> 118
    # Lab positivity 4% -> 12% -> 18% -> 26%
    # Pharmacy demand +90%
    # Absenteeism +80%
    # Bed occupancy 45 -> 70 -> 95 -> 114 (capacity = 120)
    # Rainfall 0mm, holiday 0. Spreads into Z2_GOBI on days 12-14.
    generate_scenario_file("scenario_c.csv", dates, scenario_type="scenario_c")

def generate_scenario_file(filename, dates, scenario_type):
    filepath = os.path.join(DATA_DIR, filename)
    headers = [
        "date", "zone_id", "source_type", "signal_type", "value", "unit",
        "reporting_status", "expected_reporting_interval", "event_timestamp",
        "ingestion_timestamp", "is_synthetic", "holiday_flag", "rainfall_mm",
        "temperature_c", "reporting_gap", "batch_upload_flag", "hospital_capacity"
    ]
    
    rows = []
    
    for day_idx, dt in enumerate(dates):
        # Environmental base values
        if scenario_type == "scenario_a" and day_idx >= 9:
            rainfall = 78.5 if day_idx in [10, 11, 12] else 35.0
            temp = 23.0
            holiday = 1 if day_idx in [10, 11, 12, 13] else 0
        else:
            rainfall = 2.0 if day_idx % 4 == 0 else 0.0
            temp = 29.5
            holiday = 0
            
        for zone_id, zone_name in ZONES:
            is_target_zone = (zone_id == "Z1_SATHY")
            is_secondary_zone = (zone_id == "Z2_GOBI" or zone_id == "Z5_BHAVANI")
            
            # 1. Pharmacy POS: Fever / antipyretic demand (baseline ~ 50-70)
            base_pharm = 55.0 + (5.0 if zone_id == "Z3_ERODE" else 0.0)
            if scenario_type == "scenario_a" and (is_target_zone or zone_id == "Z5_BHAVANI") and day_idx >= 9:
                pharm_val = base_pharm * (1.65 + (day_idx - 9) * 0.08)  # Sharp retail spike
            elif scenario_type == "scenario_c" and is_target_zone and day_idx >= 7:
                pharm_val = base_pharm * (1.2 + (day_idx - 7) * 0.22)  # Sustained rise
            elif scenario_type == "scenario_c" and is_secondary_zone and day_idx >= 10:
                pharm_val = base_pharm * (1.15 + (day_idx - 10) * 0.15)
            else:
                pharm_val = base_pharm + random.uniform(-4, 4)
                
            rows.append([
                dt, zone_id, "pharmacy_pos", "fever_medicine_demand", round(pharm_val, 1), "units_sold",
                "normal", "daily", f"{dt}T09:30:00", f"{dt}T10:00:00", "True",
                holiday, rainfall, temp, 0, 0, 120
            ])
            
            # 2. Clinic Syndromic: ILI cases (baseline ~ 18-24)
            base_clinic = 20.0
            if scenario_type == "scenario_c" and is_target_zone and day_idx >= 7:
                clinic_val = base_clinic + (day_idx - 6) * 15.0  # Climbs up to 125
            elif scenario_type == "scenario_c" and is_secondary_zone and day_idx >= 10:
                clinic_val = base_clinic + (day_idx - 9) * 8.0
            elif scenario_type == "scenario_a":
                # Flat near baseline despite pharmacy spike!
                clinic_val = base_clinic + random.uniform(-3, 3)
            elif scenario_type == "scenario_b":
                clinic_val = base_clinic + random.uniform(-2, 3)
            else:
                clinic_val = base_clinic + random.uniform(-2, 3)
                
            rows.append([
                dt, zone_id, "clinic_syndromic", "ili_cases", round(clinic_val, 1), "cases",
                "normal", "daily", f"{dt}T11:00:00", f"{dt}T11:30:00", "True",
                holiday, rainfall, temp, 0, 0, 120
            ])
            
            # 3. Diagnostic Lab: Positivity Rate (%) and Total Tests
            base_pos = 4.2
            base_tests = 45
            reporting_gap = 0
            batch_flag = 0
            rep_status = "normal"
            
            if scenario_type == "scenario_b" and is_target_zone:
                if day_idx in [8, 9, 10]:
                    # 3-day outage gap
                    reporting_gap = 1
                    pos_val = 0.0
                    tests_val = 0
                    rep_status = "delayed_gap"
                elif day_idx == 11:
                    # Massive backlog batch dump!
                    reporting_gap = 0
                    batch_flag = 1
                    pos_val = 8.5  # positivity barely changes, but volume dumps 190 tests!
                    tests_val = 195
                    rep_status = "batch_upload_surge"
                else:
                    pos_val = base_pos + random.uniform(-0.5, 0.5)
                    tests_val = base_tests + random.randint(-5, 5)
            elif scenario_type == "scenario_c" and is_target_zone and day_idx >= 7:
                pos_val = base_pos + (day_idx - 6) * 3.5  # climbs to 28.7%
                tests_val = base_tests + (day_idx - 6) * 12
            elif scenario_type == "scenario_a":
                # Normal baseline positivity
                pos_val = base_pos + random.uniform(-0.6, 0.6)
                tests_val = base_tests + random.randint(-4, 4)
            else:
                pos_val = base_pos + random.uniform(-0.6, 0.6)
                tests_val = base_tests + random.randint(-4, 4)
                
            rows.append([
                dt, zone_id, "diagnostic_lab", "test_positivity_pct", round(pos_val, 2), "percentage",
                rep_status, "daily", f"{dt}T14:00:00", f"{dt}T14:30:00", "True",
                holiday, rainfall, temp, reporting_gap, batch_flag, 120
            ])
            rows.append([
                dt, zone_id, "diagnostic_lab", "total_tests", tests_val, "tests_count",
                rep_status, "daily", f"{dt}T14:00:00", f"{dt}T14:30:00", "True",
                holiday, rainfall, temp, reporting_gap, batch_flag, 120
            ])
            
            # 4. Absenteeism: (%) across institutions (baseline ~ 5.5%)
            base_abs = 5.5
            if scenario_type == "scenario_a" and (is_target_zone or zone_id == "Z5_BHAVANI") and day_idx >= 9:
                abs_val = 14.5 + (2.5 if holiday else 0.0)  # rain/holiday absence
            elif scenario_type == "scenario_c" and is_target_zone and day_idx >= 8:
                abs_val = base_abs + (day_idx - 7) * 2.8  # syndromic absence
            else:
                abs_val = base_abs + random.uniform(-0.8, 0.8)
                
            rows.append([
                dt, zone_id, "absenteeism", "absenteeism_pct", round(abs_val, 1), "percentage",
                "normal", "daily", f"{dt}T16:00:00", f"{dt}T16:15:00", "True",
                holiday, rainfall, temp, 0, 0, 120
            ])
            
            # 5. Hospital Capacity: Occupied beds (out of 120 capacity)
            base_beds = 42.0
            if scenario_type == "scenario_c" and is_target_zone and day_idx >= 7:
                occupied = base_beds + (day_idx - 6) * 11.5  # Reaches 118 on day 13
            elif scenario_type == "scenario_c" and is_secondary_zone and day_idx >= 10:
                occupied = base_beds + (day_idx - 9) * 6.0
            else:
                occupied = base_beds + random.uniform(-3, 4)
                
            rows.append([
                dt, zone_id, "hospital_capacity", "occupied_beds", round(occupied, 0), "beds",
                "normal", "daily", f"{dt}T18:00:00", f"{dt}T18:30:00", "True",
                holiday, rainfall, temp, 0, 0, 120
            ])
            
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"Generated {filepath} with {len(rows)} rows.")

if __name__ == "__main__":
    generate_datasets()
