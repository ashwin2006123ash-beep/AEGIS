import type {
  DashboardSummaryResponse,
  IngestionStatusResponse,
  PrivacyDemoScrubber,
  CustomScenarioRequest,
  GovernanceAuditRecord,
  CapacityForecast,
  TelemetryEvent
} from '../types';

const API_BASE = 'http://localhost:8000';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'API request failed';
    try {
      const err = await res.json();
      errorDetail = err.detail?.message || err.detail || JSON.stringify(err);
    } catch {
      errorDetail = res.statusText || `${res.status} error`;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // Dashboard & Health
  async checkHealth(): Promise<{ status: string; service: string }> {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  async getDashboardSummary(zoneId: string = 'Z1_SATHY'): Promise<DashboardSummaryResponse> {
    const res = await fetch(`${API_BASE}/api/v1/dashboard/summary?zone_id=${encodeURIComponent(zoneId)}`);
    return handleResponse(res);
  },

  // Scenarios
  async listScenarios(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/api/v1/scenarios`);
    return handleResponse(res);
  },

  async activateScenario(scenario: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/scenarios/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    });
    return handleResponse(res);
  },

  async resetScenario(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/scenarios/reset`, { method: 'POST' });
    return handleResponse(res);
  },

  // Ingestion & Webhooks
  async getIngestionStatus(): Promise<IngestionStatusResponse> {
    const res = await fetch(`${API_BASE}/api/v1/ingestion/status`);
    return handleResponse(res);
  },

  async getIngestedEvents(limit: number = 40): Promise<{ total_events: number; events: TelemetryEvent[] }> {
    const res = await fetch(`${API_BASE}/api/v1/ingestion/events?limit=${limit}`);
    return handleResponse(res);
  },

  async triggerNextStreamEvent(): Promise<{ status: string; event: TelemetryEvent }> {
    const res = await fetch(`${API_BASE}/api/v1/ingestion/stream/next`, { method: 'POST' });
    return handleResponse(res);
  },

  async getPrivacyDemo(): Promise<PrivacyDemoScrubber> {
    const res = await fetch(`${API_BASE}/api/v1/privacy/demo-scrubber`);
    return handleResponse(res);
  },

  async uploadCsv(file: File, sourceType: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_type', sourceType);

    const res = await fetch(`${API_BASE}/api/v1/data/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  // Analysis & Timeline
  async getTimeline(zoneId: string = 'Z1_SATHY'): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/analysis/timeline?zone_id=${encodeURIComponent(zoneId)}`);
    return handleResponse(res);
  },

  async getForecast(zoneId: string = 'Z1_SATHY'): Promise<CapacityForecast> {
    const res = await fetch(`${API_BASE}/api/v1/analysis/forecast?zone_id=${encodeURIComponent(zoneId)}`);
    return handleResponse(res);
  },

  async applyCustomScenario(payload: CustomScenarioRequest): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/analysis/custom-scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async resetCustomScenario(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/analysis/custom-scenario/reset`, { method: 'POST' });
    return handleResponse(res);
  },

  // Governance
  async recordGovernanceAction(actionData: {
    reviewer_id: string;
    action: string;
    scenario: string;
    zone_id: string;
    heuristic_score: number;
    decision_tier: string;
    rationale: string;
    data_quality_warnings?: string[];
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/governance/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actionData),
    });
    return handleResponse(res);
  },

  async getAuditLog(): Promise<{ total_records: number; disclaimer: string; records: GovernanceAuditRecord[] }> {
    const res = await fetch(`${API_BASE}/api/v1/governance/audit-log`);
    return handleResponse(res);
  },
};
