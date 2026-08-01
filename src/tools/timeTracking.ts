import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getInfinityClient } from "../services/auth.js";
import { errorResponse, omitUndefined, toolResponse } from "../services/format.js";
import type { TimeEntryBody } from "../types.js";
import { BoardIdSchema, ResponseFormatSchema, TimeEntryBodySchema, TimeEntryIdSchema, WorkspaceIdSchema } from "./schemas.js";

export function registerTimeTrackingTools(server: McpServer): void {
  server.registerTool(
    "infinity_create_time_entry",
    {
      title: "Create Infinity Time Entry",
      description: "Create a time entry for a time-tracking attribute on an Infinity item.",
      inputSchema: z.object({
        workspace_id: WorkspaceIdSchema,
        board_id: BoardIdSchema,
        ...TimeEntryBodySchema,
        item_id: z.string().min(1),
        attribute_id: z.string().min(1),
        response_format: ResponseFormatSchema,
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, response_format, ...body } = params;
        const data = await getInfinityClient("infinity:write").createTimeEntry(workspace_id, board_id, omitUndefined(body) as TimeEntryBody);
        return toolResponse(data, response_format, "Created Infinity Time Entry");
      } catch (error) { return errorResponse(error instanceof Error ? error.message : String(error)); }
    },
  );

  server.registerTool(
    "infinity_update_time_entry",
    {
      title: "Update Infinity Time Entry",
      description: "Update an Infinity time entry. item_id and attribute_id are immutable after creation.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, time_entry_id: TimeEntryIdSchema, ...TimeEntryBodySchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, time_entry_id, response_format, item_id: _itemId, attribute_id: _attributeId, ...body } = params;
        const data = await getInfinityClient("infinity:write").updateTimeEntry(workspace_id, board_id, time_entry_id, omitUndefined(body) as TimeEntryBody);
        return toolResponse(data, response_format, "Updated Infinity Time Entry");
      } catch (error) { return errorResponse(error instanceof Error ? error.message : String(error)); }
    },
  );

  server.registerTool(
    "infinity_delete_time_entry",
    {
      title: "Delete Infinity Time Entry",
      description: "Delete an Infinity time entry.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, time_entry_id: TimeEntryIdSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, time_entry_id, response_format }) => {
      try { return toolResponse(await getInfinityClient("infinity:admin").deleteTimeEntry(workspace_id, board_id, time_entry_id), response_format, "Deleted Infinity Time Entry"); }
      catch (error) { return errorResponse(error instanceof Error ? error.message : String(error)); }
    },
  );
}
