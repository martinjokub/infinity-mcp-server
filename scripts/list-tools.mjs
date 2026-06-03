import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  env: {
    ...process.env,
    INFINITY_API_TOKEN: process.env.INFINITY_API_TOKEN || "dummy-token-for-tool-listing",
  },
});

const client = new Client({
  name: "infinity-mcp-smoke-test",
  version: "0.1.0",
});

await client.connect(transport);
const tools = await client.listTools();
console.log(JSON.stringify(tools.tools.map((tool) => tool.name).sort(), null, 2));
await client.close();
