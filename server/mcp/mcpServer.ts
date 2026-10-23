import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import { analyzeMessageHeuristic, AnalyzeMessageInputSchema } from '../tools/analyzeMessage.ts';
import { inspectUrl, InspectUrlInputSchema } from '../tools/inspectUrl.ts';
import { assessEvidence, AssessEvidenceInputSchema } from '../tools/assessEvidence.ts';
import { createSafetyPlan, CreateSafetyPlanInputSchema } from '../tools/createSafetyPlan.ts';
import { saveInvestigation, SaveInvestigationInputSchema } from '../tools/saveInvestigation.ts';
import { getInvestigation, GetInvestigationInputSchema } from '../tools/getInvestigation.ts';
import { prepareIncidentReport, PrepareIncidentReportInputSchema } from '../tools/prepareIncidentReport.ts';
import { verifyAction, VerifyActionInputSchema } from '../tools/verifyAction.ts';
import { analyzeMessageWithGemini } from '../services/geminiService.ts';

export const MCP_SERVER_INFO = {
  name: 'scamsentry-mcp-server',
  version: '1.0.0',
  protocolVersion: '2025-11-25',
};

// Tool specifications exposed via tools/list
export const MCP_TOOL_DEFINITIONS = [
  {
    name: 'analyze_message',
    description: 'Forensically extracts observable facts from suspicious message text: claimed entities, payment demands, credential/OTP requests, urgency cues, and impersonation indicators.',
    inputSchema: {
      type: 'object',
      properties: {
        messageText: {
          type: 'string',
          description: 'The untrusted message text to analyze (max 10,000 characters).'
        }
      },
      required: ['messageText']
    }
  },
  {
    name: 'inspect_url',
    description: 'Performs static syntactic and heuristic lookalike analysis on a URL without fetching it over network (strict SSRF prevention). Evaluates loopback, private ranges, and deceptive subdomains.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to statically inspect.'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'assess_evidence',
    description: 'Synthesizes observable facts and URL findings into an evidence-grounded risk assessment with explicit uncertainty metrics and limitation notices.',
    inputSchema: {
      type: 'object',
      properties: {
        messageAnalysis: {
          type: 'object',
          description: 'The output payload from analyze_message.'
        },
        urlInspections: {
          type: 'array',
          description: 'Array of inspect_url results.',
          items: { type: 'object' }
        }
      },
      required: ['messageAnalysis']
    }
  },
  {
    name: 'create_safety_plan',
    description: 'Generates defensive, actionable guidance (immediate prohibitions, independent verification steps, and official reporting portals) tailored to assessed risk.',
    inputSchema: {
      type: 'object',
      properties: {
        riskLevel: {
          type: 'string',
          enum: ['LOW', 'ELEVATED', 'HIGH', 'CRITICAL'],
          description: 'The assessed risk category.'
        },
        hasCredentialsExposed: {
          type: 'boolean',
          description: 'Whether login credentials or OTPs were requested or compromised.'
        },
        hasPaymentDemanded: {
          type: 'boolean',
          description: 'Whether fraudulent payments, gift cards, or wire transfers were demanded.'
        },
        claimedOrganization: {
          type: 'string',
          description: 'Organization name to verify independently.'
        }
      },
      required: ['riskLevel']
    }
  },
  {
    name: 'save_investigation',
    description: 'Persists an investigation case and associated evidence to the server database and returns a cryptographic verification hash. (Requires authorization token or active session).',
    inputSchema: {
      type: 'object',
      properties: {
        authToken: { type: 'string', description: 'Investigator authorization token for authenticated persistence.' },
        messageText: { type: 'string' },
        submittedUrl: { type: 'string' },
        claimedOrganization: { type: 'string' },
        riskLevel: { type: 'string', enum: ['LOW', 'ELEVATED', 'HIGH', 'CRITICAL'] },
        riskScore: { type: 'number', minimum: 0, maximum: 100 },
        evidenceStrength: { type: 'string' },
        assessment: { type: 'object' },
        safetyPlan: { type: 'object' },
        toolsExecuted: { type: 'array', items: { type: 'string' } }
      },
      required: ['messageText', 'riskLevel', 'riskScore', 'assessment', 'safetyPlan']
    }
  },
  {
    name: 'get_investigation',
    description: 'Retrieves a previously persisted investigation record from database storage by case ID. (Requires authorization token or active session).',
    inputSchema: {
      type: 'object',
      properties: {
        authToken: { type: 'string', description: 'Investigator authorization token for authenticated case access.' },
        caseId: {
          type: 'string',
          description: 'The case ID (e.g. CASE-...) to retrieve.'
        }
      },
      required: ['caseId']
    }
  },
  {
    name: 'prepare_incident_report',
    description: 'Compiles a complete sanitized forensic incident report in Markdown, HTML, and JSON with all untrusted content safely escaped.',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: { type: 'string' },
        messageText: { type: 'string' },
        submittedUrl: { type: 'string' },
        assessment: { type: 'object' },
        safetyPlan: { type: 'object' },
        claimedOrganization: { type: 'string' }
      },
      required: ['caseId', 'messageText', 'assessment', 'safetyPlan']
    }
  },
  {
    name: 'verify_action',
    description: 'Reads back persisted records or system states to cryptographically and structurally verify that a consequential action succeeded.',
    inputSchema: {
      type: 'object',
      properties: {
        actionType: {
          type: 'string',
          enum: ['PERSISTENCE_VERIFICATION', 'DELETION_VERIFICATION', 'REPORT_GENERATION_VERIFICATION'],
          description: 'Type of verification to execute.'
        },
        targetId: {
          type: 'string',
          description: 'The record or report ID to verify.'
        },
        expectedHash: {
          type: 'string',
          description: 'Optional expected SHA-256 hash for integrity comparison.'
        }
      },
      required: ['actionType', 'targetId']
    }
  }
];

