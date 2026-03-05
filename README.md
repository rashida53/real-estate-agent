# Real Estate Agent

An agent-driven full-stack application for searching, exploring, and estimating real estate listings. A React chat UI connects to a LangChain/OpenAI backend that orchestrates tools via an MCP server wrapping the [Repliers](https://repliers.io) REST API.

## Architecture

```
React (apps/web)
  → POST /api/chat
  → Express + LangChain (packages/langchain-backend)
  → stdio transport
  → MCP Server (packages/mcp-repliers)
  → Repliers REST API
```

| Layer | Package | Role |
|---|---|---|
| **Frontend** | `apps/web` | Vite + React SPA with chat interface, listing cards, and tool-call badges |
| **Backend** | `packages/langchain-backend` | Express server (port 4000). Runs an OpenAI tool-calling agent (gpt-4o-mini) with in-memory session history |
| **MCP Server** | `packages/mcp-repliers` | MCP server over stdio. Wraps Repliers HTTP endpoints as tools with structured input/output |

The backend spawns the MCP server as a child process using `StdioClientTransport` — no HTTP between them.

## MCP Tools

| Tool | Description | Key Inputs |
|---|---|---|
| `search_properties` | Search listings by location, price, beds, baths, sqft, type, and more | `city` (required), `beds`, `maxPrice`, `minPrice`, `type`, `propertyType`, `sortBy`, … |
| `get_listing_details` | Fetch full details for a single listing | `mlsNumber` |
| `get_property_estimate` | AI-powered property value estimate with comparables | `streetNumber`, `streetName`, `city`, `zip`, `numBedrooms`, `numBathrooms`, … |

## Project Structure

```
real-estate-agent/
├── apps/
│   └── web/                          # React frontend (Vite)
│       ├── src/
│       │   ├── App.jsx
│       │   ├── main.jsx
│       │   ├── styles.css
│       │   └── components/
│       │       ├── Chat.jsx           # Chat state, session management, API calls
│       │       ├── InputBar.jsx       # Message input + send button
│       │       ├── MessageList.jsx    # Message bubbles, markdown, typing indicator
│       │       ├── ListingCard.jsx    # Property card with image, price, meta
│       │       └── ToolCallBadge.jsx  # Expandable badge showing tool name + args
│       └── vite.config.js
│
├── packages/
│   ├── langchain-backend/            # Express + LangChain backend
│   │   └── src/
│   │       ├── index.js              # Express app, health check
│   │       ├── mcpClient.js          # Singleton MCP client, stdio transport
│   │       ├── agent/
│   │       │   └── agent.js          # Tool-calling loop (max 3 steps), session history
│   │       └── routes/
│   │           └── chat.js           # POST /api/chat route
│   │
│   └── mcp-repliers/                 # MCP server (stdio)
│       └── src/
│           ├── index.js              # Server bootstrap, tool registration
│           ├── tools/
│           │   ├── searchProperties.js
│           │   ├── getListingDetails.js
│           │   └── getPropertyEstimate.js
│           └── repliers/
│               ├── client.js         # HTTP client for Repliers API
│               ├── normalize.js      # Raw listing → UI-friendly shape
│               └── errors.js         # Structured MCP error handling
│
├── .env.example
├── CLAUDE.md
└── plan.md
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- A [Repliers](https://repliers.io) API key
- An [OpenAI](https://platform.openai.com) API key

### 1. Install dependencies

Each package manages its own `node_modules` — no root-level workspace tooling:

```sh
cd packages/mcp-repliers && npm install
cd packages/langchain-backend && npm install
cd apps/web && npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your keys:

```sh
cp .env.example .env
```

Then copy or symlink `.env` into each package that needs it, or create per-package `.env` files:

| Variable | Used by | Purpose |
|---|---|---|
| `REPLIERS_API_KEY` | mcp-repliers | Auth header for Repliers REST API |
| `OPENAI_API_KEY` | langchain-backend | OpenAI LLM calls via `@langchain/openai` |
| `OPENAI_MODEL` | langchain-backend | Override model (default: `gpt-4o-mini`) |
| `MCP_SERVER_COMMAND` | langchain-backend | Command to launch MCP process (default: `node`) |
| `MCP_SERVER_ARGS` | langchain-backend | JSON array of args for the MCP command |
| `VITE_API_URL` | apps/web | Backend URL for Vite dev proxy (default: `http://localhost:4000`) |

### 3. Start the stack

Run each service in a separate terminal, in order:

```sh
# 1. MCP server (stdio — also spawned automatically by backend)
cd packages/mcp-repliers && node src/index.js

# 2. LangChain backend (port 4000)
cd packages/langchain-backend && node src/index.js

# 3. React frontend (Vite dev server, port 5173)
cd apps/web && npx vite
```

Open [http://localhost:5173](http://localhost:5173) in your browser and start chatting.

### Build for production

```sh
cd apps/web && npx vite build
```

## Chat API

### `POST /api/chat`

**Request:**

```json
{
  "message": "Show me 3-bedroom condos in Toronto under $800k",
  "sessionId": "optional-existing-session-id"
}
```

**Response:**

```json
{
  "sessionId": "uuid",
  "reply": "I found several condos matching your criteria...",
  "properties": [
    {
      "mlsNumber": "...",
      "address": "...",
      "price": 750000,
      "beds": 3,
      "baths": 2,
      "sqft": 1200,
      "type": "Sale",
      "propertyType": "Condo",
      "daysOnMarket": 14,
      "imageUrl": "...",
      "listingUrl": "..."
    }
  ],
  "toolCalls": [
    { "name": "search_properties", "args": { "city": "Toronto", "beds": 3, "maxPrice": 800000, "class": "condo" }, "resultCount": 10 }
  ]
}
```

`properties` is `null` when no search tool was called. `toolCalls` contains metadata about every tool invocation in that turn.

## Key Design Decisions

- **Stdio MCP transport** — The backend spawns the MCP server as a child process (no HTTP between them), keeping the boundary clean while avoiding network overhead.
- **3-step tool-calling loop** — The agent can chain up to 3 tool calls per turn, allowing multi-step workflows (e.g., search then get details).
- **Session history** — In-memory, capped at the last 6 human+assistant pairs. Tool-call messages are excluded from history to keep context concise, but tool-call metadata is injected so follow-up questions can reference MLS numbers.
- **Normalized listings** — Raw Repliers responses are normalized into a consistent shape before reaching the frontend, handling field name inconsistencies and CDN image URL prefixing.

## Adding a New MCP Tool

1. Create `packages/mcp-repliers/src/tools/<toolName>.js` with a `register<ToolName>Tool(server)` export
2. Add the Repliers API call in `packages/mcp-repliers/src/repliers/client.js`
3. Register the tool in `packages/mcp-repliers/src/index.js`
4. Add the corresponding LangChain tool in `packages/langchain-backend/src/agent/agent.js` and wire it via `callTool` in `mcpClient.js`

## Deployment

The three services map cleanly to separate deployment units. All secrets are injected via environment variables — no keys are hardcoded or committed.

### Services

| Service | Deployment unit | Notes |
|---|---|---|
| **MCP Server** | Docker container | Stateless; scale horizontally behind a load balancer. Switch from stdio to [Streamable HTTP transport](https://modelcontextprotocol.io/docs/concepts/transports) for production so multiple backend instances can share one MCP pool. |
| **LangChain Backend** | Docker container | Stateless per request; scale horizontally. Set `MCP_SERVER_COMMAND`/`MCP_SERVER_ARGS` to point at the MCP service URL instead of a local process. |
| **React Frontend** | Static assets + CDN | Run `npx vite build` → deploy `apps/web/dist/` to any CDN (Cloudflare Pages, S3 + CloudFront, Vercel). Set `VITE_API_URL` to the backend's public URL at build time. |

### Example Docker workflow

```sh
# MCP server
docker build -t real-estate-mcp ./packages/mcp-repliers
docker run -e REPLIERS_API_KEY=... real-estate-mcp

# LangChain backend
docker build -t real-estate-backend ./packages/langchain-backend
docker run -e OPENAI_API_KEY=... -e MCP_SERVER_ARGS='["..."]' -p 4000:4000 real-estate-backend
```

For orchestration, each container maps to a Kubernetes `Deployment` + `Service`. MCP and backend run in the same internal VPC (no public exposure for MCP); only the backend and frontend are publicly reachable.

### Secrets management

In production, inject secrets via your platform's secret manager (AWS Secrets Manager, GCP Secret Manager, Doppler, etc.) rather than plain env files. The key boundary remains the same:

- `REPLIERS_API_KEY` — MCP container only
- `OPENAI_API_KEY` — backend container only
- Frontend holds no secrets

See [`plan.md`](./plan.md) sections 6 and 7 for the full scalability and security discussion.

## License

Private / Unlicense (TBD)
