import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { InfinityClient } from "../services/infinityClient.js";
import { errorResponse, toolResponse } from "../services/format.js";
import { ResponseFormatSchema } from "./schemas.js";

export function registerProfileTools(server: McpServer): void {
  server.registerTool(
    "infinity_get_profile",
    {
      title: "Get Infinity Profile",
      description: "Get the profile for the authenticated Infinity API token.",
      inputSchema: z.object({ response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ response_format }) => {
      try {
        const data = await new InfinityClient().getProfile();
        return toolResponse(data, response_format, "Infinity Profile");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );
}
