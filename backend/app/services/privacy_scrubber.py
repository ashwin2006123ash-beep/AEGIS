from typing import Dict, Any, List, Tuple
from ..models.schemas import PrivacyValidationResult

# Prohibited direct identifiers that violate privacy minimization
DISALLOWED_IDENTIFIERS = [
    "patient_name", "name", "customer_name",
    "phone", "phone_number", "mobile",
    "email", "email_address",
    "national_id", "aadhaar", "ssn", "passport_number",
    "address", "street_address", "home_address",
    "dob", "date_of_birth", "birth_date",
    "mrn", "patient_id", "patient_mrn",
    "credit_card", "bank_account"
]

SMALL_CELL_THRESHOLD = 5

def inspect_and_sanitize_payload(payload: Dict[str, Any]) -> PrivacyValidationResult:
    """
    Validates incoming payload against direct identifiers, enforces small-cell suppression (<5),
    and returns sanitized aggregated event data suitable for ingestion.
    """
    keys_lower = {k.lower(): k for k in payload.keys()}
    detected_pii: List[str] = []
    
    for disallowed in DISALLOWED_IDENTIFIERS:
        for key_low, original_key in keys_lower.items():
            if disallowed in key_low or key_low in disallowed:
                detected_pii.append(original_key)
                
    # Also inspect string values for obvious phone numbers or email patterns
    for k, v in payload.items():
        if isinstance(v, str):
            if "@" in v and "." in v and k not in detected_pii:
                detected_pii.append(f"{k} (email-like value)")
            elif len(v.replace("-", "").replace(" ", "")) == 10 and v.replace("-", "").replace(" ", "").isdigit() and k not in detected_pii:
                detected_pii.append(f"{k} (phone-like value)")

    detected_pii = list(set(detected_pii))
    
    # Check for small cell suppression
    small_cell_suppressed = False
    val = payload.get("value")
    if isinstance(val, (int, float)) and 0 < val < SMALL_CELL_THRESHOLD:
        small_cell_suppressed = True

    # If direct PII is detected, strictly reject in accordance with data minimization
    if detected_pii:
        return PrivacyValidationResult(
            is_valid=False,
            pii_detected=True,
            detected_fields=detected_pii,
            small_cell_suppressed=small_cell_suppressed,
            original_record_preview={k: ("***REDACTED***" if k in detected_pii else v) for k, v in payload.items()},
            sanitized_record=None,
            message=f"Privacy violation: Direct personal identifiers detected in incoming telemetry [{', '.join(detected_pii)}]. Payload rejected."
        )

    # Sanitize payload: ensure zone is standardized, small-cell masked if necessary
    sanitized = {k: v for k, v in payload.items() if k not in detected_pii}
    if small_cell_suppressed:
        sanitized["value"] = SMALL_CELL_THRESHOLD  # or flagged as <5
        sanitized["small_cell_suppression_applied"] = True
    else:
        sanitized["small_cell_suppression_applied"] = False

    return PrivacyValidationResult(
        is_valid=True,
        pii_detected=False,
        detected_fields=[],
        small_cell_suppressed=small_cell_suppressed,
        original_record_preview=payload,
        sanitized_record=sanitized,
        message="Privacy scrubber verified: zero direct identifiers detected. Data minimization and aggregation constraints satisfied."
    )

def get_demo_scrubber_example() -> Dict[str, Any]:
    """
    Returns an illustrative demonstration of source-side data minimization for UI display.
    """
    raw_record = {
        "transaction_id": "TXN-20261031-98214",
        "customer_name": "Kavitha R.",
        "phone_number": "+91 98421-XXXXX",
        "product_category": "Antipyretic / Paracetamol 650mg",
        "quantity_sold": 4,
        "zone": "Zone 1 — Sathyamangalam",
        "store_id": "PHARM-SATHY-004",
        "timestamp": "2026-10-31T09:42:15"
    }
    
    sanitized_event = {
        "source": "pharmacy_pos",
        "zone": "Z1_SATHY",
        "signal": "fever_medicine_demand",
        "aggregated_quantity": 4,
        "suppression_rule": "Small-cell (<5) masked to group aggregate",
        "pii_present": False,
        "data_mode": "synthetic_demo",
        "timestamp": "2026-10-31T09:45:00"
    }
    
    return {
        "raw_record": raw_record,
        "redacted_fields": ["customer_name", "phone_number", "transaction_id"],
        "sanitized_event": sanitized_event,
        "k_anonymity_note": "Small-cell suppression enforced for counts < 5. Direct identifiers dropped at source before transmission."
    }
