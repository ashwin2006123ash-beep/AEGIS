# AEGIS-Epi
### AI-Powered Public Health Early-Warning & Causal Decision Intelligence Platform
**TCS AI for Impact Hackathon**

---

## 1. Project Overview

**AEGIS-Epi** is an enterprise-grade public health early-warning intelligence platform that detects unusual population-level health patterns by analyzing aggregated, multi-source syndromic telemetry across district zones.

The application assists public health officers in investigating whether an unusual rise in health indicators represents an emerging outbreak or a non-epidemic confounder.

### Core Distinctions
- **Genuine multi-source signals**: Coordinated surges across clinical outpatient consultations, diagnostic laboratory positivity, and retail pharmacy demand that warrant priority investigation.
- **False alarms & confounders**: Precautionary medicine stocking and school absences caused by heavy monsoon rainfall or religious festivals, where clinical indicators remain stable.
- **Reporting artifacts**: Sudden single-day laboratory spikes caused by system outages and batch backlog synchronization rather than new disease transmission.
- **Uncertainty & Governance**: Explicit heuristic evidence scoring (never claiming correlation proves causation), transparent agent reasoning, and mandatory human-in-the-loop review.

> **CRITICAL DISCLAIMER**  
> **AEGIS-Epi is an analytical decision-support prototype.** It does not diagnose individuals, independently confirm outbreaks, or execute clinical or public health interventions automatically. All suggested preparedness actions require authorized human review by designated public health officials.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18 with Vite & TypeScript
- **Styling**: Tailwind CSS (Dark Enterprise Command Center Design System)
- **Icons**: `lucide-react`
- **Visualizations**: `recharts` for 14-day normalized anomaly timelines and 7-day capacity forecasts
- **District Mapping**: Lightweight, interactive SVG district schematic covering 5 zones with real-time anomaly pulse rings

### Backend
- **Framework**: Python 3.11+ / FastAPI
- **Server**: Uvicorn
- **Data Science**: Pandas, NumPy, SciPy for rolling baselines, standardized Z-scores, and cross-source triangulation
- **Persistence**: SQLite (`aegis_audit.db`) for tamper-evident human governance audit records and scenario state
- **Validation**: Pydantic v2 schemas with strict server-side direct identifier rejection (PII scrubber)

---

## 3. Product Architecture

AEGIS-Epi features two synchronized operational dashboards driven by a shared FastAPI analysis engine:

```
                                    +-----------------------------------------+
                                    |        External Health Telemetry        |
                                    |  (Pharmacy, Clinics, Labs, Census, Env) |
                                    +--------------------+--------------------+
                                                         |
                                                         v
                                    +-----------------------------------------+
                                    |     Source-Side Privacy Scrubber        |
                                    | (Drops Direct PII, Small-Cell Mask <5)  |
                                    +--------------------+--------------------+
                                                         |
                                                         v
+-------------------------------+   +--------------------+--------------------+
|    Dashboard 1: Telemetry     |   |              FastAPI Backend            |
| - Live Stream Webhook (2s)    |<->| - Analytics Engine (Z-Scores, Baselines)|
| - 7 Source Integration Cards  |   | - Three-Agent Triangulation Engine      |
| - HIS / CSV Connector Panel   |   | - 7-Day Capacity Forecaster             |
| - Real-time Webhook Terminal  |   | - SQLite Persistent Audit Log           |
+-------------------------------+   +--------------------+--------------------+
                                                         |
                                                         v
                                    +-----------------------------------------+
                                    |       Dashboard 2: AI Command Center    |
                                    | - Executive Metrics & Decision Tier     |
                                    | - 5-Zone Interactive SVG District Map   |
                                    | - 14-Day Multi-Signal Recharts Timeline |
                                    | - Three Analytical Agents (Epi/Skeptic) |
                                    | - 7-Day Hospital Bed Forecast           |
                                    | - Human-in-the-Loop Governance Panel    |
                                    +-----------------------------------------+
```

---

## 4. District Layout (Five Zones)

AEGIS-Epi monitors five connected zones in the demo district:
1. **Zone 1 (`Z1_SATHY`)**: Sathyamangalam (Taluk Hospital, Rural/Forest Interface)
2. **Zone 2 (`Z2_GOBI`)**: Gobichettipalayam (Agricultural & Market Hub)
3. **Zone 3 (`Z3_ERODE`)**: Erode Urban (District Headquarters & Medical College)
4. **Zone 4 (`Z4_PERUNDURAI`)**: Perundurai (Industrial & Institutional Transit Corridor)
5. **Zone 5 (`Z5_BHAVANI`)**: Bhavani (River Basin & Textile Center)

