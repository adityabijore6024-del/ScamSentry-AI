import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { SYSTEM_AUTH_TOKEN } from '../server.ts';

describe('Express API Endpoint Security & Authorization Tests', () => {
  const testPort = 3000;
  let sessionToken = '';

  before(async () => {
    // Attempt login using the server's configured passcode to obtain a session token
    const res = await fetch(`http://127.0.0.1:${testPort}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: SYSTEM_AUTH_TOKEN })
    });
    if (res.ok) {
      const data = await res.json();
      sessionToken = data.sessionToken;
    }
  });

  test('Security: GET /api/auth/token is permanently removed and returns 404', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/auth/token`);
    assert.strictEqual(res.status, 404, 'Endpoint must not exist or disclose any secret token');
  });

  test('Security: POST /api/auth/session with invalid passcode returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: 'invalid-attacker-guess' })
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.code, 'INVALID_CREDENTIALS');
  });

  test('Security: POST /api/auth/session with valid passcode issues sessionToken', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: SYSTEM_AUTH_TOKEN })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.authenticated, true);
    assert.ok(body.sessionToken && body.sessionToken.startsWith('sess_'));
    // Ensure the response NEVER contains the master secret
    assert.notStrictEqual(body.sessionToken, SYSTEM_AUTH_TOKEN);
  });

  test('Security: GET /api/cases without authorization header returns 401 Unauthorized', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/cases`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.code, 'UNAUTHORIZED');
  });

  test('Security: GET /api/audit-logs without authorization header returns 401 Unauthorized', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/audit-logs`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.code, 'UNAUTHORIZED');
  });

  test('Security: GET /api/cases with valid session token succeeds', async () => {
    assert.ok(sessionToken, 'Session token must have been acquired');
    const res = await fetch(`http://127.0.0.1:${testPort}/api/cases`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.cases));
  });

  test('Security: DELETE /api/cases/:id without x-confirm-destructive header returns 400', async () => {
    assert.ok(sessionToken, 'Session token must have been acquired');
    const res = await fetch(`http://127.0.0.1:${testPort}/api/cases/CASE-TEST-123`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.code, 'CONFIRMATION_REQUIRED');
  });

  test('Privacy Isolation: Unauthenticated POST /api/investigate runs in ephemeral mode (autoSave disabled)', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/investigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageText: 'Suspicious email offering $500 gift card immediately'
      })
    });
    assert.strictEqual(res.status, 200);
    const plan = await res.json();
    assert.strictEqual(plan.status, 'COMPLETED');
    assert.strictEqual(plan.savedRecord, undefined, 'Unauthenticated runs must NOT persist to shared store');
  });

  test('Persistence: Authenticated POST /api/investigate persists case to database', async () => {
    assert.ok(sessionToken, 'Session token must have been acquired');
    const res = await fetch(`http://127.0.0.1:${testPort}/api/investigate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        messageText: 'Suspicious email offering $500 gift card immediately'
      })
    });
    assert.strictEqual(res.status, 200);
    const plan = await res.json();
    assert.strictEqual(plan.status, 'COMPLETED');
    assert.ok(plan.savedRecord, 'Authenticated runs must persist to store when autoSave is enabled');
    assert.ok(plan.savedRecord.caseId);
  });

  test('MCP Security: POST /api/mcp/rpc rejects unauthenticated save_investigation call', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/mcp/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 99,
        method: 'tools/call',
        params: {
          name: 'save_investigation',
          arguments: {
            messageText: 'fake',
            riskLevel: 'LOW',
            riskScore: 10,
            assessment: {},
            safetyPlan: {}
          }
        }
      })
    });
    assert.strictEqual(res.status, 200);
    const rpcRes = await res.json();
    assert.strictEqual(rpcRes.result.isError, true);
    assert.ok(rpcRes.result.content[0].text.includes('UNAUTHORIZED'));
  });

  test('MCP Security: POST /api/mcp/rpc rejects unauthenticated get_investigation call', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/mcp/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 100,
        method: 'tools/call',
        params: {
          name: 'get_investigation',
          arguments: {
            caseId: 'ANY-CASE-ID'
          }
        }
      })
    });
    assert.strictEqual(res.status, 200);
    const rpcRes = await res.json();
    assert.strictEqual(rpcRes.result.isError, true);
    assert.ok(rpcRes.result.content[0].text.includes('UNAUTHORIZED'));
  });

  test('MCP Discovery: POST /api/mcp/rpc tools/list succeeds for public callers', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/mcp/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 101,
        method: 'tools/list',
        params: {}
      })
    });
    assert.strictEqual(res.status, 200);
    const rpcRes = await res.json();
    assert.ok(Array.isArray(rpcRes.result.tools));
    assert.strictEqual(rpcRes.result.tools.length, 8);
  });

  test('MCP Security: POST /api/mcp/rpc inspect_url succeeds for public callers', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/mcp/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 102,
        method: 'tools/call',
        params: {
          name: 'inspect_url',
          arguments: { url: 'https://example.com' }
        }
      })
    });
    assert.strictEqual(res.status, 200);
    const rpcRes = await res.json();
    assert.strictEqual(rpcRes.result.isError, false);
  });

  test('MCP Security: POST /api/mcp/rpc save_investigation succeeds with valid auth header', async () => {
    assert.ok(sessionToken, 'Session token must have been acquired');
    const res = await fetch(`http://127.0.0.1:${testPort}/api/mcp/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 103,
        method: 'tools/call',
        params: {
          name: 'save_investigation',
          arguments: {
            messageText: 'Phishing test case via authorized MCP',
            riskLevel: 'HIGH',
            riskScore: 75,
            assessment: { overallRiskLevel: 'HIGH' },
            safetyPlan: { actionItems: [] }
          }
        }
      })
    });
    assert.strictEqual(res.status, 200);
    const rpcRes = await res.json();
    assert.strictEqual(rpcRes.result.isError, false);
    const contentText = rpcRes.result.content[0].text;
    const parsed = JSON.parse(contentText);
    assert.ok(parsed.caseId);
    assert.strictEqual(parsed.persisted, true);
  });

  test('Security: POST /api/investigate with empty body triggers 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/investigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(body.issues));
  });
});
