import type {
  DashboardSummaryResponse,
  IngestionStatusResponse,
  PrivacyDemoScrubber,
  CustomScenarioRequest,
  GovernanceAuditRecord,
  CapacityForecast,
  TelemetryEvent,
  UserProfile,
  DemoUser,
  ClientOrganizationProfile,
  ClientAnalysisResponse,
  AdminLocation,
  AdminOrganization,
  AdminSummaryResponse,
  AdminRecommendation,
} from '../types';

const API_BASE = 'http://localhost:8000';

let authToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('aegis_auth_token') : null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('aegis_auth_token', token);
    } else {
      localStorage.removeItem('aegis_auth_token');
    }
  }
};

export const getAuthToken = () => authToken;

function getAuthHeaders(includeContentType: boolean = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

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
  // Authentication & Session
  async login(username: string, password: string): Promise<{ access_token: string; token_type: string; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await handleResponse<{ access_token: string; token_type: string; user: UserProfile }>(res);
    setAuthToken(data.access_token);
    return data;
  },

  async getMe(): Promise<{ status: string; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: getAuthHeaders(false),
    });
    return handleResponse(res);
  },

  async getDemoUsers(): Promise<DemoUser[]> {
    const res = await fetch(`${API_BASE}/api/v1/auth/demo-users`);
    return handleResponse(res);
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(false),
      });
    } catch (e) {
      console.warn('Logout API failed, continuing local clear', e);
    }
    setAuthToken(null);
  },

  // Client Dashboard API (Tenant Isolated)
  async getClientProfile(orgId?: string): Promise<ClientOrganizationProfile> {
    const url = orgId 
      ? `${API_BASE}/api/v1/client/profile?org_id=${encodeURIComponent(orgId)}`
      : `${API_BASE}/api/v1/client/profile`;
    const res = await fetch(url, { headers: getAuthHeaders(false) });
    return handleResponse(res);
  },

  async getClientAnalysis(orgId?: string): Promise<ClientAnalysisResponse> {
    const url = orgId
      ? `${API_BASE}/api/v1/client/analysis?org_id=${encodeURIComponent(orgId)}`
      : `${API_BASE}/api/v1/client/analysis`;
    const res = await fetch(url, { headers: getAuthHeaders(false) });
    return handleResponse(res);
  },

  async getClientTimeline(orgId?: string): Promise<{ organization_id: string; timeline: any[] }> {
    const url = orgId
      ? `${API_BASE}/api/v1/client/timeline?org_id=${encodeURIComponent(orgId)}`
      : `${API_BASE}/api/v1/client/timeline`;
    const res = await fetch(url, { headers: getAuthHeaders(false) });
    return handleResponse(res);
  },

  async syncClientConnector(orgId?: string): Promise<{ status: string; organization_id: string; last_sync: string; message: string }> {
    const url = orgId
      ? `${API_BASE}/api/v1/client/connector/sync?org_id=${encodeURIComponent(orgId)}`
      : `${API_BASE}/api/v1/client/connector/sync`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(false),
    });
    return handleResponse(res);
  },

  async updateClientConnectorConfig(
    config: { endpoint_url: string; auth_type?: string; cadence?: string; small_cell_masking?: boolean },
    orgId?: string
  ): Promise<{ status: string; message: string }> {
    const url = orgId
      ? `${API_BASE}/api/v1/client/connector/config?org_id=${encodeURIComponent(orgId)}`
      : `${API_BASE}/api/v1/client/connector/config`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(config),
    });
    return handleResponse(res);
  },

  async uploadClientCsv(file: File, orgId?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (orgId) {
      formData.append('org_id', orgId);
    }
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const res = await fetch(`${API_BASE}/api/v1/client/upload-csv`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse(res);
  },

  async getClientAuditLog(orgId?: string): Promise<{ organization_id: string; total_records: number; recent_observations: any[] }> {
    const url = orgId
      ? `${API_BASE}/api/v1/client/audit-log?org_id=${encodeURIComponent(orgId)}`
      : `${API_BASE}/api/v1/client/audit-log`;
    const res = await fetch(url, { headers: getAuthHeaders(false) });
    return handleResponse(res);
  },

  // Central Public Health Dashboard API (Admin Command Center)
  async getAdminLocations(): Promise<{ status: string; count: number; locations: AdminLocation[] }> {
    const res = await fetch(`${API_BASE}/api/v1/admin/locations`, {
      headers: getAuthHeaders(false),
    });
    return handleResponse(res);
  },

  async getAdminOrganizations(locationId?: string): Promise<{ status: string; count: number; organizations: AdminOrganization[] }> {
    const url = locationId
      ? `${API_BASE}/api/v1/admin/organizations?location_id=${encodeURIComponent(locationId)}`
      : `${API_BASE}/api/v1/admin/organizations`;
    const res = await fetch(url, { headers: getAuthHeaders(false) });
    return handleResponse(res);
  },

  async getAdminSummary(locationId: string = 'SATHYAMANGALAM'): Promise<AdminSummaryResponse> {
    const res = await fetch(`${API_BASE}/api/v1/admin/summary?location_id=${encodeURIComponent(locationId)}`, {
      headers: getAuthHeaders(false),
    });
    return handleResponse(res);
  },

  async getAdminTimeline(locationId: string = 'SATHYAMANGALAM'): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/admin/timeline?location_id=${encodeURIComponent(locationId)}`, {
      headers: getAuthHeaders(false),
    });
    return handleResponse(res);
  },

  async getAdminForecast(locationId: string = 'SATHYAMANGALAM'): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/admin/forecast?location_id=${encodeURIComponent(locationId)}`, {
      headers: getAuthHeaders(false),
    });
    return handleResponse(res);
  },

  async getAdminRecommendations(locationId: string = 'SATHYAMANGALAM'): Promise<{ location_id: string; decision_tier: string; recommendations: AdminRecommendation[] }> {
    const res = await fetch(`${API_BASE}/api/v1/admin/recommendations?location_id=${encodeURIComponent(locationId)}`, {
      headers: getAuthHeaders(false),
    });
    return handleResponse(res);
  },

  async recordAdminGovernanceAction(data: {
    action: string;
    location_id: string;
    rationale: string;
    recommendation_id?: string;
    priority_level?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/admin/governance/action`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getAdminAuditLog(locationId?: string, limit: number = 50): Promise<{ status: string; count: number; audit_logs: GovernanceAuditRecord[] }> {
    const url = locationId
      ? `${API_BASE}/api/v1/admin/governance/audit-log?location_id=${encodeURIComponent(locationId)}&limit=${limit}`
      : `${API_BASE}/api/v1/admin/governance/audit-log?limit=${limit}`;
    const res = await fetch(url, { headers: getAuthHeaders(false) });
    return handleResponse(res);
  },

  // Legacy & Shared Platform APIs
  async checkHealth(): Promise<{ status: string; service: string }> {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  async getDashboardSummary(zoneId: string = 'Z1_SATHY'): Promise<DashboardSummaryResponse> {
    const res = await fetch(`${API_BASE}/api/v1/dashboard/summary?zone_id=${encodeURIComponent(zoneId)}`);
    return handleResponse(res);
  },

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