---

## 5. Three Interactive Scenarios

Switching scenarios immediately recalculates the analytics, updating map statuses, agent outputs, timelines, forecasts, and action playbooks:

### Scenario A: Festival + Monsoon False-Alarm Candidate
- **Simulated Data**: +80% surge in pharmacy fever medications and school absences in Sathyamangalam and Bhavani; active heavy rainfall (78.5mm); festival weekend flag active; clinic visits and lab positivity flat at baseline.
- **Engine Response**:
  - *Epidemiologist*: Flags retail OTC spike without clinical outpatient corroboration.
  - *Skeptic*: Verifies meteorological precipitation and calendar festival flags as primary confounders causing precautionary stocking.
  - *Arbiter*: Classifies as **Tier 0 / Tier 1 (Investigation)**. Recommends retail audit and larval survey; strictly avoids raising an outbreak alarm.

### Scenario B: Laboratory Batch-Upload Artifact
- **Simulated Data**: 3-day laboratory reporting gap (0 records ingested) followed by a massive single-day upload of 180+ tests; clinic and pharmacy feeds remain normal.
- **Engine Response**:
  - *Epidemiologist*: Detects abrupt single-day laboratory spike.
  - *Skeptic*: Confirms 72-hour reporting hiatus and active `batch_upload_flag = 1`.
  - *Arbiter*: Classifies as **Tier 0 (Data Reconciliation)**. Cross-source agreement is 0.25; flags delayed LIS backlog ingestion rather than genuine pathogen transmission.

### Scenario C: Emerging Multi-Signal Health Event
- **Simulated Data**: Sustained coordinated multi-day rise across outpatient clinics (+120%), diagnostic lab positivity (4% -> 28%), pharmacy antipyretics (+90%), and absenteeism; clear weather; spreading into Zone 2 via transit corridor.
- **Engine Response**:
  - *Epidemiologist*: High temporal and geographic clustering in Sathyamangalam indicating community-wide transmission.
  - *Skeptic*: Known confounders evaluated and ruled out (no rainfall, no holiday, regular reporting cadence).
  - *Arbiter*: Classifies as **Tier 2 — Priority Human Review**. Heuristic Evidence Score 95/100, cross-source agreement 100%.
  - *Capacity Forecaster*: Projects 120-bed hospital threshold breach within 72 hours, forecasting a shortfall of ~25-30 acute beds.
  - *Action Playbook*: Proposes rapid response surveillance dispatch, hospital bed surge activation, and inter-zone transit fever alerts.

---

## 6. Three-Agent Evidence Evaluation Engine

AEGIS-Epi incorporates three logically distinct, transparent rule-based analytical modules:

1. **Agent 1: Epidemiologist / Hypothesis Generator**
   - Identifies geographic clustering and syndromic alignment.
   - Formulates plausible infectious disease hypotheses.
   - Explicitly catalogs supported observations and identifies missing clinical evidence (e.g., serology, genomic sequencing).

2. **Agent 2: Skeptic / Confounder & Artifact Evaluator**
   - Actively audits alternative explanations: heavy precipitation, festival calendars, delayed uploads, batch synchronization, and single-source retail spikes.
   - Strictly refrains from verifying confounders unless supporting evidence exists in active telemetry.

3. **Agent 3: Arbiter / Evidence Quality & Tier Evaluator**
   - Triangulates evidence from the Epidemiologist and Skeptic.
   - Calculates cross-source agreement and data completeness.
   - Assigns standard governance review tiers:
     - **Tier 0 — Low Concern / Confounded**: Maintain routine monitoring.
     - **Tier 1 — Targeted Investigation**: Specific source verification required.
     - **Tier 2 — Priority Human Review**: Sustained multi-source convergence requiring senior officer authorization.
   - Retains an explicit uncertainty disclaimer on every assessment.

---

## 7. Seven-Day Healthcare Capacity Forecaster

- Fits an empirical statistical trend model on historical bed census data.
- Projects demand across a 7-day future horizon with expanding 95% prediction intervals ($y \pm 1.96 \times \text{RMSE} \times \sqrt{1 + h/5}$).
- Compares demand against the 120-bed taluk hospital threshold.
- Automatically computes projected shortfall magnitude and crossing date when surge criteria are met.

---

## 8. Installation & Running Locally

