# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Each package has its own `node_modules` (no root-level workspace tooling is configured yet). Run `npm install` per package as needed.

**Start the stack** (run in order):
```sh
# 1. MCP server (stdio — spawned automatically by backend, or run standalone)
cd packages/mcp-repliers && node src/index.js

# 2. LangChain backend (port 4000)
cd packages/langchain-backend && node src/index.js

# 3. React frontend (Vite dev server)
cd apps/web && npx vite
```

**Build frontend:**
```sh
cd apps/web && npx vite build
```

## Architecture

This is a JavaScript monorepo (no TypeScript). Three separate services:

```
React (apps/web) → LangChain backend (packages/langchain-backend) → MCP server (packages/mcp-repliers) → Repliers REST API
```

### Key boundaries
- **`packages/mcp-repliers`** — MCP server using stdio transport. Owns `REPLIERS_API_KEY`. Registers MCP tools that wrap Repliers HTTP calls. Entry: `src/index.js` → registers tools → `StdioServerTransport`.
- **`packages/langchain-backend`** — Express server on port 4000. Owns `OPENAI_API_KEY`. Spawns the MCP server as a child process via `StdioClientTransport` (singleton in `src/mcpClient.js`). Runs the LLM tool-calling loop in `src/agent/agent.js` (max 3 steps, gpt-4o-mini by default via `OPENAI_MODEL`). Chat history is in-memory per session (last 6 human+assistant pairs; tool-call messages are never persisted).
- **`apps/web`** — Vite + React SPA. Calls backend at `/api/chat`. Renders `ListingCard` components from `properties` array in the response. Vite proxies `/api` to `http://localhost:4000`.

### MCP transport
The backend uses **stdio** (not HTTP) to talk to the MCP server — it spawns the MCP process directly. `MCP_SERVER_COMMAND` and `MCP_SERVER_ARGS` env vars control how it's launched; defaults to `node packages/mcp-repliers/src/index.js` (resolved relative to `mcpClient.js`).

### Chat API response shape
`POST /api/chat` returns:
```json
{
  "reply": "...",        // LLM text shown in chat
  "properties": [...],  // listings array (null if no tool was called)
  "toolCalls": [...]    // metadata about tool invocations
}
```

## Environment Variables

Copy `.env.example` and fill in values. Per-package `.env` files are loaded via `dotenv/config`.

| Variable | Used by | Purpose |
|---|---|---|
| `REPLIERS_API_KEY` | mcp-repliers | Repliers REST API auth header |
| `OPENAI_API_KEY` | langchain-backend | OpenAI LLM calls |
| `OPENAI_MODEL` | langchain-backend | Override model (default: `gpt-4o-mini`) |
| `MCP_SERVER_COMMAND` | langchain-backend | Command to launch MCP process (default: `node`) |
| `MCP_SERVER_ARGS` | langchain-backend | JSON array of args for MCP command |
| `VITE_API_URL` | apps/web | Backend URL (dev proxy default: `http://localhost:4000`) |

## Adding MCP Tools

1. Create `packages/mcp-repliers/src/tools/<toolName>.js` with a `register<ToolName>Tool(server)` export
2. Add the Repliers API call in `packages/mcp-repliers/src/repliers/client.js`
3. Register the tool in `packages/mcp-repliers/src/index.js`
4. Add the corresponding LangChain tool in `packages/langchain-backend/src/agent/agent.js` and wire it via `callTool` in `mcpClient.js`
