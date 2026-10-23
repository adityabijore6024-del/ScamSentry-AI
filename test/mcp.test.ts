import { test, describe } from 'node:test';
import assert from 'node:assert';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createScamSentryMcpServer, MCP_TOOL_DEFINITIONS, MCP_SERVER_INFO } from '../server/mcp/mcpServer.ts';

describe('MCP Official Client & Protocol Integration Tests', () => {
  test('Official MCP Client connects and performs protocol handshake with server', async () => {
    const server = createScamSentryMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client(
      { name: 'scamsentry-test-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    // Verify protocol version and server metadata
    assert.strictEqual(MCP_SERVER_INFO.name, 'scamsentry-mcp-server');
    assert.strictEqual(MCP_SERVER_INFO.protocolVersion, '2025-11-25');
    assert.strictEqual(MCP_SERVER_INFO.version, '1.0.0');

    await client.close();
  });

  test('Official MCP Client discovers all 8 tools via client.listTools()', async () => {
    const server = createScamSentryMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client(
      { name: 'scamsentry-test-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    const result = await client.listTools();
    assert.ok(Array.isArray(result.tools));
    assert.strictEqual(result.tools.length, 8);

    const toolNames = result.tools.map(t => t.name);
    const requiredTools = [
      'analyze_message',
      'inspect_url',
      'assess_evidence',
      'create_safety_plan',
      'save_investigation',
      'get_investigation',
      'prepare_incident_report',
      'verify_action'
    ];

    for (const reqTool of requiredTools) {
      assert.ok(toolNames.includes(reqTool), `Tool '${reqTool}' must be present in tools/list`);
    }

    await client.close();
  });

  test('Official MCP Client executes inspect_url and parses structured output', async () => {
    const server = createScamSentryMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client(
      { name: 'scamsentry-test-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    const res = await client.callTool({
      name: 'inspect_url',
      arguments: {
        url: 'https://paypal.com.verification-security.click/login'
      }
    });

    const resContent = res.content as Array<{ type: string; text?: string }>;
    assert.ok(resContent && resContent.length > 0);
    assert.strictEqual(resContent[0].type, 'text');
    const parsed = JSON.parse(resContent[0].text || '{}');

    assert.strictEqual(parsed.hasDeceptiveSubdomain, true);
    assert.strictEqual(parsed.lookalikeTarget, 'PayPal');
    assert.strictEqual(parsed.reputationCheck.performed, false);

    await client.close();
  });

  test('Official MCP Client executes create_safety_plan and verify_action', async () => {
    const server = createScamSentryMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client(
      { name: 'scamsentry-test-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    const safetyRes = await client.callTool({
      name: 'create_safety_plan',
      arguments: {
        riskLevel: 'CRITICAL',
        hasCredentialsExposed: true,
        hasPaymentDemanded: true,
        claimedOrganization: 'Amazon'
      }
    });

    const safetyContent = safetyRes.content as Array<{ type: string; text?: string }>;
    const parsedSafety = JSON.parse(safetyContent[0].text || '{}');
    assert.strictEqual(parsedSafety.riskLevel, 'CRITICAL');
    assert.ok(parsedSafety.actionItems.length >= 3);

    const verifyRes = await client.callTool({
      name: 'verify_action',
      arguments: {
        actionType: 'REPORT_GENERATION_VERIFICATION',
        targetId: 'REP-TEST-12345'
      }
    });

    const verifyContent = verifyRes.content as Array<{ type: string; text?: string }>;
    const parsedVerify = JSON.parse(verifyContent[0].text || '{}');
    assert.strictEqual(parsedVerify.verified, true);

    await client.close();
  });

  test('Official MCP Client handles invalid arguments and returns structured error', async () => {
    const server = createScamSentryMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client(
      { name: 'scamsentry-test-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    // inspect_url missing required 'url' parameter
    const result = await client.callTool({
      name: 'inspect_url',
      arguments: {}
    });

    assert.strictEqual(result.isError, true);
    const resultContent = result.content as Array<{ type: string; text?: string }>;
    assert.ok(resultContent && resultContent[0].type === 'text');
    const parsed = JSON.parse(resultContent[0].text || '{}');
    assert.ok(parsed.error);

    await client.close();
  });

  test('Official MCP Client handles call to non-existent tool', async () => {
    const server = createScamSentryMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client(
      { name: 'scamsentry-test-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    await assert.rejects(
      async () => {
        await client.callTool({
          name: 'non_existent_tool_xyz',
          arguments: {}
        });
      },
      (err: any) => {
        return err?.message?.includes('not recognized') || err?.code === -32601;
      }
    );

    await client.close();
  });

  test('Official MCP Client: save_investigation without authorization returns UNAUTHORIZED error', async () => {
    // Server created with auth validator that requires valid token
    const server = createScamSentryMcpServer({
      authValidator: (token?: string) => token === 'valid-secret-token'
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client(
      { name: 'scamsentry-test-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    const res = await client.callTool({
      name: 'save_investigation',
      arguments: {
        messageText: 'Sample phishing message',
        riskLevel: 'HIGH',
        riskScore: 80,
        assessment: { overallRiskLevel: 'HIGH' },
        safetyPlan: { actionItems: [] }
      }
    });

    assert.strictEqual(res.isError, true);
    const content = res.content as Array<{ type: string; text?: string }>;
    assert.ok(content && content[0].text?.includes('UNAUTHORIZED'));

    await client.close();
  });

  test('Official MCP Client: save_investigation and get_investigation with valid authorization succeeds', async () => {
    const server = createScamSentryMcpServer({
      authValidator: (token?: string) => token === 'valid-secret-token'
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client(
      { name: 'scamsentry-test-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    // Call save_investigation with valid authToken
    const saveRes = await client.callTool({
      name: 'save_investigation',
      arguments: {
        authToken: 'valid-secret-token',
        messageText: 'Authorized test phishing alert',
        riskLevel: 'CRITICAL',
        riskScore: 95,
        assessment: { overallRiskLevel: 'CRITICAL' },
        safetyPlan: { actionItems: [] }
      }
    });

    assert.ok(!saveRes.isError, 'saveRes must not have isError flag');
    const saveContent = saveRes.content as Array<{ type: string; text?: string }>;
    const savedData = JSON.parse(saveContent[0].text || '{}');
    assert.ok(savedData.caseId);
    assert.strictEqual(savedData.persisted, true);

    // Call get_investigation with valid authToken
    const getRes = await client.callTool({
      name: 'get_investigation',
      arguments: {
        authToken: 'valid-secret-token',
        caseId: savedData.caseId
      }
    });

    assert.ok(!getRes.isError, 'getRes must not have isError flag');
    const getContent = getRes.content as Array<{ type: string; text?: string }>;
    const retrievedData = JSON.parse(getContent[0].text || '{}');
    assert.strictEqual(retrievedData.found, true);
    assert.strictEqual(retrievedData.caseRecord.id, savedData.caseId);

    await client.close();
  });
});
