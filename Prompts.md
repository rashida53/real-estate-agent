# Prompts Used to Build This Application

A chronological record of every major prompt used to build this agent-driven real estate application with Cursor AI.

---

## Phase 1: Architecture & Planning

### 1. System Architecture

```
I am building an agent driven full stack application using

- Repliers REST API (real estate listings)
- MCP Server as a wrapper microservice
- LangChain backend with OpenAI tool-calling
- React frontend chat UI
- Node.js monorepo architecture

Project Goal:
The LLM agent must interpret user natural language queries (e.g., "Show me 3-bedroom homes in Austin under 600k") and decide when to call an MCP tool that wraps the Repliers API.

Generate:

1. Full system architecture
2. Data flow explanation
4. Clear separation of responsibilities between:
   - MCP Server
   - LangChain Backend
   - Frontend
5. Monorepo folder structure
6. Development workflow
7. Production scalability considerations
8. Security considerations (API key isolation)
```

### 2. Technology Stack Update

```
Update the plan to use Javascript instead of Typescript and React.js instead of Next.js
```

### 3. Save Plan to Repository

```
Add plan.md file in this folder
```

---

## Phase 2: Repository Setup

### 4. Git Initialization

```
1. Initialize a Git repository
2. Create a .gitignore file for a Node.js monorepo that includes:
   - node_modules
   - .env files
   - build folders
   - logs
   - OS-specific files
3. Create an initial README.md placeholder
4. Make the first clean commit with proper commit message
5. Connect to a new GitHub repository
6. Push the initial commit
7. Use best-practice branch naming (main branch)
```

---

## Phase 3: MCP Server (Repliers API Wrapper)

### 5. Design MCP Abstraction Layer

```
Design a clean abstraction layer for wrapping the Repliers API inside an MCP server.

Requirements:

- Tool name: search_properties
- Inputs:
    - city (string, required)
    - beds (number, optional)
    - maxPrice (number, optional)
- Normalize raw Repliers response into simplified structured format:
    - address
    - price
    - beds
    - baths
    - sqft
    - listingUrl

Include:

- Error handling strategy
- Rate limiting considerations
- Response normalization strategy

Don't include LLM logic here.
```

### 6. Implement MCP Server

```
Repliers API Abstraction Layer (MCP Server)
Implement the plan as specified, it is attached for your reference.
Do NOT edit the plan file itself.
To-do's from the plan have already been created. Do not create them again.
Mark them as in_progress as you work, starting with the first one.
Don't stop until you have completed all the to-dos.
```

---

## Phase 4: LangChain Backend

### 7. Build LangChain Agent

```
Next I want to build the backend LangChain agent

Build an Express backend that:

- Uses LangChain
- Uses OpenAI model with tool-calling
- Wraps MCP tools as LangChain tools
- Connects to MCP server using StdioClientTransport
- LLM decides when to call searchProperties tool
- Maintains short chat memory
- Exposes POST /api/chat
- Returns final LLM response

This must demonstrate real agent behavior (LLM choosing tools).
```

---

## Phase 5: Frontend Chat UI

### 8. Build React Chat Interface

```
Yes, let's build the React Chat UI next

Build a clean React chat interface that:

- Displays conversation history
- Shows user messages
- Has input field
- Calls POST /api/chat
- Shows loading indicator
- Displays structured property results nicely
- Modern clean UI
```

---

## Phase 6: Environment Configuration

### 9. Add dotenv Setup

```
Can we add environment configuration:

For MCP server:
- REPLIERS_API_KEY

For backend:
- OPENAI_API_KEY
- MCP_SERVER_COMMAND config

Add:
- dotenv setup
- .env.example files
```

---

## Phase 7: Debugging & Error Fixes

### 10. Fix npm Package Not Found

> Shared terminal output showing `npm ERR! 404 Not Found - @modelcontextprotocol/client`

*Resolution: Replaced `@modelcontextprotocol/client` with `@modelcontextprotocol/sdk`*

### 11. Fix ReadableStream Not Defined

> Shared terminal output showing `ReferenceError: ReadableStream is not defined`

*Resolution: Added ReadableStream polyfill and upgraded Node.js*

### 12. Fix Vite Version Incompatibility

> Shared terminal output showing `Vite requires Node.js version 20.19+`

*Resolution: Upgraded Node.js to v20+*

### 13. Fix Backend Connection Refused

> Shared terminal output showing `AggregateError [ECONNREFUSED]` on `/api/chat`

