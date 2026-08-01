import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getInfinityClient } from "../services/auth.js";
import { errorResponse, toolResponse } from "../services/format.js";
import { AttributeIdSchema, BoardIdSchema, ItemIdSchema, ReferenceIdSchema, ResponseFormatSchema, WorkspaceIdSchema } from "./schemas.js";

export function registerReferenceTools(server: McpServer): void {
  server.registerTool(
    "infinity_create_reference",
    {
      title: "Create Infinity Reference",
      description: "Create a reference between two items through a reference attribute on an Infinity board.",
      inputSchema: z.object({
        workspace_id: WorkspaceIdSchema,
        board_id: BoardIdSchema,
        attribute_id: AttributeIdSchema.describe("Reference attribute ID."),
        from_item_id: ItemIdSchema.describe("Source item ID."),
        to_item_id: ItemIdSchema.describe("Target item ID."),
        response_format: ResponseFormatSchema,
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ workspace_id, board_id, attribute_id, from_item_id, to_item_id, response_format }) => {
      try {
        const data = await getInfinityClient("infinity:write").createReference(workspace_id, board_id, { attribute_id, from_item_id, to_item_id });
        return toolResponse(data, response_format, "Created Infinity Reference");
      } catch (error) { return errorResponse(error instanceof Error ? error.message : String(error)); }
    },
  );

  server.registerTool(
    "infinity_delete_reference",
    {
      title: "Delete Infinity Reference",
      description: "Delete a reference between Infinity items.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, reference_id: ReferenceIdSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, reference_id, response_format }) => {
      try { return toolResponse(await getInfinityClient("infinity:admin").deleteReference(workspace_id, board_id, reference_id), response_format, "Deleted Infinity Reference"); }
      catch (error) { return errorResponse(error instanceof Error ? error.message : String(error)); }
    },
  );
}
