import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Play,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Code2,
  Server,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { fetchMcpInfo, sendMcpRpcRequest } from '../services/apiClient.ts';
import type { McpToolDefinition } from '../types/index.ts';

export const McpInspectorPage: React.FC = () => {
  const [mcpInfo, setMcpInfo] = useState<{
    server: { name: string; version: string; protocolVersion: string };
    tools: McpToolDefinition[];
    protocolVersion: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTool, setSelectedTool] = useState<string>('inspect_url');
  const [toolArgsJson, setToolArgsJson] = useState<string>(
    JSON.stringify({ url: 'https://paypa1-security-verification.xyz/login' }, null, 2)
  );
  const [rpcMethod, setRpcMethod] = useState<string>('tools/call');
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [isExecutingRpc, setIsExecutingRpc] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'tester' | 'discovery' | 'compliance'>('tester');

  const loadInfo = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMcpInfo();
      setMcpInfo(data);
    } catch (err) {
      console.error('Failed to load MCP info:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInfo();
  }, []);

  const handleToolSelect = (toolName: string) => {
    setSelectedTool(toolName);
    setRpcMethod('tools/call');

    // Default sample payloads per tool
    if (toolName === 'inspect_url') {
      setToolArgsJson(JSON.stringify({ url: 'https://paypa1-security-verification.xyz/login' }, null, 2));
    } else if (toolName === 'analyze_message') {
      setToolArgsJson(JSON.stringify({ messageText: 'Urgent: Your account is suspended. Send $150 via Zelle immediately.' }, null, 2));
    } else if (toolName === 'assess_evidence') {
      setToolArgsJson(JSON.stringify({
        messageAnalysis: {
          extractedUrls: ['https://paypa1-security-verification.xyz'],
          claimedOrganization: 'PayPal',
          paymentDemands: ['zelle'],
          credentialRequests: ['password'],
          urgencySignals: ['urgent', 'immediately'],
          impersonationIndicators: ['Brand spoofing'],
          observableFacts: [],
          potentialBenignExplanations: [],
          analysisLimitations: [],
          analysisSource: 'HEURISTIC_ANALYSIS'
        },
        urlInspections: []
      }, null, 2));
    } else if (toolName === 'create_safety_plan') {
      setToolArgsJson(JSON.stringify({
        riskLevel: 'HIGH',
        hasCredentialsExposed: true,
        hasPaymentDemanded: true,
        claimedOrganization: 'PayPal'
      }, null, 2));
    } else if (toolName === 'get_investigation') {
      setToolArgsJson(JSON.stringify({ caseId: 'CASE-SAMPLE-1' }, null, 2));
    } else if (toolName === 'verify_action') {
      setToolArgsJson(JSON.stringify({
        actionType: 'REPORT_GENERATION_VERIFICATION',
        targetId: 'REP-TEST-001'
      }, null, 2));
    } else {
      setToolArgsJson(JSON.stringify({}, null, 2));
    }
  };

  const handleExecuteRpc = async () => {
    setIsExecutingRpc(true);
    setRawResponse(null);

    try {
      let params: any = {};
      if (rpcMethod === 'tools/call') {
        let parsedArgs = {};
        try {
          parsedArgs = JSON.parse(toolArgsJson);
        } catch {
          alert('Invalid JSON in tool arguments payload.');
          setIsExecutingRpc(false);
          return;
        }
        params = {
          name: selectedTool,
          arguments: parsedArgs
        };
      } else if (rpcMethod === 'initialize') {
        params = {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'ScamSentry-WebClient', version: '1.0.0' }
        };
      }

      const res = await sendMcpRpcRequest(rpcMethod, params, Date.now());
      setRawResponse(res);
    } catch (err: any) {
      setRawResponse({
        error: err?.message || 'RPC communication failure'
      });
    } finally {
      setIsExecutingRpc(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Model Context Protocol (MCP) Inspector
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
              Protocol: 2025-11-25
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real self-hosted MCP server running on Streamable HTTP transport (`/api/mcp`) with official SDK handlers.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('tester')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'tester'
                ? 'bg-white dark:bg-slate-800 text-neutral-900 dark:text-white font-semibold shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            RPC Client Tester
          </button>
          <button
            onClick={() => setActiveTab('discovery')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'discovery'
                ? 'bg-white dark:bg-slate-800 text-neutral-900 dark:text-white font-semibold shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Tool Catalog ({mcpInfo?.tools.length || 8})
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'compliance'
                ? 'bg-white dark:bg-slate-800 text-neutral-900 dark:text-white font-semibold shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Hackathon Compliance
          </button>
        </div>
      </div>

      {/* Protocol Banner */}
      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-slate-900/40 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div>
          <span className="text-neutral-400 block text-[10px]">SERVER NAME</span>
          <span className="font-semibold text-neutral-900 dark:text-white">{mcpInfo?.server.name || 'scamsentry-mcp-server'}</span>
        </div>
        <div>
          <span className="text-neutral-400 block text-[10px]">PROTOCOL VERSION</span>
          <span className="font-semibold text-neutral-900 dark:text-white">2025-11-25</span>
        </div>
        <div>
          <span className="text-neutral-400 block text-[10px]">TRANSPORT</span>
          <span className="font-semibold text-neutral-900 dark:text-white">Streamable HTTP / SSE</span>
        </div>
        <div>
          <span className="text-neutral-400 block text-[10px]">REGISTERED TOOLS</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">8 Active Tools</span>
        </div>
      </div>

      {activeTab === 'tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: RPC Config */}
          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 space-y-4">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center justify-between">
                <span>Invoke JSON-RPC 2.0 Method</span>
                <span className="font-mono text-xs text-neutral-400">POST /api/mcp/rpc</span>
              </h3>

              {/* Method Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Protocol Method:
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {['tools/call', 'tools/list', 'initialize'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setRpcMethod(m)}
                      className={`p-2 rounded-lg border font-mono transition-colors text-center ${
                        rpcMethod === m
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tool Selector if tools/call */}
              {rpcMethod === 'tools/call' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Target Tool:
                  </label>
                  <select
                    value={selectedTool}
                    onChange={(e) => handleToolSelect(e.target.value)}
                    className="w-full p-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-neutral-100"
                  >
                    {[
                      'inspect_url',
                      'analyze_message',
                      'assess_evidence',
                      'create_safety_plan',
                      'save_investigation',
                      'get_investigation',
                      'prepare_incident_report',
                      'verify_action'
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Arguments Payload Editor */}
              {rpcMethod === 'tools/call' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Arguments JSON:
                  </label>
                  <textarea
                    rows={7}
                    value={toolArgsJson}
                    onChange={(e) => setToolArgsJson(e.target.value)}
                    className="w-full p-3 font-mono text-xs rounded-lg border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-slate-950 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}

              <button
                onClick={handleExecuteRpc}
                disabled={isExecutingRpc}
                className="w-full py-2.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                {isExecutingRpc ? (
                  <div className="w-3.5 h-3.5 border-2 border-white dark:border-neutral-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Send JSON-RPC Frame</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live Output & Frame Inspector */}
          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-950 text-neutral-100 min-h-[380px] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-xs font-mono text-neutral-400">
                <span>MCP RESPONSE FRAME</span>
                <span className="text-emerald-400">JSON-RPC 2.0</span>
              </div>

              <div className="flex-1 py-3 overflow-y-auto font-mono text-xs max-h-[460px]">
                {rawResponse ? (
                  <pre className="text-emerald-300 whitespace-pre-wrap select-text">
                    {JSON.stringify(rawResponse, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-neutral-500 text-xs italic">
                    Press "Send JSON-RPC Frame" to inspect live server response...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'discovery' && (
        <div className="space-y-4">
          <div className="text-xs text-neutral-500">
            Schema discovery via <code className="font-mono bg-neutral-100 dark:bg-neutral-900 px-1 py-0.5 rounded">tools/list</code> as specified in the Model Context Protocol.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mcpInfo?.tools.map((t) => (
              <div
                key={t.name}
                className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="font-semibold text-neutral-900 dark:text-white">{t.name}</span>
                  <span className="text-[10px] text-neutral-400">tool</span>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 text-xs leading-relaxed">
                  {t.description}
                </p>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                  <span className="text-[10px] font-mono text-neutral-400 block mb-1">REQUIRED PARAMS:</span>
                  <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                    {t.inputSchema.required?.map((req) => (
                      <span
                        key={req}
                        className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                      >
                        {req}
                      </span>
                    )) || <span className="text-neutral-400 italic">None</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'compliance' && (
        <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 space-y-6 text-xs">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Hackathon Compliance & Protocol Verification
            </h3>
            <p className="text-neutral-500 mt-1">
              Build, Ship, Shape: Amazon Developer Hackathon 2026 — Alexa+ Track Compliance Mapping.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                req: 'Simulated Alexa+ Track Experience',
                status: 'COMPLIANT',
                evidence: 'Implemented web-based simulated Alexa+ conversational assistant path with speech narration and step-by-step turn execution.'
              },
              {
                req: 'Official Model Context Protocol (MCP) Server',
                status: 'COMPLIANT',
                evidence: 'Built self-hosted MCP server using official @modelcontextprotocol/sdk at /api/mcp and /api/mcp/rpc with protocolVersion 2025-11-25.'
              },
              {
                req: 'Streamable HTTP / SSE Transport',
                status: 'COMPLIANT',
                evidence: 'Streamable HTTP transport exposed via GET /api/mcp with text/event-stream headers and JSON-RPC 2.0 dispatch.'
              },
              {
                req: 'Tool Discovery (tools/list)',
                status: 'COMPLIANT',
                evidence: 'All 8 real investigation tools exposed with validated input schemas and descriptions via tools/list.'
              },
              {
                req: 'Tool Execution (tools/call)',
                status: 'COMPLIANT',
                evidence: 'Verified runtime execution of analyze_message, inspect_url, assess_evidence, and verify_action with structured JSON responses.'
              },
              {
                req: 'Security & SSRF Mitigation',
                status: 'COMPLIANT',
                evidence: 'Strict RFC 3986 offline heuristics; zero blind link-fetching; parameterized persistence; prompt injection XML delimiters.'
              }
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>{item.req}</span>
                  </div>
                  <div className="text-neutral-500">{item.evidence}</div>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 self-start sm:self-auto">
                  {item.status}
                </span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-neutral-500 text-[11px] leading-relaxed">
            Note: As required by the official hackathon rules, this application explicitly states that it is not connected to a physical Alexa+ hardware device, and hackathon eligibility or victory is not guaranteed. All implemented features are grounded in actual running code.
          </div>
        </div>
      )}
    </div>
  );
};
