import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getInfinityClient } from "../services/auth.js";
import { errorResponse, omitUndefined, toolResponse } from "../services/format.js";
import type { ViewBody } from "../types.js";
import { BoardIdSchema, FolderIdSchema, PaginationSchema, ResponseFormatSchema, ViewBodySchema, ViewIdSchema, WorkspaceIdSchema } from "./schemas.js";

export function registerViewTools(server: McpServer): void {
  server.registerTool(
    "infinity_list_views",
    {
      title: "List Infinity Views",
      description: "List views in a board, optionally limited to one folder.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, folder_id: FolderIdSchema.optional(), ...PaginationSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, response_format, ...filters } = params;
        const data = await getInfinityClient("infinity:read").listViews(workspace_id, board_id, filters);
        return toolResponse(data, response_format, "Infinity Views");
      } catch (error) { return errorResponse(error instanceof Error ? error.message : String(error)); }
    },
  );

  server.registerTool(
    "infinity_get_view",
    {
      title: "Get Infinity View",
      description: "Get one Infinity folder view by ID.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, view_id: ViewIdSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, view_id, response_format }) => {
      try { return toolResponse(await getInfinityClient("infinity:read").getView(workspace_id, board_id, view_id), response_format, "Infinity View"); }
      catch (error) { return errorResponse(error instanceof Error ? error.message : String(error)); }
    },
  );

  for (const [name, title, operation, required] of [
    ["infinity_create_view", "Create Infinity View", "createView", true],
    ["infinity_update_view", "Update Infinity View", "updateView", false],
  ] as const) {
    server.registerTool(
      name,
      {
        title,
        description: operation === "createView" ? "Create a folder view in an Infinity board." : "Update an Infinity folder view. Omitted fields are left unchanged where Infinity permits.",
        inputSchema: z.object({
          workspace_id: WorkspaceIdSchema,
          board_id: BoardIdSchema,
          ...(required ? {} : { view_id: ViewIdSchema }),
          ...ViewBodySchema,
          ...(required ? { folder_id: FolderIdSchema, name: z.string().min(1), type: z.string().min(1) } : {}),
          response_format: ResponseFormatSchema,
        }).strict(),
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: operation === "updateView", openWorldHint: true },
      },
      async (params) => {
        try {
          const { workspace_id, board_id, response_format, ...rest } = params;
          const viewId = "view_id" in rest ? rest.view_id : undefined;
          const { view_id: _viewId, ...body } = rest as typeof rest & { view_id?: string };
          const client = getInfinityClient("infinity:write");
          const data = operation === "createView"
            ? await client.createView(workspace_id, board_id, omitUndefined(body) as ViewBody)
            : await client.updateView(workspace_id, board_id, viewId as string, omitUndefined(body) as ViewBody);
          return toolResponse(data, response_format, operation === "createView" ? "Created Infinity View" : "Updated Infinity View");
        } catch (error) { return errorResponse(error instanceof Error ? error.message : String(error)); }
      },
    );
  }

  server.registerTool(
    "infinity_delete_view",
    {
      title: "Delete Infinity View",
      description: "Delete an Infinity folder view.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, view_id: ViewIdSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, view_id, response_format }) => {
      try { return toolResponse(await getInfinityClient("infinity:admin").deleteView(workspace_id, board_id, view_id), response_format, "Deleted Infinity View"); }
      catch (error) { return errorResponse(error instanceof Error ? error.message : String(error)); }
    },
  );
}
