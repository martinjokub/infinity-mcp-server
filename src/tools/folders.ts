import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getInfinityClient } from "../services/auth.js";
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
        const data = await getInfinityClient("infinity:read").listFolders(workspace_id, board_id, pagination);
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
        const data = await getInfinityClient("infinity:read").getFolder(workspace_id, board_id, folder_id);
        return toolResponse(data, response_format, "Infinity Folder");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_list_folders_simple",
    {
      title: "List Infinity Folders Simple",
      description: "ChatGPT-safe folder listing. Returns folder IDs, names, parent IDs, and deleted status.",
      inputSchema: z.object({
        workspace_id: WorkspaceIdSchema,
        board_id: BoardIdSchema,
        limit: z.number().int().min(1).max(100).default(100),
        response_format: ResponseFormatSchema,
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, board_id, limit, response_format }) => {
      try {
        const data = await getInfinityClient("infinity:read").listFolders(workspace_id, board_id, { limit });
        const simple = {
          count: data.data.length,
          has_more: data.has_more,
          folders: data.data.map((folder) => ({
            id: folder.id,
            name: folder.name,
            parent_id: folder.parent_id ?? null,
            attribute_ids: folder.attribute_ids ?? [],
            deleted: folder.deleted ?? false,
          })),
        };
        return toolResponse(simple, response_format, "Infinity Folders");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_create_folder_simple",
    {
      title: "Create Infinity Folder Simple",
      description: "ChatGPT-safe folder creation. Creates one folder in a board, or a subfolder when parent_id is provided.",
      inputSchema: z.object({
        workspace_id: WorkspaceIdSchema,
        board_id: BoardIdSchema,
        name: z.string().min(1).describe("Folder name."),
        parent_id: FolderIdSchema.nullable().optional().describe("Optional parent folder ID for subfolders. Omit for a root board folder."),
        response_format: ResponseFormatSchema,
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ workspace_id, board_id, name, parent_id, response_format }) => {
      try {
        const data = await getInfinityClient("infinity:write").createFolder(workspace_id, board_id, omitUndefined({ name, parent_id }) as FolderBody);
        const simple = {
          id: data.id,
          name: data.name,
          parent_id: data.parent_id ?? null,
          attribute_ids: data.attribute_ids ?? [],
          deleted: data.deleted ?? false,
        };
        console.error(`[infinity_create_folder_simple] created workspace_id=${workspace_id} board_id=${board_id} folder_id=${data.id}`);
        return toolResponse(simple, response_format, "Created Infinity Folder");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[infinity_create_folder_simple] failed workspace_id=${workspace_id} board_id=${board_id}: ${message}`);
        return errorResponse(message);
      }
    },
  );

  server.registerTool(
    "infinity_add_folder_confirmed",
    {
      title: "Add Infinity Folder Confirmed",
      description: "Add one confirmed folder to one Infinity board. Use only when the user explicitly asks to create/add a folder.",
      inputSchema: z.object({
        workspace_id: WorkspaceIdSchema,
        board_id: BoardIdSchema,
        folder_name: z.string().min(1).describe("Folder name to create."),
        parent_id: FolderIdSchema.nullable().optional().describe("Optional parent folder ID for subfolders. Omit for a root board folder."),
        confirm_create: z.literal(true).describe("Must be true to confirm the user requested creating this folder."),
        response_format: ResponseFormatSchema,
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ workspace_id, board_id, folder_name, parent_id, response_format }) => {
      try {
        const data = await getInfinityClient("infinity:write").createFolder(workspace_id, board_id, omitUndefined({ name: folder_name, parent_id }) as FolderBody);
        const simple = {
          id: data.id,
          name: data.name,
          parent_id: data.parent_id ?? null,
          attribute_ids: data.attribute_ids ?? [],
          deleted: data.deleted ?? false,
        };
        console.error(`[infinity_add_folder_confirmed] created workspace_id=${workspace_id} board_id=${board_id} folder_id=${data.id}`);
        return toolResponse(simple, response_format, "Added Infinity Folder");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[infinity_add_folder_confirmed] failed workspace_id=${workspace_id} board_id=${board_id}: ${message}`);
        return errorResponse(message);
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
        const data = await getInfinityClient("infinity:write").createFolder(workspace_id, board_id, omitUndefined(body) as FolderBody);
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
        const data = await getInfinityClient("infinity:write").updateFolder(workspace_id, board_id, folder_id, omitUndefined(body) as FolderBody);
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
        const data = await getInfinityClient("infinity:admin").archiveFolder(workspace_id, board_id, folder_id);
        return toolResponse(data, response_format, "Archived Infinity Folder");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );
}