export interface McpServerOptions {
  authValidator?: (authToken?: string) => boolean;
}

export function createScamSentryMcpServer(options?: McpServerOptions): Server {
  const server = new Server(
    MCP_SERVER_INFO,
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tools/list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: MCP_TOOL_DEFINITIONS,
    };
  });

  // Register tools/call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: rawArgs } = request.params;
    const args = rawArgs || {};

    try {
      switch (name) {
        case 'analyze_message': {
          const validated = AnalyzeMessageInputSchema.parse(args);
          const { result } = await analyzeMessageWithGemini(validated.messageText);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'inspect_url': {
          const validated = InspectUrlInputSchema.parse(args);
          const result = inspectUrl(validated.url);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'assess_evidence': {
          const validated = AssessEvidenceInputSchema.parse(args);
          const result = assessEvidence(validated.messageAnalysis, validated.urlInspections);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'create_safety_plan': {
          const validated = CreateSafetyPlanInputSchema.parse(args);
          const result = createSafetyPlan(
            validated.riskLevel,
            validated.hasCredentialsExposed,
            validated.hasPaymentDemanded,
            validated.claimedOrganization
          );
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'save_investigation': {
          const validated = SaveInvestigationInputSchema.parse(args);
          const isAuthorized = options?.authValidator
            ? options.authValidator(validated.authToken)
            : Boolean(validated.authToken);

          if (!isAuthorized) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: 'Unauthorized: Access to private case storage requires valid authentication credentials.',
                    tool: 'save_investigation',
                    code: 'UNAUTHORIZED'
                  }, null, 2)
                }
              ]
            };
          }

          const result = saveInvestigation(validated);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'get_investigation': {
          const validated = GetInvestigationInputSchema.parse(args);
          const isAuthorized = options?.authValidator
            ? options.authValidator(validated.authToken)
            : Boolean(validated.authToken);

          if (!isAuthorized) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: 'Unauthorized: Access to private case storage requires valid authentication credentials.',
                    tool: 'get_investigation',
                    code: 'UNAUTHORIZED'
                  }, null, 2)
                }
              ]
            };
          }

          const result = getInvestigation(validated);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'prepare_incident_report': {
          const validated = PrepareIncidentReportInputSchema.parse(args);
          const result = prepareIncidentReport(
            validated.caseId,
            validated.messageText,
            validated.submittedUrl,
            validated.assessment,
            validated.safetyPlan,
            (args as any).claimedOrganization
          );
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'verify_action': {
          const validated = VerifyActionInputSchema.parse(args);
          const result = verifyAction(validated);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Tool '${name}' is not recognized by ScamSentry MCP Server.`
          );
      }
    } catch (err: any) {
      if (err instanceof McpError) {
        throw err;
      }
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: err?.message || 'Tool execution failure',
              tool: name,
              details: err?.errors || err?.stack || String(err)
            }, null, 2),
          },
        ],
      };
    }
  });

  return server;
}