*Resolution: Ensured backend server was running before frontend proxy could connect*

### 14. Fix Missing OpenAI API Key

> Shared terminal output showing `OpenAIError: Missing credentials`

*Resolution: Added `.env` file with `OPENAI_API_KEY` to backend package directory*

### 15. Fix MCP Connection Closed

> Shared terminal output showing `McpError: MCP error -32000: Connection closed`

*Resolution: Fixed MCP server path resolution — used absolute paths instead of relative*

### 16. Environment File Placement

```
I currently have .env at the root level and in packages folder. Should I add it inside the packages/mcp-repliers/ folder?
```

### 17. Fix Module Not Found for MCP Server

> Shared terminal output showing `Cannot find module '.../packages/langchain-backend/packages/mcp-repliers/src/index.js'`

```
Can you make the changes for option B
```

*Resolution: Used absolute path computation in mcpClient.js with `import.meta.url`*

---

## Phase 8: UI Improvements & Bug Fixes

### 18. Fix UI Display Issues

```
Issues with UI

- Pasting raw response in input window
- All houses currently displaying 0bd 0ba

Potentially need more tools to do multi step conversations, get yes/no replies from chatbox, differentiate between houses on rent vs sale
Currently we have only implemented packages/mcp-repliers/src/tools/searchProperties.js
```

### 19. Fix Markdown Rendering

```
Markdown is not getting correctly formatted in agents response, and still getting 0bd 0ba
```

### 20. Fix react-markdown Breaking Change

```
Uncaught Assertion: Unexpected `linkTarget` prop, remove it
```

*Resolution: Updated to use `components` API instead of deprecated `linkTarget` prop in react-markdown v9+*

### 21. Fix OpenAI Tool Calls History Error

> Shared terminal output showing `An assistant message with 'tool_calls' must be followed by tool messages responding to each 'tool_call_id'`

```
Don't trim any tool messages, print the tool messages on the UI
```

*Resolution: Rewrote history management to only persist clean (Human, Assistant) pairs; added ToolCallBadge UI component*

---

## Phase 9: New MCP Tools & Enhanced Search

### 22. Plan New MCP Tools

```
Lets add some more MCP tools

Read the Repliers API docs and suggest new tools
https://repliers.com/property-search-filtering#property-search-filtering-advanced-listing-filter
```

*Result: Planned 3 new tools (get_listing_details, get_property_estimate, get_nearby_places) and enhanced search_properties with additional filters*

### 23. Implement New Tools

> Attached the plan and instructed implementation of all new MCP tools

### 24. Refine Tool Behavior

```
I got the answer for "tell me more about the 3rd one" but it shouldn't print all listing cards after that
```

```
It says the houses are rental properties and has the lease amount on listing card, but Sale button is highlighted
We still need to fix the 0bd 0ba issue on every listing card, are we retrieving this information from the API correctly? is it included in the langchain response?
```

---

## Phase 10: Property Images & Card Refinements

### 25. Add Property Images

```
Is there a way to include images for the properties on the listing cards?
```

### 26. Debug Image Display

```
The images are not displaying
```

### 27. Refine Message Display

```
Images are now rendering correctly.
Can we refrain from showing all the listing details in the message-bubble and only show addresses there? The listing cards are fine, don't make any changes to that
```

### 28. Fix Sale/Lease Tags

```
The lease and sale tags on the images are not visible, can we move them to the listing card
```

---

## Phase 11: Context & Polish

### 29. Fix Follow-Up Context

```
The agent can answer first turn and subsequent questions but is having trouble with context in follow up turns.

I would have wanted to see 3bd homes in Northwest Austin as that was the area being discussed in the previous turn
```

### 30. Fix Empty Results

```
Its fixed context but now returns no results for these questions, which should have at least some results
```

### 31. Fix Single Listing Image Size

```
Can we fix the image size for single listing?
```

### 32. Commit Progress

```
can you add and commit what we have so far
```

### 33. Update README

```
Update the README.md to reflect all new changes.
```

---

## Prompt Patterns Used

| Pattern | Example | Count |
|---------|---------|-------|
| Feature request with spec | "Build an Express backend that..." | 5 |
| Bug report with terminal output | Sharing error logs directly | 10 |
| Design-first, then implement | "Design a clean abstraction layer..." then "Implement the plan" | 2 |
| Iterative refinement | "Fix the image size", "Move tags to card" | 6 |
| Plan mode for research | "Read the Repliers API docs and suggest new tools" | 1 |
