from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List
from ..services.auth import authenticate_user, create_access_token, get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication & Access Control"])

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    user: Dict[str, Any]

@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest):
    user = authenticate_user(req.username.strip(), req.password.strip())
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password.")
        
    token = create_access_token({
        "sub": user["id"],
        "username": user["username"],
        "role": user["role"],
        "organization_id": user["organization_id"],
        "location_id": user["location_id"],
        "full_name": user["full_name"],
        "organization_name": user["organization_name"],
        "organization_type": user["organization_type"],
        "location_name": user["location_name"]
    })
    
    return LoginResponse(
        access_token=token,
        token_type="Bearer",
        user=user
    )

@router.get("/me")
def get_current_user_profile(user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "status": "authenticated",
        "user": user
    }

@router.post("/logout")
def logout(user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "status": "success",
        "message": f"User {user.get('username')} logged out successfully."
    }

@router.get("/demo-users")
def list_demo_users() -> List[Dict[str, Any]]:
    """Returns pre-configured demo accounts for quick switcher on the login interface."""
    return [
        {
            "role": "admin",
            "username": "admin",
            "password": "AdminPass123!",
            "label": "Chief District Epidemiologist (Central Admin)",
            "organization": "District Public Health Command Center",
            "location": "All Locations (Erode District HQ)",
            "description": "Full access to Central Dashboard, location switcher, cross-source AI, capacity forecasting, and governance approval."
        },
        {
            "role": "client",
            "username": "pharm_sathy",
            "password": "ClientPass123!",
            "label": "Sathyamangalam Care Pharmacy (Client)",
            "organization": "Sathyamangalam Care Pharmacy Network",
            "location": "Sathyamangalam",
            "description": "Tenant isolated: access to pharmacy OTC demand feeds, billing adapter, baseline trends, and local anomaly alerts."
        },
        {
            "role": "client",
            "username": "clinic_erode",
            "password": "ClientPass123!",
            "label": "Erode Urban Primary Health Center (Client)",
            "organization": "Erode Urban Primary Health Center",
            "location": "Erode Urban",
            "description": "Tenant isolated: outpatient syndromic ILI consultation telemetry, CSV upload, and clinical quality checks."
        },
        {
            "role": "client",
            "username": "lab_sathy",
            "password": "ClientPass123!",
            "label": "Sathy Diagnostic & Molecular PathLab (Client)",
            "organization": "Sathy Diagnostic & Molecular PathLab",
            "location": "Sathyamangalam",
            "description": "Tenant isolated: test positivity rates, batch backlog artifact audit, and LIS connector status."
        },
        {
            "role": "client",
            "username": "school_gobi",
            "password": "ClientPass123!",
            "label": "Gobi Municipal School Council (Client)",
            "organization": "Gobichettipalayam Municipal School Council",
            "location": "Gobichettipalayam",
            "description": "Tenant isolated: institutional absenteeism rates and holiday calendar alignment."
        },
        {
            "role": "client",
            "username": "hosp_erode",
            "password": "ClientPass123!",
            "label": "Erode Medical College Resource Center (Client)",
            "organization": "Erode Medical College Resource Center",
            "location": "Erode Urban",
            "description": "Tenant isolated: acute bed census telemetry and hospital capacity threshold monitoring."
        }
    ]
