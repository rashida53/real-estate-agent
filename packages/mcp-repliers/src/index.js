import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSearchPropertiesTool } from "./tools/searchProperties.js";
import { registerGetListingDetailsTool } from "./tools/getListingDetails.js";
import { registerGetPropertyEstimateTool } from "./tools/getPropertyEstimate.js";

async function main() {
  const server = new McpServer({
    name: "repliers-mcp-server",
    version: "0.1.0",
  });

  registerSearchPropertiesTool(server);
  registerGetListingDetailsTool(server);
  registerGetPropertyEstimateTool(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  // Log to stderr; MCP clients will treat this as a transport-level error.
  // We intentionally avoid exposing stack traces through tool responses.
  // eslint-disable-next-line no-console
  console.error("Failed to start Repliers MCP server:", err);
  process.exit(1);
});

