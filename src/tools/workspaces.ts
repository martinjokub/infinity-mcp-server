import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getInfinityClient } from "../services/auth.js";
import { errorResponse, toolResponse } from "../services/format.js";
import { PaginationSchema, ResponseFormatSchema, WorkspaceIdSchema } from "./schemas.js";

const MemberRoleSchema = z.string().min(1).default("full-member").describe("Workspace role, for example full-member.");
const UserIdSchema = z.number().int().positive().describe("Infinity user ID.");

export function registerWorkspaceTools(server: McpServer): void {
  server.registerTool(
    "infinity_list_workspaces",
    {
      title: "List Infinity Workspaces",
      description: "List workspaces available to the authenticated Infinity user.",
      inputSchema: z.object({ ...PaginationSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { response_format, ...pagination } = params;
        const data = await getInfinityClient("infinity:read").listWorkspaces(pagination);
        return toolResponse(data, response_format, "Infinity Workspaces");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_list_workspace_members",
    {
      title: "List Infinity Workspace Members",
      description: "List users that belong to a workspace.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, ...PaginationSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      try {
        const { workspace_id, response_format, ...pagination } = params;
        const data = await getInfinityClient("infinity:read").listMembers(workspace_id, pagination);
        return toolResponse(data, response_format, "Infinity Workspace Members");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_invite_workspace_member",
    {
      title: "Invite Infinity Workspace Member",
      description: "Invite a user by email to an Infinity workspace.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, email: z.string().email(), role: MemberRoleSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ workspace_id, email, role, response_format }) => {
      try {
        const data = await getInfinityClient("infinity:admin").inviteMember(workspace_id, { email, role });
        return toolResponse(data, response_format, "Invited Infinity Workspace Member");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_add_workspace_member",
    {
      title: "Add Infinity Workspace Member",
      description: "Add an existing Infinity user to a workspace by user ID.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, user_id: UserIdSchema, role: MemberRoleSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, user_id, role, response_format }) => {
      try {
        const data = await getInfinityClient("infinity:admin").addMember(workspace_id, user_id, { role });
        return toolResponse(data, response_format, "Added Infinity Workspace Member");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "infinity_remove_workspace_member",
    {
      title: "Remove Infinity Workspace Member",
      description: "Remove a user from a workspace by user ID.",
      inputSchema: z.object({ workspace_id: WorkspaceIdSchema, user_id: UserIdSchema, response_format: ResponseFormatSchema }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ workspace_id, user_id, response_format }) => {
      try {
        const data = await getInfinityClient("infinity:admin").removeMember(workspace_id, user_id);
        return toolResponse(data, response_format, "Removed Infinity Workspace Member");
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
      }
    },
  );
}
