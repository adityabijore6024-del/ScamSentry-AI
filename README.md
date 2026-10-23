# ScamSentry AI

Evidence-led scam investigation application for suspicious recruitment messages, payment requests, and URLs. This package includes a React/Vite frontend, an Express backend, a Gemini integration with a clearly-labelled heuristic fallback, offline URL inspection, JSON-backed case persistence, and an MCP Streamable HTTP server using the official MCP SDK.

## Requirements

- Node.js 22+ recommended
- npm 10+ recommended
- A Gemini API key is optional for local heuristic-only operation. Configure it in `.env` if available.

## Local setup (Windows PowerShell or macOS/Linux)

```bash
npm install
```

Copy `.env.example` to `.env`. Set a strong, private `SCAMSENTRY_AUTH_TOKEN`. Do not commit `.env` or share the token. If `GEMINI_API_KEY` is omitted, the app should use its explicitly labelled heuristic fallback.

Start the development app:

```bash
npm run dev
```

Open `http://localhost:3000`. Keep the terminal running. The server prints a temporary random investigator passcode only in local development if `SCAMSENTRY_AUTH_TOKEN` was not configured. Use it for local login; do not publish it.

## Verification

```bash
npm run lint
npm test
npm run build
```

`npm test` starts a local test server automatically on port 3000, runs the API, database, MCP, and security test suites, then stops the server. Ensure port 3000 is free before running it. The test runner expands test paths using Node (rather than a shell wildcard), including on Windows paths containing spaces. Test output is authoritative: do not claim tests passed unless the command completes with exit code 0.

## Production

Set `NODE_ENV=production`, `SCAMSENTRY_AUTH_TOKEN` to a strong secret, and optionally `GEMINI_API_KEY` in your hosting provider's secret manager. Run:

```bash
npm run build
npm start
```

Production startup intentionally fails if `SCAMSENTRY_AUTH_TOKEN` is missing. Never use a default or hardcoded production credential. Ensure your host has persistent storage if saved case records must survive restarts; the current JSON-backed store is not a substitute for a managed database on ephemeral or multi-instance hosts.

## MCP

The Streamable HTTP MCP endpoint is `/api/mcp`. The app also exposes a JSON-RPC inspector bridge at `/api/mcp/rpc`; check the implementation and compliance notes before connecting an external client. The web-based Alexa+ experience is a simulation, not a physical Alexa+ device connection.

## Security and limitations

- Submitted URLs are inspected offline; the app does not fetch user-provided URLs. Consequently, it does not provide live DNS, redirect, or domain-reputation results.
- Heuristic analysis can be wrong. A low score is not proof that a message or URL is safe.
- The JSON file store has local persistence limitations. Use a managed persistent database and appropriate deployment controls for a multi-user production service.
- Rate limiting is in-memory and is not a substitute for a shared limiter behind a multi-instance deployment.
- Review `HACKATHON_COMPLIANCE.md` and `SECURITY-FIX-NOTES.txt`; verify all external requirements and test the deployed instance before submission.
