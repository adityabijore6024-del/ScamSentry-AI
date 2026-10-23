import dotenv from 'dotenv';
// Load environment variables before any other service imports
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { executeInvestigationAgent } from './server/services/agentOrchestrator.ts';
import { isGeminiConfigured, analyzeMessageWithGemini } from './server/services/geminiService.ts';
import { inspectUrl, InspectUrlInputSchema } from './server/tools/inspectUrl.ts';
import { assessEvidence, AssessEvidenceInputSchema } from './server/tools/assessEvidence.ts';
import { createSafetyPlan, CreateSafetyPlanInputSchema } from './server/tools/createSafetyPlan.ts';
import { saveInvestigation, SaveInvestigationInputSchema } from './server/tools/saveInvestigation.ts';
import { getInvestigation, GetInvestigationInputSchema } from './server/tools/getInvestigation.ts';
import { prepareIncidentReport, PrepareIncidentReportInputSchema } from './server/tools/prepareIncidentReport.ts';
import { verifyAction, VerifyActionInputSchema } from './server/tools/verifyAction.ts';
import { db } from './server/db/database.ts';
import { createScamSentryMcpServer, MCP_SERVER_INFO, MCP_TOOL_DEFINITIONS } from './server/mcp/mcpServer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security Middlewares & Headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// JSON Body Parser with strict 2MB limit
app.use(express.json({ limit: '2mb' }));

// --- In-Memory Sliding-Window Rate Limiter Middleware ---
interface RateLimitRecord {
  timestamps: number[];
}
const rateLimitStores = new Map<string, Map<string, RateLimitRecord>>();

function createRateLimiter(bucketName: string, windowMs: number, maxRequests: number) {
  if (!rateLimitStores.has(bucketName)) {
    rateLimitStores.set(bucketName, new Map());
  }
  const store = rateLimitStores.get(bucketName)!;

  // Periodic cleanup of stale entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of store.entries()) {
      rec.timestamps = rec.timestamps.filter(t => now - t < windowMs);
      if (rec.timestamps.length === 0) store.delete(ip);
    }
  }, 300000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown-client';
    const now = Date.now();

    let record = store.get(clientIp);
    if (!record) {
      record = { timestamps: [] };
      store.set(clientIp, record);
    }

    record.timestamps = record.timestamps.filter(t => now - t < windowMs);

    if (record.timestamps.length >= maxRequests) {
      const retryAfter = Math.ceil((record.timestamps[0] + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfter > 0 ? retryAfter : 1);
      return res.status(429).json({
        error: `Rate limit exceeded for ${bucketName}. Please wait before making more requests.`,
        code: 'TOO_MANY_REQUESTS'
      });
    }

    record.timestamps.push(now);
    next();
  };
}

const investigateRateLimiter = createRateLimiter('investigate', 60_000, 20); // 20 / min
const toolsRateLimiter = createRateLimiter('tools', 60_000, 60);             // 60 / min
const generalRateLimiter = createRateLimiter('general', 60_000, 120);        // 120 / min

// Master authorization secret. Never use a predictable fallback in production.
const configuredAuthToken = process.env.SCAMSENTRY_AUTH_TOKEN?.trim();
if (isProduction && !configuredAuthToken) {
  throw new Error('SCAMSENTRY_AUTH_TOKEN must be configured in production. Refusing to start with an insecure default credential.');
}

// Local development gets an unpredictable one-run passcode when no secret is configured.
// It is printed only to the local server terminal and is never exposed by an API endpoint.
export const SYSTEM_AUTH_TOKEN = configuredAuthToken || crypto.randomBytes(32).toString('hex');
if (!isProduction && !configuredAuthToken) {
  console.warn('[ScamSentry] No SCAMSENTRY_AUTH_TOKEN configured. Temporary local investigator passcode for this run: ' + SYSTEM_AUTH_TOKEN);
  console.warn('[ScamSentry] Set SCAMSENTRY_AUTH_TOKEN in .env for a stable local passcode.');
}

