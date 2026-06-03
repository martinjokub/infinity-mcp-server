import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { InfinityClient } from "../services/infinityClient.js";
import { errorResponse, normalizeValues, omitUndefined, toolResponse } from "../services/format.js";
import type { JsonValue } from "../types.js";
import {
  BoardIdSchema,
  FolderIdSchema,
  ItemExpandSchema,
  ItemIdSchema,
  PaginationSchema,
  ResponseFormatSchema,
  ValuesObjectSchema,
  WorkspaceIdSchema,
} from "./schemas.js";

const ItemBodySchema = {
  folder_id: FolderIdSchema.optional(),
  parent_id: ItemIdSchema.nullable().optional().describe("Optional parent item ID for subitems, or null."),
  values: ValuesObjectSchema,
  sort_order: z.string().optional().describe("Infinity sort_order value."),
};

export function registerItemTools(server: McpServer): void {
  server.registerTool(
    "infinity_list_items",
    {
      title: "List Infinity Items",
      description: "List items in a board, optionally filtered by folder_id. Use cursors for pagination.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, folder_id: FolderIdSchema.optional(), expand: ItemExpandSchema, ...PaginationSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, response_format, ...filters } = params;
        const data = await new InfinityClient().listItems(workspace_id, board_id, filters);
        return toolResponse(data, response_format, "Infinity Items");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_get_item",
    {
      title: "Get Infinity Item",
      description: "Get one Infinity item by ID.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, item_id: ItemIdSchema, expand: ItemExpandSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, item_id, expand, response_format }) => {
      try {
        const data = await new InfinityClient().getItem(workspace_id, board_id, item_id, { expand });
        return toolResponse(data, response_format, "Infinity Item");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_create_item",
    {
      title: "Create Infinity Item",
      description: "Create an item in a folder. Values must be an object keyed by attribute ID; first call infinity_list_attributes if unsure.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, folder_id: FolderIdSchema, parent_id: ItemIdSchema.nullable().optional(), values: ValuesObjectSchema, sort_order: z.string().optional(), response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ workspace_id, board_id, folder_id, parent_id, values, sort_order, response_format }) => {
      try {
        const body = omitUndefined({ folder_id, parent_id, values: normalizeValues(values as Record<string, JsonValue> | undefined), sort_order });
        const data = await new InfinityClient().createItem(workspace_id, board_id, body);
        return toolResponse(data, response_format, "Created Infinity Item");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_update_item",
    {
      title: "Update Infinity Item",
      description: "Update an item. Omitted fields are left unchanged. Values must be keyed by attribute ID.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, item_id: ItemIdSchema, ...ItemBodySchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, item_id, values, response_format, ...rest } = params;
        const body = omitUndefined({ ...rest, values: normalizeValues(values as Record<string, JsonValue> | undefined) });
        const data = await new InfinityClient().updateItem(workspace_id, board_id, item_id, body);
        return toolResponse(data, response_format, "Updated Infinity Item");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_archive_item",
    {
      title: "Archive Infinity Item",
      description: "Archive/delete an item. In Morava, the delete endpoint archives the item.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, item_id: ItemIdSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, item_id, response_format }) => {
      try {
        const data = await new InfinityClient().archiveItem(workspace_id, board_id, item_id);
        return toolResponse(data, response_format, "Archived Infinity Item");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_list_subitems",
    {
      title: "List Infinity Subitems",
      description: "List subitems by filtering board items whose parent_id equals parent_item_id.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, parent_item_id: ItemIdSchema, folder_id: FolderIdSchema.optional(), expand: ItemExpandSchema, ...PaginationSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, parent_item_id, response_format, ...filters } = params;
        const data = await new InfinityClient().listSubitems(workspace_id, board_id, parent_item_id, filters);
        return toolResponse(data, response_format, "Infinity Subitems");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_create_subitem",
    {
      title: "Create Infinity Subitem",
      description: "Create a subitem by setting parent_id to the parent item ID.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, folder_id: FolderIdSchema, parent_item_id: ItemIdSchema, values: ValuesObjectSchema, sort_order: z.string().optional(), response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ workspace_id, board_id, folder_id, parent_item_id, values, sort_order, response_format }) => {
      try {
        const body = omitUndefined({ folder_id, parent_id: parent_item_id, values: normalizeValues(values as Record<string, JsonValue> | undefined), sort_order });
        const data = await new InfinityClient().createItem(workspace_id, board_id, body);
        return toolResponse(data, response_format, "Created Infinity Subitem");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );
}
