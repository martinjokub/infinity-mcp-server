import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { InfinityClient } from "../services/infinityClient.js";
import { errorResponse, omitUndefined, toolResponse } from "../services/format.js";
import type { FolderBody } from "../types.js";
import { BoardIdSchema, FolderBodySchema, FolderIdSchema, PaginationSchema, ResponseFormatSchema, WorkspaceIdSchema } from "./schemas.js";

export function registerFolderTools(server: McpServer): void {
  server.registerTool(
    "infinity_list_folders",
    {
      title: "List Infinity Folders",
      description: "List folders and subfolders within an Infinity board. Subfolders have parent_id set.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, ...PaginationSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, response_format, ...pagination } = params;
        const data = await new InfinityClient().listFolders(workspace_id, board_id, pagination);
        return toolResponse(data, response_format, "Infinity Folders");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_get_folder",
    {
      title: "Get Infinity Folder",
      description: "Get one Infinity folder by ID.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, folder_id: FolderIdSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, folder_id, response_format }) => {
      try {
        const data = await new InfinityClient().getFolder(workspace_id, board_id, folder_id);
        return toolResponse(data, response_format, "Infinity Folder");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_create_folder",
    {
      title: "Create Infinity Folder",
      description: "Create a folder or subfolder in an Infinity board. Set parent_id to create a subfolder.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, ...FolderBodySchema, name: z.string().min(1), response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, response_format, ...body } = params;
        const data = await new InfinityClient().createFolder(workspace_id, board_id, omitUndefined(body) as FolderBody);
        return toolResponse(data, response_format, "Created Infinity Folder");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_update_folder",
    {
      title: "Update Infinity Folder",
      description: "Update folder metadata. Omitted fields are left unchanged.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, folder_id: FolderIdSchema, ...FolderBodySchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, board_id, folder_id, response_format, ...body } = params;
        const data = await new InfinityClient().updateFolder(workspace_id, board_id, folder_id, omitUndefined(body) as FolderBody);
        return toolResponse(data, response_format, "Updated Infinity Folder");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_archive_folder",
    {
      title: "Archive Infinity Folder",
      description: "Archive/delete an Infinity folder. This changes remote Infinity data.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, board_id: BoardIdSchema, folder_id: FolderIdSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, folder_id, response_format }) => {
      try {
        const data = await new InfinityClient().archiveFolder(workspace_id, board_id, folder_id);
        return toolResponse(data, response_format, "Archived Infinity Folder");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );
}
