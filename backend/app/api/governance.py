from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..models.schemas import GovernanceActionRequest, GovernanceAuditRecord
from ..database import log_governance_action, get_audit_logs
from ..services.data_store import data_store

router = APIRouter(prefix="/api/v1/governance", tags=["Governance & Human-in-the-Loop"])

DISCLAIMER_TEXT = (
    "AEGIS-Epi is an analytical decision-support prototype. Automated medical, pharmaceutical, "
    "or public-health intervention is disabled. All operational actions require authorized human review. "
    "Governance architecture aligned with the NIST AI Risk Management Framework (NIST AI RMF 1.0)."
)

@router.post("/action")
def record_governance_action(req: GovernanceActionRequest):
    # Enforce mandatory reviewer ID
    if not req.reviewer_id or not req.reviewer_id.strip():
        raise HTTPException(status_code=400, detail="Reviewer identifier is required for governance audit tracking.")

    # Enforce mandatory rationale for downgrade or dismiss
    if req.action in ["downgrade_investigation", "dismiss_alert"] and (not req.rationale or len(req.rationale.strip()) < 5):
        raise HTTPException(
            status_code=400,
            detail="A substantive epidemiological or operational rationale is strictly required when downgrading or dismissing an alert."
        )

    # Persist in SQLite
    record_id = log_governance_action(
        reviewer_id=req.reviewer_id.strip(),
        action=req.action,
        scenario=req.scenario,
        zone_id=req.zone_id,
        heuristic_score=req.heuristic_score,
        decision_tier=req.decision_tier,
        rationale=req.rationale.strip() if req.rationale else "Routine plan authorization",
        data_quality_warnings=req.data_quality_warnings
    )

    action_labels = {
        "authorize_plan": "Authorized Recommended Preparedness Plan",
        "downgrade_investigation": "Downgraded to Targeted Investigation Only",
        "dismiss_alert": "Dismissed Alert (Confounder / Non-Epidemic Explained)",
        "reset_scenario": "Reset Surveillance State"
    }

    return {
        "status": "success",
        "audit_record_id": record_id,
        "action_taken": action_labels.get(req.action, req.action),
        "reviewer_id": req.reviewer_id,
        "governance_notice": DISCLAIMER_TEXT,
        "message": f"Governance decision '{req.action}' recorded persistently into tamper-evident SQLite audit log."
    }

@router.get("/audit-log")
def fetch_audit_log(limit: int = 50):
    logs = get_audit_logs(limit=limit)
    return {
        "total_records": len(logs),
        "disclaimer": DISCLAIMER_TEXT,
        "records": logs
    }