### Prerequisites
- Python 3.11+ (Python 3.13 verified)
- Node.js v18+ and npm

### Step 1: Install Backend Dependencies
```bash
# In project root
pip install -r backend/requirements.txt
```

### Step 2: Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### Step 3: Run the Application (Two Terminals)

#### Terminal 1 — Start the FastAPI Backend:
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Health Check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- Interactive OpenAPI / Swagger Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

#### Terminal 2 — Start the React Frontend:
```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
- Application Web UI: [http://127.0.0.1:5173](http://127.0.0.1:5173)

---

## 9. Running Automated Tests

Run the full automated test suite verifying health, privacy enforcement, scenario differentiations, custom signal recalculations, and governance audit persistence:

```bash
python -m pytest backend/tests/test_all.py -v
```

All 8 test suites pass with 100% success:
- `test_health_check`
- `test_privacy_scrubber_rejection`
- `test_privacy_scrubber_small_cell_suppression`
- `test_ingest_pos_endpoint_privacy_enforcement`
- `test_scenarios_differentiation`
- `test_custom_scenario_recalculation`
- `test_governance_action_persistence`
- `test_simulated_stream_webhook_generator`

---

## 10. Demo Scenario Walkthrough Guide

1. **Open the Application**: Open `http://127.0.0.1:5173` in any modern web browser.
2. **Review Default Scenario A**:
   - Notice the Amber/Tier 1 status on the header.
   - Examine the 5-zone map: Sathyamangalam is amber with active precipitation.
   - Observe the Three-Agent engine: The Skeptic highlights heavy monsoon rains (78mm) and festival holiday calendar.
   - Notice that clinic visits and lab positivity are flat.
3. **Explore Edge Telemetry Hub (Tab 1)**:
   - Click "Zero-Touch Telemetry Hub" in the header navigation.
   - Click **Start Live Demo Stream (2s)**: Watch simulated JSON telemetry webhooks scroll in real-time in the Live Terminal.
   - Inspect the **Privacy Scrubber Demo**: See how raw patient names and phone numbers are dropped at the edge and small cells (<5) are suppressed.
   - Test the **HIS/LIS Connector**: Click "Test Connection" to verify simulated mTLS handshake.
   - Test **CSV Ingestion**: Upload a sample CSV file or custom batch.
4. **Switch to Scenario C (Emerging Event)**:
   - In the Stream Controller bar, click **Scenario C: Emerging Event**.
   - Switch back to the **Officer AI Command Center (Tab 2)**:
   - Notice the header transitions to **Tier 2 — Priority Human Review** with glowing rose alerts.
   - Zone 1 (Sathyamangalam) and Zone 2 (Gobichettipalayam) show active pulsing radar rings on the map.
   - The 7-Day Capacity Forecaster projects hospital bed demand exceeding the 120-bed ceiling with an estimated shortfall of +25 to +30 beds.
5. **Add Custom Signal Spike**:
   - Click **Add Custom Signal Spike** in the header.
   - Move sliders (e.g., set Pharmacy to +200%, Clinic visits to +100%, Lab to +80%).
   - Click **Recalculate Analysis**: The entire dashboard recalculates dynamically in real time without hardcoded outputs.
6. **Execute Human Governance Decision**:
   - Scroll down to the **Human-in-the-Loop Governance Panel**.
   - Click **Authorize Selected Plan**.
   - Review the confirmation dialog, enter reviewer ID (e.g., `OFFICER-ERODE-01`) and rationale.
   - Click **Sign & Record to Audit Log**: The action is persisted into the SQLite database and appears in the audit table below.

---

## 11. Governance, Privacy & Compliance Notes

- **NIST AI RMF 1.0 Aligned**: Governed under the NIST AI Risk Management Framework and its Generative AI Profile recommendations for transparency, human oversight, and uncertainty disclosure.
- **Source-Side Data Minimization (DPDPA / HIPAA Pattern)**: Direct identifiers (`patient_name`, `phone`, `aadhaar`, `email`, `ssn`, `dob`) are strictly rejected by the ingestion API boundary.
- **Small-Cell Suppression**: Group aggregate cells below 5 are suppressed or masked to eliminate auxiliary re-identification risk.
- **Immutable SQLite Audit Logging**: Every governance action (authorization, downgrade, dismissal) records reviewer identity, timestamp, decision tier, and rationale for auditability.

---

## 12. License & Credits

Developed for the **TCS AI for Impact Hackathon**. Built with FastAPI, React, Vite, Tailwind CSS, and Recharts.
