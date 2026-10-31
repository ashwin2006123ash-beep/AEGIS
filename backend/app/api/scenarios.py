from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from ..services.data_store import data_store

router = APIRouter(prefix="/api/v1/scenarios", tags=["Scenarios"])

class ActivateScenarioRequest(BaseModel):
    scenario: str

@router.get("")
def list_scenarios() -> List[Dict[str, Any]]:
    return [
        {
            "id": "scenario_a",
            "title": "Scenario A: Festival + Monsoon False-Alarm Candidate",
            "description": "Sharp OTC pharmacy demand spike and school absence during heavy monsoon rains and local festival, while clinical and laboratory indicators remain flat at baseline.",
            "expected_tier": "Tier 0 / Tier 1 (Investigation / Confounder Flagged)",
            "key_confounders": ["Monsoon Rainfall (78mm)", "Festival Holiday Calendar", "Precautionary Stocking"]
        },
        {
            "id": "scenario_b",
            "title": "Scenario B: Laboratory Batch-Upload Artifact",
            "description": "A 3-day laboratory reporting hiatus followed by a massive single-day batch backlog upload of 180+ records. Clinic visits and pharmacy demand remain normal.",
            "expected_tier": "Tier 0 (Data Reconciliation / Reporting Glitch)",
            "key_confounders": ["3-Day Outage Gap", "Batch Upload Volume Dump", "Zero Clinical Corroboration"]
        },
        {
            "id": "scenario_c",
            "title": "Scenario C: Emerging Multi-Signal Health Event",
            "description": "Sustained coordinated multi-day rise across outpatient clinics (+120%), lab positivity (+28%), pharmacy fever meds (+90%), and absenteeism, with hospital bed capacity approaching 120 beds.",
            "expected_tier": "Tier 2 (Priority Human Review Required)",
            "key_confounders": ["None — Multi-Source Verified Convergence"]
        },
        {
            "id": "baseline",
            "title": "Routine Baseline Surveillance",
            "description": "Normal population health indicators with standard daily variance across all 5 zones.",
            "expected_tier": "Tier 0 (Routine Monitoring)",
            "key_confounders": ["None"]
        }
    ]

@router.post("/activate")
def activate_scenario(req: ActivateScenarioRequest):
    if req.scenario not in ["scenario_a", "scenario_b", "scenario_c", "baseline", "custom"]:
        raise HTTPException(status_code=400, detail=f"Invalid scenario '{req.scenario}'. Choose scenario_a, scenario_b, scenario_c, or baseline.")
    data_store.activate_scenario(req.scenario)
    return {
        "status": "success",
        "active_scenario": req.scenario,
        "title": data_store.scenario_titles.get(req.scenario, req.scenario),
        "message": f"Successfully switched active surveillance dataset to '{req.scenario}'."
    }

@router.post("/reset")
def reset_scenario():
    data_store.activate_scenario("scenario_a")
    data_store.ingested_events.clear()
    return {
        "status": "success",
        "active_scenario": "scenario_a",
        "message": "Surveillance system state reset to Scenario A default."
    }
