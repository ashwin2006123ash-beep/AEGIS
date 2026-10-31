import hmac
import hashlib
import base64
import json
import time
from typing import Dict, Any, Optional
from fastapi import Header, HTTPException, Depends
from ..database import get_connection, hash_password

SECRET_KEY = "aegis_epi_jwt_secret_token_secure_2026"
TOKEN_EXPIRY_SECONDS = 86400 * 7  # 7 days

def create_access_token(data: Dict[str, Any]) -> str:
    payload = data.copy()
    payload["exp"] = int(time.time()) + TOKEN_EXPIRY_SECONDS
    payload_bytes = json.dumps(payload, sort_keys=True).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode('utf-8').rstrip('=')
    
    signature = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"

def verify_token(token: str) -> Dict[str, Any]:
    try:
        parts = token.split('.')
        if len(parts) != 2:
            raise ValueError("Malformed token")
        payload_b64, signature = parts
        
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            raise ValueError("Invalid signature")
            
        # Add padding if needed
        rem = len(payload_b64) % 4
        if rem > 0:
            payload_b64 += '=' * (4 - rem)
            
        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode('utf-8'))
        if payload.get("exp", 0) < int(time.time()):
            raise ValueError("Token expired")
            
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication invalid or expired: {str(e)}")

def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    pwd_hash = hash_password(password)
    
    cursor.execute("""
        SELECT u.id, u.username, u.role, u.organization_id, u.location_id, u.full_name,
               o.name as organization_name, o.type as organization_type,
               l.name as location_name
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        LEFT JOIN locations l ON u.location_id = l.id
        WHERE u.username = ? AND u.password_hash = ?
    """, (username, pwd_hash))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            "id": row["id"],
            "username": row["username"],
            "role": row["role"],
            "organization_id": row["organization_id"],
            "location_id": row["location_id"],
            "full_name": row["full_name"],
            "organization_name": row["organization_name"],
            "organization_type": row["organization_type"],
            "location_name": row["location_name"]
        }
    return None

def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing. Please log in.")
    
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header format. Expected 'Bearer <token>'.")
        
    token = parts[1]
    payload = verify_token(token)
    return payload

def require_admin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=403, 
            detail="Access forbidden: Central Administrator role required for this endpoint."
        )
    return user

def require_client(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if user.get("role") != "client":
        raise HTTPException(
            status_code=403, 
            detail="Access forbidden: Client Organization role required for this endpoint."
        )
    return user
