import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getInfinityClient } from "../services/auth.js";
import { errorResponse, normalizeValues, omitUndefined, toolResponse } from "../services/format.js";
import { InfinityClient } from "../services/infinityClient.js";
import type { InfinityAttribute, JsonValue } from "../types.js";
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

const FriendlyItemValuesSchema = {
  values: ValuesObjectSchema.describe("Object keyed by Infinity attribute ID or exact attribute name."),
  values_by_name: ValuesObjectSchema.describe("Object keyed by Infinity attribute name, for example { \"Name\": \"Task title\" }."),
  name: z.string().min(1).optional().describe("Convenience value for the folder's single attribute, or the board's Name attribute."),
  title: z.string().min(1).optional().describe("Alias for name."),
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
        const data = await getInfinityClient("infinity:read").listItems(workspace_id, board_id, filters);
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
        const data = await getInfinityClient("infinity:read").getItem(workspace_id, board_id, item_id, { expand });
        return toolResponse(data, response_format, "Infinity Item");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_create_item_simple",
    {
      title: "Create Infinity Item Simple",
      description: "ChatGPT-safe item creation. Creates one item in a folder using plain fields: name, optional description, optional status, and optional extra values by field name.",
      inputSchema: z.object({
        workspace_id: WorkspaceIdSchema,
        board_id: BoardIdSchema,
        folder_id: FolderIdSchema,
        name: z.string().min(1).describe("Item name or task title."),
        description: z.string().optional().describe("Optional Description field value."),
        status: z.string().optional().describe("Optional Status label name, for example To Do, Doing, Done, or On hold."),
        values_by_name: ValuesObjectSchema.describe("Optional extra values keyed by visible Infinity field name."),
        response_format: ResponseFormatSchema,
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ workspace_id, board_id, folder_id, name, description, status, values_by_name, response_format }) => {
      const toolName = "infinity_create_item_simple";
      try {
        const client = getInfinityClient("infinity:write");
        const valuesByName: Record<string, JsonValue> = {
          ...(values_by_name as Record<string, JsonValue> | undefined),
          Name: name,
        };
        if (description !== undefined) valuesByName.Description = description;
        if (status !== undefined) valuesByName.Status = status;

        const resolvedValues = await resolveCreateValues(client, workspace_id, board_id, folder_id, { valuesByName });
        const data = await client.createItem(workspace_id, board_id, { folder_id, values: normalizeValues(resolvedValues) });
        const created = typeof data.id === "string" ? await client.getItem(workspace_id, board_id, data.id, { expand: ["values", "values.attribute", "folder"] }) : data;
        logCreateSuccess(toolName, workspace_id, board_id, folder_id, created.id);
        return toolResponse(simplifyItem(created), response_format, "Created Infinity Item");
      } catch (error) {
        logCreateError(toolName, workspace_id, board_id, folder_id, error);
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_add_task_confirmed",
    {
      title: "Add Infinity Task Confirmed",
      description: "Add one confirmed task to one Infinity folder. Use only when the user explicitly asks to create/add a task.",
      inputSchema: z.object({
        workspace_id: WorkspaceIdSchema,
        board_id: BoardIdSchema,
        folder_id: FolderIdSchema,
        title: z.string().min(1).describe("Task title to create."),
        confirm_create: z.literal(true).describe("Must be true to confirm the user requested creating this task."),
        response_format: ResponseFormatSchema,
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ workspace_id, board_id, folder_id, title, response_format }) => {
      const toolName = "infinity_add_task_confirmed";
      try {
        const client = getInfinityClient("infinity:write");
        const resolvedValues = await resolveCreateValues(client, workspace_id, board_id, folder_id, { name: title });
        const data = await client.createItem(workspace_id, board_id, { folder_id, values: normalizeValues(resolvedValues) });
        const created = typeof data.id === "string" ? await client.getItem(workspace_id, board_id, data.id, { expand: ["values", "values.attribute", "folder"] }) : data;
        logCreateSuccess(toolName, workspace_id, board_id, folder_id, created.id);
        return toolResponse(simplifyItem(created), response_format, "Added Infinity Task");
      } catch (error) {
        logCreateError(toolName, workspace_id, board_id, folder_id, error);
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_list_items_simple",
    {
      title: "List Infinity Items Simple",
      description: "ChatGPT-safe folder item listing. Returns plain item IDs, names, descriptions, statuses, and created timestamps.",
      inputSchema: z.object({
        workspace_id: WorkspaceIdSchema,
        board_id: BoardIdSchema,
        folder_id: FolderIdSchema,
        limit: z.number().int().min(1).max(100).default(50),
        response_format: ResponseFormatSchema,
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, folder_id, limit, response_format }) => {
      try {
        const data = await getInfinityClient("infinity:read").listItems(workspace_id, board_id, {
          folder_id,
          limit,
          expand: ["values", "values.attribute", "folder"],
        });
        const simple = {
          count: data.data.length,
          has_more: data.has_more,
          folder_id,
          items: data.data.map(simplifyItem),
        };
        return toolResponse(simple, response_format, "Infinity Items");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_create_item",
    {
      title: "Create Infinity Item",
      description: "Create an item in a folder. Prefer name/title for simple tasks, values_by_name for field names, or values keyed by attribute ID.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, folder_id: FolderIdSchema, parent_id: ItemIdSchema.nullable().optional(), ...FriendlyItemValuesSchema, sort_order: z.string().optional(), response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ workspace_id, board_id, folder_id, parent_id, values, values_by_name, name, title, sort_order, response_format }) => {
      const toolName = "infinity_create_item";
      try {
        const client = getInfinityClient("infinity:write");
        const resolvedValues = await resolveCreateValues(client, workspace_id, board_id, folder_id, {
          values: values as Record<string, JsonValue> | undefined,
          valuesByName: values_by_name as Record<string, JsonValue> | undefined,
          name,
          title,
        });
        const body = omitUndefined({ folder_id, parent_id, values: normalizeValues(resolvedValues), sort_order });
        const data = await client.createItem(workspace_id, board_id, body);
        const created = typeof data.id === "string" ? await client.getItem(workspace_id, board_id, data.id, { expand: ["values", "values.attribute", "folder"] }) : data;
        logCreateSuccess(toolName, workspace_id, board_id, folder_id, created.id);
        return toolResponse(created, response_format, "Created Infinity Item");
      } catch (error) {
        logCreateError(toolName, workspace_id, board_id, folder_id, error);
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
        const data = await getInfinityClient("infinity:write").updateItem(workspace_id, board_id, item_id, body);
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
        const data = await getInfinityClient("infinity:admin").archiveItem(workspace_id, board_id, item_id);
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
        const data = await getInfinityClient("infinity:read").listSubitems(workspace_id, board_id, parent_item_id, filters);
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
      description: "Create a subitem by setting parent_id to the parent item ID. Prefer name/title for simple tasks, values_by_name for field names, or values keyed by attribute ID.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, folder_id: FolderIdSchema, parent_item_id: ItemIdSchema, ...FriendlyItemValuesSchema, sort_order: z.string().optional(), response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ workspace_id, board_id, folder_id, parent_item_id, values, values_by_name, name, title, sort_order, response_format }) => {
      const toolName = "infinity_create_subitem";
      try {
        const client = getInfinityClient("infinity:write");
        const resolvedValues = await resolveCreateValues(client, workspace_id, board_id, folder_id, {
          values: values as Record<string, JsonValue> | undefined,
          valuesByName: values_by_name as Record<string, JsonValue> | undefined,
          name,
          title,
        });
        const body = omitUndefined({ folder_id, parent_id: parent_item_id, values: normalizeValues(resolvedValues), sort_order });
        const data = await client.createItem(workspace_id, board_id, body);
        const created = typeof data.id === "string" ? await client.getItem(workspace_id, board_id, data.id, { expand: ["values", "values.attribute", "folder"] }) : data;
        logCreateSuccess(toolName, workspace_id, board_id, folder_id, created.id);
        return toolResponse(created, response_format, "Created Infinity Subitem");
      } catch (error) {
        logCreateError(toolName, workspace_id, board_id, folder_id, error);
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );
}

async function resolveCreateValues(
  client: InfinityClient,
  workspaceId: string,
  boardId: string,
  folderId: string,
  input: {
    values?: Record<string, JsonValue>;
    valuesByName?: Record<string, JsonValue>;
    name?: string;
    title?: string;
  },
): Promise<Record<string, JsonValue>> {
  const resolved: Record<string, JsonValue> = {};
  const attributes = await listAllAttributes(client, workspaceId, boardId);
  const folder = await client.getFolder(workspaceId, boardId, folderId);
  const validAttributes = folder.attribute_ids?.length
    ? attributes.filter((attribute) => folder.attribute_ids?.includes(attribute.id))
    : attributes;

  if (!input.values && !input.valuesByName && !input.name && !input.title) {
    throw new Error("Provide item values using name, title, values_by_name, or values keyed by attribute ID.");
  }

  for (const [key, value] of Object.entries(input.values ?? {})) {
    const attribute = findAttribute(key, attributes);
    if (!attribute) {
      throw unknownAttributeError(key, validAttributes);
    }
    resolved[attribute.id] = normalizeAttributeValue(attribute, value);
  }

  for (const [name, value] of Object.entries(input.valuesByName ?? {})) {
    const attribute = findAttribute(name, validAttributes);
    if (!attribute) {
      throw unknownAttributeError(name, validAttributes);
    }
    resolved[attribute.id] = normalizeAttributeValue(attribute, value);
  }

  const simpleName = input.name ?? input.title;
  if (simpleName !== undefined) {
    const attribute = pickNameAttribute(validAttributes);
    if (!attribute) {
      throw new Error(`Could not choose an attribute for name/title. Valid attributes: ${formatAttributeList(validAttributes)}.`);
    }
    if (resolved[attribute.id] === undefined) {
      resolved[attribute.id] = normalizeAttributeValue(attribute, simpleName);
    }
  }

  if (Object.keys(resolved).length === 0) {
    throw new Error(`No item values were provided. Valid attributes: ${formatAttributeList(validAttributes)}.`);
  }

  return resolved;
}

async function listAllAttributes(client: InfinityClient, workspaceId: string, boardId: string): Promise<InfinityAttribute[]> {
  const attributes: InfinityAttribute[] = [];
  let after: string | undefined;

  do {
    const page = await client.listAttributes(workspaceId, boardId, { limit: 100, after });
    attributes.push(...page.data);
    after = page.has_more && typeof page.after === "string" ? page.after : undefined;
  } while (after);

  return attributes;
}

function findAttribute(key: string, attributes: InfinityAttribute[]): InfinityAttribute | undefined {
  return attributes.find((attribute) => attribute.id === key)
    ?? attributes.find((attribute) => attribute.name === key)
    ?? attributes.find((attribute) => attribute.name.toLowerCase() === key.toLowerCase());
}

function pickNameAttribute(attributes: InfinityAttribute[]): InfinityAttribute | undefined {
  if (attributes.length === 1) return attributes[0];
  return attributes.find((attribute) => attribute.name === "Name")
    ?? attributes.find((attribute) => attribute.name.toLowerCase() === "name");
}

function unknownAttributeError(name: string, attributes: InfinityAttribute[]): Error {
  return new Error(`Unknown attribute "${name}". Use one of: ${formatAttributeList(attributes)}.`);
}

function formatAttributeList(attributes: InfinityAttribute[]): string {
  if (attributes.length === 0) return "none";
  return attributes.map((attribute) => `${attribute.name} (${attribute.id})`).join(", ");
}

function normalizeAttributeValue(attribute: InfinityAttribute, value: JsonValue): JsonValue {
  if (attribute.type !== "label") return value;
  if (value === null) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map((candidate) => normalizeLabelValue(attribute, candidate));
}

function normalizeLabelValue(attribute: InfinityAttribute, value: JsonValue): JsonValue {
  if (typeof value !== "string") return value;

  const labels = getAttributeLabels(attribute);
  if (labels.some((label) => label.id === value)) return value;

  const label = labels.find((candidate) => candidate.name === value)
    ?? labels.find((candidate) => candidate.name.toLowerCase() === value.toLowerCase());
  if (label) return label.id;

  throw new Error(`Unknown label "${value}" for ${attribute.name}. Use one of: ${labels.map((candidate) => `${candidate.name} (${candidate.id})`).join(", ")}.`);
}

function getAttributeLabels(attribute: InfinityAttribute): Array<{ id: string; name: string }> {
  const settings = attribute.settings;
  const labels = settings && Array.isArray(settings.labels) ? settings.labels : [];
  return labels.filter((label): label is { id: string; name: string } =>
    typeof label === "object"
    && label !== null
    && typeof (label as { id?: unknown }).id === "string"
    && typeof (label as { name?: unknown }).name === "string",
  );
}

function logCreateSuccess(toolName: string, workspaceId: string, boardId: string, folderId: string, itemId: string): void {
  console.error(`[${toolName}] created workspace_id=${workspaceId} board_id=${boardId} folder_id=${folderId} item_id=${itemId}`);
}

function logCreateError(toolName: string, workspaceId: string, boardId: string, folderId: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${toolName}] failed workspace_id=${workspaceId} board_id=${boardId} folder_id=${folderId}: ${message}`);
}

function simplifyItem(item: Record<string, unknown>) {
  const values = Array.isArray(item.values) ? item.values : [];
  const valuesByName: Record<string, JsonValue> = {};

  for (const value of values) {
    if (!isRecord(value)) continue;
    const attribute = isRecord(value.attribute) ? value.attribute : undefined;
    const name = typeof attribute?.name === "string" ? attribute.name : undefined;
    if (!name) continue;
    valuesByName[name] = value.data as JsonValue;
  }

  return {
    id: item.id,
    folder_id: item.folder_id,
    parent_id: item.parent_id ?? null,
    name: valuesByName.Name ?? null,
    description: valuesByName.Description ?? null,
    status: valuesByName.Status ?? null,
    values_by_name: valuesByName,
    created_at: item.created_at,
    deleted: item.deleted ?? false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