// In-memory active scoped investigator sessions
interface ActiveSession {
  createdAt: number;
  expiresAt: number;
}
export const activeSessions = new Map<string, ActiveSession>();

// Cleanup stale sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, sess] of activeSessions.entries()) {
    if (sess.expiresAt <= now) {
      activeSessions.delete(token);
    }
  }
}, 300000).unref();

export function isValidAuthToken(token?: string | null): boolean {
  if (!token) return false;
  const trimmed = token.trim();
  if (trimmed === SYSTEM_AUTH_TOKEN) return true;
  const session = activeSessions.get(trimmed);
  if (session) {
    if (session.expiresAt > Date.now()) {
      return true;
    }
    activeSessions.delete(trimmed);
  }
  return false;
}

export function extractAuthToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const customHeader = req.headers['x-scamsentry-auth'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }
  return null;
}

export function isValidAuth(req: Request): boolean {
  const token = extractAuthToken(req);
  return isValidAuthToken(token);
}

// --- Authorization Middleware for Private Cases & Audit Logs ---
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!isValidAuth(req)) {
    return res.status(401).json({
      error: 'Unauthorized: Valid investigator authentication token or active session required to access private investigation cases or audit records.',
      code: 'UNAUTHORIZED'
    });
  }
  next();
}

// --- Authentication & Session Endpoints ---
const LoginSchema = z.object({
  passcode: z.string().min(1, 'Passcode is required').max(200)
});

// Create an authenticated session using the configured investigator passcode or token
app.post('/api/auth/session', generalRateLimiter, (req: Request, res: Response) => {
  try {
    const { passcode } = LoginSchema.parse(req.body);
    const trimmed = passcode.trim();
    if (trimmed === SYSTEM_AUTH_TOKEN) {
      const sessionToken = 'sess_' + crypto.randomBytes(24).toString('hex');
      const ttlMs = 24 * 60 * 60 * 1000; // 24 hours
      activeSessions.set(sessionToken, {
        createdAt: Date.now(),
        expiresAt: Date.now() + ttlMs
      });
      return res.json({
        success: true,
        authenticated: true,
        sessionToken,
        expiresInMs: ttlMs
      });
    }

    return res.status(401).json({
      error: 'Invalid investigator passcode or token.',
      code: 'INVALID_CREDENTIALS'
    });
  } catch (err: any) {
    return res.status(400).json({
      error: err?.message || 'Invalid login request payload',
      code: 'VALIDATION_ERROR'
    });
  }
});

// Check current session authorization status
app.get('/api/auth/status', generalRateLimiter, (req: Request, res: Response) => {
  const authenticated = isValidAuth(req);
  res.json({ authenticated });
});

// Terminate active session
app.post('/api/auth/logout', generalRateLimiter, (req: Request, res: Response) => {
  const token = extractAuthToken(req);
  if (token && activeSessions.has(token)) {
    activeSessions.delete(token);
  }
  res.json({ success: true, authenticated: false });
});

// --- API Endpoints ---

// 1. Health & Readiness (Public, rate-limited)
app.get('/api/health', generalRateLimiter, (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    aiEngine: {
      provider: 'Gemini API',
      model: 'gemini-3.8-flash',
      configured: isGeminiConfigured(),
      fallbackAvailable: true,
      fallbackType: 'Deterministic Heuristic Forensic Engine'
    },
    mcp: {
      serverName: MCP_SERVER_INFO.name,
      protocolVersion: MCP_SERVER_INFO.protocolVersion,
      transport: 'Streamable HTTP / SSE (@modelcontextprotocol/sdk)',
      toolsCount: MCP_TOOL_DEFINITIONS.length
    },
    persistence: {
      type: 'Atomic Schema Store with Cryptographic Verification & Concurrency Locking',
      status: 'active'
    }
  });
});

// 2. Full Multi-step Investigation Agent Pipeline
const InvestigateInputSchema = z.object({
  messageText: z.string().min(1, 'messageText cannot be empty').max(10000, 'messageText exceeds 10,000 characters limit'),
  submittedUrl: z.string().max(2048).nullable().optional(),
  autoSave: z.boolean().optional()
});

