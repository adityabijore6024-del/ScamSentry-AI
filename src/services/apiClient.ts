import type {
  InvestigationExecutionPlan,
  PersistedInvestigationCase,
  SystemHealthStatus,
  McpToolDefinition
} from '../types/index.ts';

let inMemorySessionToken: string | null = null;

export function getStoredSessionToken(): string | null {
  if (inMemorySessionToken) return inMemorySessionToken;
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('scamsentry_session_token');
    if (stored) {
      inMemorySessionToken = stored;
      return stored;
    }
  }
  return null;
}

export function isSessionActive(): boolean {
  return Boolean(getStoredSessionToken());
}

export async function loginWithPasscode(passcode: string): Promise<boolean> {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode: passcode.trim() }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Authentication failed: Invalid credentials');
  }

  const data = await res.json();
  if (data.sessionToken) {
    inMemorySessionToken = data.sessionToken;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('scamsentry_session_token', data.sessionToken);
    }
    return true;
  }
  return false;
}

export async function logout(): Promise<void> {
  const token = getStoredSessionToken();
  if (token) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-scamsentry-auth': token
      }
    }).catch(() => {});
  }
  inMemorySessionToken = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('scamsentry_session_token');
  }
}

export async function checkAuthStatus(): Promise<boolean> {
  const token = getStoredSessionToken();
  if (!token) return false;

  try {
    const res = await fetch('/api/auth/status', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-scamsentry-auth': token
      }
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.authenticated) {
      inMemorySessionToken = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('scamsentry_session_token');
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = getStoredSessionToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-scamsentry-auth'] = token;
  }
  return headers;
}

export async function runInvestigation(
  messageText: string,
  submittedUrl?: string | null,
  autoSave = true
): Promise<InvestigationExecutionPlan> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch('/api/investigate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders
    },
    body: JSON.stringify({ messageText, submittedUrl, autoSave }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Investigation failed with status ${res.status}`);
  }

  return res.json();
}

export async function fetchCases(params?: {
  search?: string;
  riskLevel?: string;
  limit?: number;
  offset?: number;
}): Promise<{ cases: PersistedInvestigationCase[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.riskLevel) query.set('riskLevel', params.riskLevel);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));

  const authHeaders = await getAuthHeaders();
  const res = await fetch(`/api/cases?${query.toString()}`, {
    headers: authHeaders
  });
  if (!res.ok) throw new Error('Failed to load saved cases. Please verify authorization.');
  return res.json();
}

export async function fetchCaseById(id: string): Promise<PersistedInvestigationCase> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`/api/cases/${encodeURIComponent(id)}`, {
    headers: authHeaders
  });
  if (!res.ok) throw new Error('Case not found or access denied');
  return res.json();
}

export async function deleteCase(id: string): Promise<boolean> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`/api/cases/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      ...authHeaders,
      'x-confirm-destructive': 'CONFIRM_DELETE'
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete case');
  }
  const data = await res.json();
  return Boolean(data.success);
}

export async function clearAllCases(): Promise<number> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch('/api/cases', {
    method: 'DELETE',
    headers: {
      ...authHeaders,
      'x-confirm-destructive': 'CONFIRM_DELETE'
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to clear database');
  }
  const data = await res.json();
  return data.deletedCount || 0;
}

export async function fetchSystemHealth(): Promise<SystemHealthStatus> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchMcpInfo(): Promise<{
  server: { name: string; version: string; protocolVersion: string };
  tools: McpToolDefinition[];
  protocolVersion: string;
}> {
  const res = await fetch('/api/mcp/info');
  if (!res.ok) throw new Error('Failed to fetch MCP server info');
  return res.json();
}

export async function sendMcpRpcRequest(method: string, params: any = {}, id = 1): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch('/api/mcp/rpc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `MCP RPC call returned HTTP ${res.status}`);
  }

  return res.json();
}
