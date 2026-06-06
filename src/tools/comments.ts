import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getInfinityClient } from "../services/auth.js";
import { errorResponse, omitUndefined, toolResponse } from "../services/format.js";
import type { CommentBody } from "../types.js";
import {
  BoardIdSchema,
  CommentBodySchema,
  CommentExpandSchema,
  CommentIdSchema,
  ItemIdSchema,
  PaginationSchema,
  ResponseFormatSchema,
  WorkspaceIdSchema,
} from "./schemas.js";

export function registerCommentTools(server: McpServer): void {
  server.registerTool(
    "infinity_list_comments",
    {
      title: "List Infinity Comments",
      description: "List comments for an item. Use cursors for pagination. Use expand to include created_by or item data.",
      inputSchema: z
        .object({
          workspace_id: WorkspaceIdSchema,
          board_id: BoardIdSchema,
          item_id: ItemIdSchema,
          expand: CommentExpandSchema,
          ...PaginationSchema,
          response_format: ResponseFormatSchema,
        })
        .strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, item_id, response_format, ...filters } = params;
        const data = await getInfinityClient("infinity:read").listComments(workspace_id, board_id, item_id, filters);
        return toolResponse(data, response_format, "Infinity Comments");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_get_comment",
    {
      title: "Get Infinity Comment",
      description: "Get one item comment by ID. Use expand to include created_by or item data.",
      inputSchema: z
        .object({
          workspace_id: WorkspaceIdSchema,
          board_id: BoardIdSchema,
          item_id: ItemIdSchema,
          comment_id: CommentIdSchema,
          expand: CommentExpandSchema,
          response_format: ResponseFormatSchema,
        })
        .strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, item_id, comment_id, expand, response_format }) => {
      try {
        const data = await getInfinityClient("infinity:read").getComment(workspace_id, board_id, item_id, comment_id, { expand });
        return toolResponse(data, response_format, "Infinity Comment");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_create_comment",
    {
      title: "Create Infinity Comment",
      description: "Create a comment on an item. The text can be plain text or Infinity-supported HTML such as <p>Hello</p>.",
      inputSchema: z
        .object({
          workspace_id: WorkspaceIdSchema,
          board_id: BoardIdSchema,
          item_id: ItemIdSchema,
          ...CommentBodySchema,
          text: z.string().min(1).describe("Comment body. HTML is supported by Infinity, for example <p>Hello</p>."),
          response_format: ResponseFormatSchema,
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, item_id, response_format, ...body } = params;
        const data = await getInfinityClient("infinity:write").createComment(
          workspace_id,
          board_id,
          item_id,
          omitUndefined(body) as CommentBody,
        );
        return toolResponse(data, response_format, "Created Infinity Comment");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_update_comment",
    {
      title: "Update Infinity Comment",
      description: "Update a comment. Omitted fields are left unchanged where the API permits partial updates.",
      inputSchema: z
        .object({
          workspace_id: WorkspaceIdSchema,
          board_id: BoardIdSchema,
          item_id: ItemIdSchema,
          comment_id: CommentIdSchema,
          ...CommentBodySchema,
          response_format: ResponseFormatSchema,
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, item_id, comment_id, response_format, ...body } = params;
        const data = await getInfinityClient("infinity:write").updateComment(
          workspace_id,
          board_id,
          item_id,
          comment_id,
          omitUndefined(body) as CommentBody,
        );
        return toolResponse(data, response_format, "Updated Infinity Comment");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_delete_comment",
    {
      title: "Delete Infinity Comment",
      description: "Delete a comment from an item. This changes remote Infinity data.",
      inputSchema: z
        .object({
          workspace_id: WorkspaceIdSchema,
          board_id: BoardIdSchema,
          item_id: ItemIdSchema,
          comment_id: CommentIdSchema,
          response_format: ResponseFormatSchema,
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, item_id, comment_id, response_format }) => {
      try {
        const data = await getInfinityClient("infinity:admin").deleteComment(workspace_id, board_id, item_id, comment_id);
        return toolResponse(data, response_format, "Deleted Infinity Comment");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );
}
