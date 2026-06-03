import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { InfinityClient } from "../services/infinityClient.js";
import { errorResponse, omitUndefined, toolResponse } from "../services/format.js";
import type { AttributeBody } from "../types.js";
import { AttributeBodySchema, AttributeIdSchema, BoardIdSchema, PaginationSchema, ResponseFormatSchema, WorkspaceIdSchema } from "./schemas.js";

export function registerAttributeTools(server: McpServer): void {
  server.registerTool(
    "infinity_list_attributes",
    {
      title: "List Infinity Attributes",
      description: "List attributes for a board. Use before creating or updating items so values use the right attribute IDs and formats.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, ...PaginationSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, response_format, ...pagination } = params;
        const data = await new InfinityClient().listAttributes(workspace_id, board_id, pagination);
        return toolResponse(data, response_format, "Infinity Attributes");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_get_attribute",
    {
      title: "Get Infinity Attribute",
      description: "Get one board attribute by ID.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, attribute_id: AttributeIdSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, attribute_id, response_format }) => {
      try {
        const data = await new InfinityClient().getAttribute(workspace_id, board_id, attribute_id);
        return toolResponse(data, response_format, "Infinity Attribute");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_create_attribute",
    {
      title: "Create Infinity Attribute",
      description: "Create a board attribute. After creation, update folder attribute_ids to make the attribute available in a folder.",
      inputSchema: z
        .object({
          workspace_id: WorkspaceIdSchema,
          board_id: BoardIdSchema,
          ...AttributeBodySchema,
          name: z.string().min(1).describe("Attribute name."),
          type: AttributeBodySchema.type.unwrap().describe("Infinity attribute type."),
          response_format: ResponseFormatSchema,
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, response_format, ...body } = params;
        const data = await new InfinityClient().createAttribute(workspace_id, board_id, omitUndefined(body) as AttributeBody);
        return toolResponse(data, response_format, "Created Infinity Attribute");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_update_attribute",
    {
      title: "Update Infinity Attribute",
      description: "Update a board attribute. Omitted fields are left unchanged where the API permits partial updates.",
      inputSchema: z
        .object({
          workspace_id: WorkspaceIdSchema,
          board_id: BoardIdSchema,
          attribute_id: AttributeIdSchema,
          ...AttributeBodySchema,
          response_format: ResponseFormatSchema,
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, attribute_id, response_format, ...body } = params;
        const data = await new InfinityClient().updateAttribute(workspace_id, board_id, attribute_id, omitUndefined(body) as AttributeBody);
        return toolResponse(data, response_format, "Updated Infinity Attribute");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_delete_attribute",
    {
      title: "Delete Infinity Attribute",
      description: "Delete an attribute from a board. This changes remote Infinity data and may affect folder/item field availability.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, attribute_id: AttributeIdSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, attribute_id, response_format }) => {
      try {
        const data = await new InfinityClient().deleteAttribute(workspace_id, board_id, attribute_id);
        return toolResponse(data, response_format, "Deleted Infinity Attribute");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );
}
