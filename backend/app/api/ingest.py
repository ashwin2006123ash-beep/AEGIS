import io
import csv
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from ..models.schemas import TelemetryEvent, IngestionStatusResponse, PrivacyValidationResult
from ..services.data_store import data_store
from ..services.privacy_scrubber import inspect_and_sanitize_payload, get_demo_scrubber_example
from ..services.synthetic_stream import generate_live_synthetic_event

router = APIRouter(tags=["Ingestion & Privacy"])

def _process_generic_ingest(source: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    # 1. Privacy scrubber verification
    validation = inspect_and_sanitize_payload(payload)
    if not validation.is_valid:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Privacy Minimization Violation",
                "message": validation.message,
                "detected_direct_identifiers": validation.detected_fields
            }
        )

    sanitized = validation.sanitized_record
    event_id = sanitized.get("id") or f"evt-{uuid.uuid4().hex[:8]}"
    ts = sanitized.get("timestamp") or datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    event = {
        "id": event_id,
        "source": source,
        "zone": sanitized.get("zone") or sanitized.get("zone_id") or "Z1_SATHY",
        "signal": sanitized.get("signal") or sanitized.get("signal_type") or "telemetry_metric",
        "value": float(sanitized.get("value", 0.0)),
        "unit": sanitized.get("unit", "count"),
        "timestamp": ts,
        "data_mode": sanitized.get("data_mode", "file_upload" if "upload" in source else "authorized_integration"),
        "pii_present": False,
        "small_cell_suppressed": validation.small_cell_suppressed,
        "metadata": sanitized.get("metadata", {})
    }

    data_store.record_ingested_event(event)
    return {
        "status": "success",
        "event_id": event_id,
        "message": f"Successfully ingested sanitized record into {source}.",
        "privacy_status": "Verified (Zero PII)",
        "small_cell_suppression_applied": validation.small_cell_suppressed,
        "event": event
    }

@router.post("/api/v1/ingest/pos")
def ingest_pharmacy_pos(payload: Dict[str, Any]):
    return _process_generic_ingest("pharmacy_pos", payload)

@router.post("/api/v1/ingest/clinic")
def ingest_clinic_syndromic(payload: Dict[str, Any]):
    return _process_generic_ingest("clinic_syndromic", payload)

@router.post("/api/v1/ingest/lab")
def ingest_diagnostic_lab(payload: Dict[str, Any]):
    return _process_generic_ingest("diagnostic_lab", payload)

@router.post("/api/v1/ingest/absenteeism")
def ingest_absenteeism(payload: Dict[str, Any]):
    return _process_generic_ingest("school_workplace_absenteeism", payload)

@router.post("/api/v1/ingest/capacity")
def ingest_hospital_capacity(payload: Dict[str, Any]):
    return _process_generic_ingest("hospital_capacity", payload)

@router.get("/api/v1/ingestion/status", response_model=IngestionStatusResponse)
def get_ingestion_status():
    return data_store.get_ingestion_status()

@router.get("/api/v1/ingestion/events")
def get_recent_ingested_events(limit: int = 40):
    return {
        "total_events": len(data_store.ingested_events),
        "events": list(reversed(data_store.ingested_events[-limit:]))
    }

@router.post("/api/v1/ingestion/stream/next")
def trigger_next_simulated_stream_event():
    event = generate_live_synthetic_event()
    return {
        "status": "success",
        "event": event,
        "total_ingested": len(data_store.ingested_events)
    }

@router.get("/api/v1/privacy/demo-scrubber")
def get_privacy_scrubber_preview():
    return get_demo_scrubber_example()

@router.post("/api/v1/data/upload")
async def upload_dataset_csv(
    file: UploadFile = File(...),
    source_type: str = Form("clinic_syndromic")
):
    """
    Accepts CSV upload for clinic summaries, laboratory summaries, pharmacy demand, absenteeism, or capacity.
    Validates CSV schema and rejects disallowed direct identifiers server-side.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only CSV (.csv) files are supported.")

    content = await file.read()
    try:
        decoded = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Unable to decode file as UTF-8.")

    csv_reader = csv.DictReader(io.StringIO(decoded))
    headers = [h.strip() for h in (csv_reader.fieldnames or [])]

    # Prohibited columns inspection
    disallowed_found = [h for h in headers if any(dis in h.lower() for dis in [
        "name", "phone", "email", "ssn", "aadhaar", "address", "dob", "patient_id"
    ])]

    if disallowed_found:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Privacy Validation Failed",
                "message": f"Direct personal identifiers detected in CSV column headers: {disallowed_found}. Upload rejected.",
                "prohibited_columns": disallowed_found
            }
        )

    # Validate required minimal columns
    required_cols = ["date", "zone_id", "value"]
    missing_cols = [c for c in required_cols if c not in headers]
    if missing_cols:
        raise HTTPException(
            status_code=400,
            detail=f"CSV missing mandatory schema columns: {missing_cols}. Expected at least {required_cols}."
        )

    rows_processed = 0
    suppressed_count = 0
    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    for row in csv_reader:
        try:
            val = float(row.get("value", 0.0))
        except ValueError:
            continue

        zone = row.get("zone_id", "Z1_SATHY")
        sig = row.get("signal_type", f"{source_type}_metric")
        suppressed = (0 < val < 5)
        if suppressed:
            suppressed_count += 1
            val = 5.0

        event = {
            "id": f"upload-{uuid.uuid4().hex[:8]}",
            "source": source_type,
            "zone": zone,
            "signal": sig,
            "value": val,
            "unit": row.get("unit", "count"),
            "timestamp": row.get("date", now_iso),
            "data_mode": "file_upload",
            "pii_present": False,
            "small_cell_suppressed": suppressed,
            "metadata": {
                "filename": file.filename,
                "upload_timestamp": now_iso
            }
        }
        data_store.record_ingested_event(event)
        rows_processed += 1

    return {
        "status": "success",
        "filename": file.filename,
        "source_type": source_type,
        "records_ingested": rows_processed,
        "small_cell_suppressed_records": suppressed_count,
        "privacy_status": "Verified: Zero direct identifiers present. Schema valid.",
        "message": f"Successfully validated and ingested {rows_processed} records from '{file.filename}'."
    }
