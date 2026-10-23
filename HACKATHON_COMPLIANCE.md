# Hackathon Compliance Checklist & Evaluation Matrix
**Build, Ship, Shape: Amazon Developer Hackathon 2026**  
**Primary Track:** Alexa+ Track

---

## 1. Compliance Mapping Table

| Requirement from Rules | Implementation in ScamSentry AI | Verification Evidence / File Path | Status |
| :--- | :--- | :--- | :--- |
| **Simulated Alexa+ Track Experience** | Web-based simulated Alexa+ agent with conversational audio narration, turn-based tool guidance, and confirmation gates before consequential actions. | `src/components/AlexaSimulatedAgent.tsx`, `src/components/InvestigationWorkspace.tsx` | **VERIFIED & COMPLIANT** |
| **Official Model Context Protocol (MCP) Server** | Built with official `@modelcontextprotocol/sdk` TypeScript package (`StreamableHTTPServerTransport`) running on Node.js/Express. | `server/mcp/mcpServer.ts`, `server.ts` | **VERIFIED & COMPLIANT** |
| **Protocol Version 2025-11-25** | MCP handshake and responses adhere to protocol specification `2025-11-25`. | `server/mcp/mcpServer.ts`, `test/mcp.test.ts` | **VERIFIED & COMPLIANT** |
| **Streamable HTTP / SSE Transport** | Live endpoint exposed at `/api/mcp` using `StreamableHTTPServerTransport` with session state management and `/api/mcp/rpc` for JSON-RPC 2.0. | `server.ts`, tested via official `Client` in `test/mcp.test.ts` | **VERIFIED & COMPLIANT** |
| **Tool Discovery (`tools/list`)** | Discovers all 8 forensic investigation tools with complete JSON Schemas and descriptions. | `server/mcp/mcpServer.ts`, tested in `test/mcp.test.ts` | **VERIFIED & COMPLIANT** |
| **Tool Execution (`tools/call`)** | Verified runtime execution of tools with validated schemas, structured JSON returns, and error handling. | `test/mcp.test.ts` (6 passing integration tests) | **VERIFIED & COMPLIANT** |
| **Evidence-Driven Pipeline** | Investigate → Gather Evidence → Assess Risk → Explain → Recommend → Confirm → Execute → Verify. | `server/services/agentOrchestrator.ts`, `src/components/InvestigationResults.tsx` | **VERIFIED & COMPLIANT** |
| **Zero SSRF & Safe Defaults** | Submitted URLs are parsed strictly using offline lexical heuristics; loopback, private ranges, metadata IPs, and dangerous schemes are blocked without network fetches. | `server/tools/inspectUrl.ts`, `test/security.test.ts` | **VERIFIED & COMPLIANT** |
| **Cryptographic Read-Back Verification** | SHA-256 integrity hash generated upon case persistence and read back to confirm storage. | `server/tools/verifyAction.ts`, `server/db/database.ts` | **VERIFIED & COMPLIANT** |
| **Authorization & Endpoint Protection** | Private cases and audit logs require Bearer token authorization; destructive deletion requires `x-confirm-destructive: CONFIRM_DELETE`; sliding-window rate limiting. | `server.ts`, `test/api.test.ts` | **VERIFIED & COMPLIANT** |
| **Automated Test Suite** | 31 unit, security, API authorization, database concurrency, and MCP integration tests passing with 0 failures. | `test/*.test.ts` (5 suites) | **VERIFIED & COMPLIANT** |

---

## 2. Permitted Simulated Alexa+ Experience Path Notes

- The simulated Alexa+ agent experience is integrated into the web client with an audio synthesizer toggle, visual agent avatar, turn-by-turn status updates, and explicit user confirmation dialogs.
- This submission explicitly clarifies that it does not claim to connect to a physical Alexa+ consumer hardware device.
- It does not guarantee hackathon victory or eligibility.

---

## 3. Product Feedback Notes for Developer Tools

1. **`@modelcontextprotocol/sdk`**:
   - `StreamableHTTPServerTransport` and `Client` provide a clean abstraction for the 2025-11-25 protocol version.
   - Mounting `StreamableHTTPServerTransport` with session state mapping (`activeMcpTransports.set(sessionId, transport)`) ensures robust handling of both POST message submissions and SSE streams in Express.
2. **`@google/genai` SDK**:
   - Modern `GoogleGenAI` initialization must be evaluated lazily so runtime environment variables or secret managers (such as Cloud Run secrets) are loaded before the API client is instantiated.
   - Enclosing user inputs in strict XML boundaries (`<untrusted_user_message>`) is essential to prevent prompt injection attempts from overriding forensic instructions.
