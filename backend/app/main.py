from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os

from .api.dashboard import router as dashboard_router
from .api.scenarios import router as scenarios_router
from .api.ingest import router as ingest_router
from .api.analysis import router as analysis_router
from .api.governance import router as governance_router
from .api.auth import router as auth_router
from .api.client import router as client_router
from .api.admin import router as admin_router
from .database import init_db
from .services.data_store import data_store

app = FastAPI(
    title="AEGIS-Epi API",
    description="Causal Public Health Intelligence Platform — AI-Powered Multi-Source Early Warning & Governance Engine",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(client_router)
app.include_router(admin_router)
app.include_router(dashboard_router)
app.include_router(scenarios_router)
app.include_router(ingest_router)
app.include_router(analysis_router)
app.include_router(governance_router)

@app.on_event("startup")
def on_startup():
    init_db()
    data_store.load_all_datasets()

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AEGIS-Epi Backend",
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "version": "1.0.0",
        "active_scenario": data_store.active_scenario,
        "database": "sqlite_persistent",
        "privacy_engine": "active_data_minimization",
        "disclaimer": "AEGIS-Epi is a decision-support prototype. Automated intervention disabled."
    }

@app.get("/")
def root():
    return {
        "platform": "AEGIS-Epi | Causal Public Health Intelligence",
        "hackathon": "TCS AI for Impact",
        "documentation": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
