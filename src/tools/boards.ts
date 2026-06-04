import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getInfinityClient } from "../services/auth.js";
import { errorResponse, omitUndefined, toolResponse } from "../services/format.js";
import type { BoardBody } from "../types.js";
import { BoardIdSchema, PaginationSchema, ResponseFormatSchema, WorkspaceIdSchema } from "./schemas.js";

export function registerBoardTools(server: McpServer): void {
  server.registerTool(
    "infinity_list_boards",
    {
      title: "List Infinity Boards",
      description: "List boards within an Infinity workspace.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, ...PaginationSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, response_format, ...pagination } = params;
        const data = await getInfinityClient("infinity:read").listBoards(workspace_id, pagination);
        return toolResponse(data, response_format, "Infinity Boards");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_get_board",
    {
      title: "Get Infinity Board",
      description: "Get one Infinity board by workspace ID and board ID.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, response_format }) => {
      try {
        const data = await getInfinityClient("infinity:read").getBoard(workspace_id, board_id);
        return toolResponse(data, response_format, "Infinity Board");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_create_board",
    {
      title: "Create Infinity Board",
      description: "Create a new board in an Infinity workspace. Optional color must be a HEX value; current user is added automatically by Infinity.",
      inputSchema: z
        .object({
          workspace_id: WorkspaceIdSchema,
          name: z.string().min(1).describe("Board name."),
          description: z.string().nullable().optional().describe("Optional board description."),
          color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe("Optional HEX board color, for example #f57740."),
          user_ids: z.array(z.number().int()).optional().describe("Workspace member user IDs to grant board access. Current user is added automatically."),
          response_format: ResponseFormatSchema,
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, response_format, ...body } = params;
        const data = await getInfinityClient("infinity:write").createBoard(workspace_id, omitUndefined(body) as BoardBody);
        return toolResponse(data, response_format, "Created Infinity Board");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );
}