app.post('/api/investigate', investigateRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = InvestigateInputSchema.parse(req.body);
    const authenticated = isValidAuth(req);
    // Unauthenticated public visitors run investigations in ephemeral memory only.
    // Auto-save to persistent database requires valid authentication so that anonymous users'
    // private messages are never leaked into the shared case store.
    const shouldSave = authenticated && validated.autoSave !== false;

    const plan = await executeInvestigationAgent({
      messageText: validated.messageText.trim(),
      submittedUrl: validated.submittedUrl ? validated.submittedUrl.trim() : null,
      autoSave: shouldSave
    });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// 3. Direct Tool Endpoints with Input Validation
const AnalyzeMessageBodySchema = z.object({
  messageText: z.string().min(1).max(10000)
});

app.post('/api/tools/analyze_message', toolsRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messageText } = AnalyzeMessageBodySchema.parse(req.body);
    const { result, usedGemini, fallbackReason } = await analyzeMessageWithGemini(messageText);
    res.json({ result, usedGemini, fallbackReason });
  } catch (err) {
    next(err);
  }
});

app.post('/api/tools/inspect_url', toolsRateLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url } = InspectUrlInputSchema.parse(req.body);
    const result = inspectUrl(url);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/api/tools/assess_evidence', toolsRateLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messageAnalysis, urlInspections } = AssessEvidenceInputSchema.parse(req.body);
    const result = assessEvidence(messageAnalysis, urlInspections || []);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/api/tools/create_safety_plan', toolsRateLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = CreateSafetyPlanInputSchema.parse(req.body);
    const result = createSafetyPlan(
      validated.riskLevel,
      Boolean(validated.hasCredentialsExposed),
      Boolean(validated.hasPaymentDemanded),
      validated.claimedOrganization
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/api/tools/save_investigation', toolsRateLimiter, requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = SaveInvestigationInputSchema.parse(req.body);
    const result = saveInvestigation(validated);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get('/api/tools/get_investigation/:id', toolsRateLimiter, requireAuth, (req: Request, res: Response) => {
  const result = getInvestigation({ caseId: req.params.id });
  if (!result.found) {
    return res.status(404).json(result);
  }
  res.json(result);
});

app.post('/api/tools/prepare_incident_report', toolsRateLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = PrepareIncidentReportInputSchema.parse(req.body);
    const result = prepareIncidentReport(
      validated.caseId || `CASE-${Date.now()}`,
      validated.messageText,
      validated.submittedUrl,
      validated.assessment,
      validated.safetyPlan,
      (req.body as any).claimedOrganization
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/api/tools/verify_action', toolsRateLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = VerifyActionInputSchema.parse(req.body);
    const result = verifyAction(validated);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 4. Protected Saved Cases & History Management
const ListCasesQuerySchema = z.object({
  search: z.string().max(200).optional(),
  riskLevel: z.enum(['ALL', 'LOW', 'ELEVATED', 'HIGH', 'CRITICAL']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional()
});

app.get('/api/cases', generalRateLimiter, requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = ListCasesQuerySchema.parse(req.query);
    const result = db.listCases(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get('/api/cases/:id', generalRateLimiter, requireAuth, (req: Request, res: Response) => {
  const id = req.params.id.trim();
  const item = db.getCase(id);
  if (!item) {
    return res.status(404).json({ error: 'Case not found', code: 'NOT_FOUND' });
  }
  res.json(item);
});

// Destructive: Delete Case (requires authentication + explicit confirmation header)
app.delete('/api/cases/:id', generalRateLimiter, requireAuth, (req: Request, res: Response) => {
  const confirmHeader = req.headers['x-confirm-destructive'];
  if (confirmHeader !== 'CONFIRM_DELETE') {
    return res.status(400).json({
      error: "Destructive operation requires explicit confirmation header 'x-confirm-destructive: CONFIRM_DELETE'",
      code: 'CONFIRMATION_REQUIRED'
    });
  }

  const id = req.params.id.trim();
  const success = db.deleteCase(id);
  if (!success) {
    return res.status(404).json({ error: 'Case not found or already deleted', code: 'NOT_FOUND' });
  }
  res.json({ success: true, deletedId: id });
});

// Destructive: Clear All Cases (requires authentication + explicit confirmation header)
app.delete('/api/cases', generalRateLimiter, requireAuth, (req: Request, res: Response) => {
  const confirmHeader = req.headers['x-confirm-destructive'];
  if (confirmHeader !== 'CONFIRM_DELETE') {
    return res.status(400).json({
      error: "Destructive operation requires explicit confirmation header 'x-confirm-destructive: CONFIRM_DELETE'",
      code: 'CONFIRMATION_REQUIRED'
    });
  }

  const count = db.clearAllCases();
  res.json({ success: true, deletedCount: count });
});

// Protected Audit Logs
app.get('/api/audit-logs', generalRateLimiter, requireAuth, (req: Request, res: Response) => {
  const caseId = req.query.caseId ? String(req.query.caseId).trim() : undefined;
  const logs = db.getAuditLogs(caseId);
  res.json(logs);
});

// 5. Official Model Context Protocol (MCP) Streamable HTTP Server Implementation
app.get('/api/mcp/info', generalRateLimiter, (req: Request, res: Response) => {
  res.json({
    server: MCP_SERVER_INFO,
    tools: MCP_TOOL_DEFINITIONS,
    protocolVersion: '2025-11-25',
    capabilities: {
      tools: {
        listChanged: false
      }
    }
  });
});

// Map of active Streamable HTTP transports keyed by MCP Session ID
const activeMcpTransports = new Map<string, StreamableHTTPServerTransport>();

// Streamable HTTP endpoint powered by official @modelcontextprotocol/sdk
app.all('/api/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  let transport: StreamableHTTPServerTransport;

  if (sessionId && activeMcpTransports.has(sessionId)) {
    transport = activeMcpTransports.get(sessionId)!;
  } else if (!sessionId && req.method === 'POST') {
    // New connection initializing a session
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });
    const mcpServer = createScamSentryMcpServer({
      authValidator: (token?: string) => {
        return isValidAuthToken(token) || isValidAuth(req);
      }
    });
    await mcpServer.connect(transport);

    // Track when transport receives session ID or closes
    transport.onclose = () => {
      if (transport.sessionId) {
        activeMcpTransports.delete(transport.sessionId);
      }
    };
  } else {
    return res.status(400).json({
      error: 'Invalid or missing Mcp-Session-Id header for active session request.',
      code: 'INVALID_SESSION'
    });
  }

  try {
    await transport.handleRequest(req, res, req.body);
    if (transport.sessionId && !activeMcpTransports.has(transport.sessionId)) {
      activeMcpTransports.set(transport.sessionId, transport);
    }
  } catch (err: any) {
    console.error('[MCP Streamable HTTP] Request handling error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Streamable HTTP transport error',
        code: 'MCP_TRANSPORT_ERROR'
      });
    }
  }
});

// MCP JSON-RPC 2.0 Web Inspector Testing Endpoint
app.post('/api/mcp/rpc', async (req: Request, res: Response) => {
  const rpc = req.body;
  if (!rpc || typeof rpc !== 'object' || rpc.jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: rpc?.id || null,
      error: { code: -32600, message: 'Invalid Request: Must be a valid JSON-RPC 2.0 object' }
    });
  }

  const { id, method, params } = rpc;

  try {
    switch (method) {
      case 'initialize': {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2025-11-25',
            capabilities: {
              tools: {}
            },
            serverInfo: MCP_SERVER_INFO
          }
        });
      }

      case 'notifications/initialized': {
        return res.status(204).end();
      }

      case 'ping': {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {}
        });
      }

      case 'tools/list': {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCP_TOOL_DEFINITIONS
          }
        });
      }

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        if (!toolName) {
          return res.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Missing tool name in params' }
          });
        }

        const isAuth = isValidAuth(req) || isValidAuthToken(toolArgs.authToken);

        if ((toolName === 'save_investigation' || toolName === 'get_investigation') && !isAuth) {
          return res.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: 'Unauthorized: Access to private case storage requires valid authentication credentials.',
                    tool: toolName,
                    code: 'UNAUTHORIZED'
                  }, null, 2)
                }
              ],
              isError: true
            }
          });
        }

        let toolResultText = '';
        let isError = false;

        try {
          if (toolName === 'analyze_message') {
            const { result } = await analyzeMessageWithGemini(toolArgs.messageText || '');
            toolResultText = JSON.stringify(result, null, 2);
          } else if (toolName === 'inspect_url') {
            const result = inspectUrl(toolArgs.url || '');
            toolResultText = JSON.stringify(result, null, 2);
          } else if (toolName === 'assess_evidence') {
            const result = assessEvidence(toolArgs.messageAnalysis, toolArgs.urlInspections || []);
            toolResultText = JSON.stringify(result, null, 2);
          } else if (toolName === 'create_safety_plan') {
            const result = createSafetyPlan(
              toolArgs.riskLevel || 'LOW',
              Boolean(toolArgs.hasCredentialsExposed),
              Boolean(toolArgs.hasPaymentDemanded),
              toolArgs.claimedOrganization
            );
            toolResultText = JSON.stringify(result, null, 2);
          } else if (toolName === 'save_investigation') {
            const result = saveInvestigation(toolArgs);
            toolResultText = JSON.stringify(result, null, 2);
          } else if (toolName === 'get_investigation') {
            const result = getInvestigation({ caseId: toolArgs.caseId });
            toolResultText = JSON.stringify(result, null, 2);
          } else if (toolName === 'prepare_incident_report') {
            const result = prepareIncidentReport(
              toolArgs.caseId || `CASE-${Date.now()}`,
              toolArgs.messageText,
              toolArgs.submittedUrl,
              toolArgs.assessment,
              toolArgs.safetyPlan,
              toolArgs.claimedOrganization
            );
            toolResultText = JSON.stringify(result, null, 2);
          } else if (toolName === 'verify_action') {
            const result = verifyAction(toolArgs);
            toolResultText = JSON.stringify(result, null, 2);
          } else {
            return res.json({
              jsonrpc: '2.0',
              id,
              error: { code: -32601, message: `Method or tool '${toolName}' not found.` }
            });
          }
        } catch (execErr: any) {
          isError = true;
          toolResultText = JSON.stringify({ error: execErr?.message || String(execErr) });
        }

        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: toolResultText
              }
            ],
            isError
          }
        });
      }

      default:
        return res.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method '${method}' is not implemented.` }
        });
    }
  } catch (err: any) {
    return res.status(500).json({
      jsonrpc: '2.0',
      id: id || null,
      error: { code: -32603, message: 'Internal JSON-RPC error' }
    });
  }
});

// Centralized Safe Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Input validation failed',
      code: 'VALIDATION_ERROR',
      issues: err.issues.map((e: any) => ({ path: e.path.join('.'), message: e.message }))
    });
  }

  console.error('[Unhandled Server Error]', err);
  res.status(500).json({
    error: 'An internal server error occurred while processing the request.',
    code: 'INTERNAL_SERVER_ERROR'
  });
});

// 404 Catch-All Handler for API Routes
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    error: `API route '${req.method} ${req.path}' not found.`,
    code: 'NOT_FOUND'
  });
});

// --- Static or Vite Middleware Mounting ---
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ScamSentry AI] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[ScamSentry AI] MCP Streamable HTTP endpoint active at /api/mcp`);
  });
}

// Only start the server when executed directly, not when imported by test suites
const isDirectExecution = process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js');
if (isDirectExecution) {
  startServer().catch((err) => {
    console.error('[ScamSentry AI] Server startup fatal error:', err);
    process.exit(1);
  });
}

export { app, startServer };
