import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getInfinityClient } from "../services/auth.js";
import { errorResponse, toolResponse } from "../services/format.js";
import { ResponseFormatSchema, WorkspaceIdSchema } from "./schemas.js";

export function registerAttachmentTools(server: McpServer): void {
  server.registerTool(
    "infinity_upload_attachment_from_url",
    {
      title: "Upload Infinity Attachment From URL",
      description: "Download a file from a URL into Infinity and return its attachment object. Use the returned attachment ID in an item attachment attribute value.",
      inputSchema: z.object({
        workspace_id: WorkspaceIdSchema,
        url: z.string().url().describe("Public URL for the file that Infinity should download."),
        response_format: ResponseFormatSchema,
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ workspace_id, url, response_format }) => {
      try {
        const data = await getInfinityClient("infinity:write").uploadAttachmentFromUrl(workspace_id, url);
        return toolResponse(data, response_format, "Uploaded Infinity Attachment");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_upload_attachment_from_base64",
    {
      title: "Upload Infinity Attachment From Base64",
      description: "Upload base64-encoded file content into Infinity and return its attachment object. Use the returned attachment ID in an item attachment attribute value.",
      inputSchema: z.object({
        workspace_id: WorkspaceIdSchema,
        file_name: z.string().min(1).describe("Original file name, including extension."),
        content_base64: z.string().min(1).describe("Base64-encoded file bytes without a data URL prefix."),
        content_type: z.string().min(1).optional().describe("Optional MIME type, for example application/pdf."),
        response_format: ResponseFormatSchema,
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ workspace_id, file_name, content_base64, content_type, response_format }) => {
      try {
        const data = await getInfinityClient("infinity:write").uploadAttachmentFromBase64(
          workspace_id,
          file_name,
          content_base64,
          content_type,
        );
        return toolResponse(data, response_format, "Uploaded Infinity Attachment");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );
}
