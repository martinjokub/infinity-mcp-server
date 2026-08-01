import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getInfinityClient } from "../services/auth.js";
import { errorResponse, omitUndefined, toolResponse } from "../services/format.js";
import type { HookBody } from "../types.js";
import { BoardIdSchema, HookBodySchema, HookIdSchema, PaginationSchema, ResponseFormatSchema, WorkspaceIdSchema } from "./schemas.js";

export function registerHookTools(server: McpServer): void {
  server.registerTool(
    "infinity_list_hooks",
    {
      title: "List Infinity Hooks",
      description: "List webhook hooks for an Infinity board. Hook secrets may be returned by Infinity; treat them as credentials.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, ...PaginationSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, response_format, ...pagination } = params;
        const data = await getInfinityClient("infinity:read").listHooks(workspace_id, board_id, pagination);
        return toolResponse(data, response_format, "Infinity Hooks");
      } catch (error) { return errorResponse(error instanceof Error ? error.message : String(error)); }
    },
  );

  server.registerTool(
    "infinity_create_hook",
    {
      title: "Create Infinity Hook",
      description: "Create a webhook hook for an Infinity board. The returned secret is sensitive and should be stored securely.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, ...HookBodySchema, url: z.string().url(), events: z.array(z.object({ event: z.string().min(1), data: z.unknown().optional() }).strict()).min(1), response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, response_format, ...body } = params;
        const data = await getInfinityClient("infinity:write").createHook(workspace_id, board_id, omitUndefined(body) as HookBody);
        return toolResponse(data, response_format, "Created Infinity Hook");
      } catch (error) { return errorResponse(error instanceof Error ? error.message : String(error)); }
    },
  );

  server.registerTool(
    "infinity_update_hook",
    {
      title: "Update Infinity Hook",
      description: "Update an Infinity webhook hook. Omitted fields are left unchanged where Infinity permits.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, hook_id: HookIdSchema, ...HookBodySchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, hook_id, response_format, ...body } = params;
        const data = await getInfinityClient("infinity:write").updateHook(workspace_id, board_id, hook_id, omitUndefined(body) as HookBody);
        return toolResponse(data, response_format, "Updated Infinity Hook");
      } catch (error) { return errorResponse(error instanceof Error ? error.message : String(error)); }
    },
  );

  server.registerTool(
    "infinity_delete_hook",
    {
      title: "Delete Infinity Hook",
      description: "Delete an Infinity webhook hook.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, hook_id: HookIdSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, hook_id, response_format }) => {
      try { return toolResponse(await getInfinityClient("infinity:admin").deleteHook(workspace_id, board_id, hook_id), response_format, "Deleted Infinity Hook"); }
      catch (error) { return errorResponse(error instanceof Error ? error.message : String(error)); }
    },
  );
}
