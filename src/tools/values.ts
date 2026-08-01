import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getInfinityClient } from "../services/auth.js";
import { errorResponse, toolResponse } from "../services/format.js";
import type { InfinityItem, InfinityValue } from "../types.js";
import { AttributeIdSchema, BoardIdSchema, FolderIdSchema, ItemIdSchema, PaginationSchema, ResponseFormatSchema, WorkspaceIdSchema } from "./schemas.js";

export function registerValueTools(server: McpServer): void {
  server.registerTool(
    "infinity_get_item_values",
    {
      title: "Get Infinity Item Attribute Values",
      description: "Extract every attribute value from one Infinity item, including attribute names and types when Infinity provides them.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, item_id: ItemIdSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, item_id, response_format }) => {
      try {
        const item = await getInfinityClient("infinity:read").getItem(workspace_id, board_id, item_id, { expand: ["values", "values.attribute"] });
        return toolResponse(toItemValues(item), response_format, "Infinity Item Attribute Values");
      } catch (error) { return errorResponse(error instanceof Error ? error.message : String(error)); }
    },
  );

  server.registerTool(
    "infinity_get_item_attribute_value",
    {
      title: "Get One Infinity Item Attribute Value",
      description: "Extract one named attribute value from an Infinity item.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, item_id: ItemIdSchema, attribute_id: AttributeIdSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, item_id, attribute_id, response_format }) => {
      try {
        const item = await getInfinityClient("infinity:read").getItem(workspace_id, board_id, item_id, { expand: ["values", "values.attribute"] });
        const values = toItemValues(item).values;
        const value = values.find((candidate) => candidate.attribute_id === attribute_id);
        return toolResponse({ item_id, attribute_id, found: Boolean(value), value: value ?? null }, response_format, "Infinity Item Attribute Value");
      } catch (error) { return errorResponse(error instanceof Error ? error.message : String(error)); }
    },
  );

  server.registerTool(
    "infinity_list_item_values",
    {
      title: "List Infinity Item Values",
      description: "List items with their extracted attribute values. Filter by folder_id when appropriate and paginate for complete board coverage.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, folder_id: FolderIdSchema.optional(), ...PaginationSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, response_format, ...filters } = params;
        const page = await getInfinityClient("infinity:read").listItems(workspace_id, board_id, { ...filters, expand: ["values", "values.attribute"] });
        const data = { ...page, data: page.data.map(toItemValues) };
        return toolResponse(data, response_format, "Infinity Item Values");
      } catch (error) { return errorResponse(error instanceof Error ? error.message : String(error)); }
    },
  );
}

function toItemValues(item: InfinityItem) {
  const rawValues = Array.isArray(item.values) ? item.values : [];
  return {
    item_id: item.id,
    folder_id: item.folder_id,
    parent_id: item.parent_id ?? null,
    values: rawValues.map(formatValue),
  };
}

function formatValue(value: InfinityValue) {
  return {
    attribute_id: value.attribute_id ?? value.attribute?.id ?? null,
    attribute_name: value.attribute?.name ?? null,
    attribute_type: value.attribute?.type ?? null,
    data: value.data,
    deleted: value.deleted ?? false,
  };
}
