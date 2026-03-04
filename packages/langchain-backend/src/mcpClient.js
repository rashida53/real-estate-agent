import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

let clientPromise;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const defaultMcpEntry = resolve(
  __dirname,
  "../../mcp-repliers/src/index.js"
);

async function initClient() {
  const client = new Client({
    name: "langchain-backend",
    version: "0.1.0",
  });

  const command =
    process.env.MCP_SERVER_COMMAND || process.env.MCP_CMD || "node";

  const argsEnv =
    process.env.MCP_SERVER_ARGS && process.env.MCP_SERVER_ARGS.trim().length > 0
      ? process.env.MCP_SERVER_ARGS
      : process.env.MCP_ARGS;

  const args =
    argsEnv && argsEnv.trim().length > 0
      ? JSON.parse(argsEnv)
      : [defaultMcpEntry];

  const transport = new StdioClientTransport({
    command,
    args,
  });

  await client.connect(transport);
  return client;
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = initClient();
  }
  return clientPromise;
}

function extractResult(result) {
  if (result.structuredContent) {
    return result.structuredContent;
  }

  const firstContent = Array.isArray(result.content)
    ? result.content[0]
    : null;

  if (firstContent && firstContent.type === "text") {
    try {
      return JSON.parse(firstContent.text);
    } catch {
      // fall through
    }
  }

  return result;
}

export async function callSearchProperties(args) {
  const client = await getClient();

  const cleanArgs = Object.fromEntries(
    Object.entries(args).filter(([, v]) => v !== undefined)
  );

  const result = await client.callTool({
    name: "search_properties",
    arguments: cleanArgs,
  });

  return extractResult(result);
}

export async function callGetListingDetails({ mlsNumber }) {
  const client = await getClient();

  const result = await client.callTool({
    name: "get_listing_details",
    arguments: { mlsNumber },
  });

  return extractResult(result);
}

export async function callGetPropertyEstimate(args) {
  const client = await getClient();

  const cleanArgs = Object.fromEntries(
    Object.entries(args).filter(([, v]) => v !== undefined)
  );

  const result = await client.callTool({
    name: "get_property_estimate",
    arguments: cleanArgs,
  });

  return extractResult(result);
}

