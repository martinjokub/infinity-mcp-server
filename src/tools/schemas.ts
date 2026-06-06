import { z } from "zod";
import { DEFAULT_LIMIT, MAX_LIMIT } from "../constants.js";
import type { JsonValue } from "../types.js";

export const ResponseFormatSchema = z.enum(["markdown", "json"]).default("markdown").describe("Output format.");

export const PaginationSchema = {
  limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT).describe("Maximum records to return."),
  after: z.string().optional().describe("Infinity cursor for the next page."),
  before: z.string().optional().describe("Infinity cursor for the previous page."),
  sort_by: z.string().optional().describe("Field to sort by, for example created_at."),
  sort_direction: z.enum(["asc", "desc"]).optional().describe("Sort direction."),
};

export const WorkspaceIdSchema = z.string().min(1).describe("Infinity workspace ID.");
export const BoardIdSchema = z.string().min(1).describe("Infinity board ID.");
export const FolderIdSchema = z.string().min(1).describe("Infinity folder ID.");
export const ItemIdSchema = z.string().min(1).describe("Infinity item ID.");
export const AttributeIdSchema = z.string().min(1).describe("Infinity attribute ID.");
export const CommentIdSchema = z.string().min(1).describe("Infinity comment ID.");

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(JsonValueSchema), z.record(JsonValueSchema)]),
);

export const ValuesObjectSchema = z
  .record(JsonValueSchema)
  .optional()
  .describe("Object keyed by Infinity attribute ID. Values are converted to Infinity values array.");

export const ItemExpandSchema = z
  .array(z.enum(["values", "values.attribute", "folder", "created_by"]))
  .optional()
  .describe("Optional item expansions.");

export const CommentExpandSchema = z
  .array(z.enum(["item", "item.values", "created_by"]))
  .optional()
  .describe("Optional comment expansions.");

export const CommentBodySchema = {
  text: z.string().min(1).optional().describe("Comment body. HTML is supported by Infinity, for example <p>Hello</p>."),
  parent_id: z.string().nullable().optional().describe("Optional parent comment ID for replies, or null."),
};

export const FolderBodySchema = {
  name: z.string().min(1).optional().describe("Folder name."),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional().describe("Optional HEX folder color."),
  parent_id: z.string().nullable().optional().describe("Parent folder ID for subfolders, or null."),
  attribute_ids: z.array(z.string()).optional().describe("Attribute IDs used by this folder."),
  sort_order: z.string().optional().describe("Infinity sort_order value."),
  settings: z.record(JsonValueSchema).optional().describe("Folder settings metadata."),
};

export const AttributeBodySchema = {
  name: z.string().min(1).optional().describe("Attribute name."),
  type: z
    .enum([
      "attachments",
      "checkbox",
      "created_at",
      "created_by",
      "date",
      "email",
      "label",
      "links",
      "longtext",
      "members",
      "number",
      "phone",
      "progress",
      "rating",
      "source_folder",
      "text",
      "updated_at",
      "vote",
    ])
    .optional()
    .describe("Infinity attribute type."),
  default_data: JsonValueSchema.optional().describe("Default value for the attribute type."),
  settings: z.record(JsonValueSchema).optional().describe("Attribute settings. Shape depends on attribute type."),
};
