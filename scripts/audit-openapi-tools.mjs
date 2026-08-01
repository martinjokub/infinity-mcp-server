import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const specUrl = process.env.INFINITY_OPENAPI_URL || "https://devdocs.startinfinity.com/2026-04-20.morava/openapi.yaml";

const operationToolMap = {
  getMyProfileData: "infinity_get_profile",
  listWorkspaces: "infinity_list_workspaces",
  listBoards: "infinity_list_boards",
  createBoard: "infinity_create_board",
  getBoard: "infinity_get_board",
  listAttributes: "infinity_list_attributes",
  createAttribute: "infinity_create_attribute",
  getAttribute: "infinity_get_attribute",
  updateAttribute: "infinity_update_attribute",
  deleteAttribute: "infinity_delete_attribute",
  listItems: "infinity_list_items",
  createItem: "infinity_create_item",
  getItem: "infinity_get_item",
  updateItem: "infinity_update_item",
  deleteItem: "infinity_archive_item",
  listComments: "infinity_list_comments",
  createComment: "infinity_create_comment",
  getComment: "infinity_get_comment",
  updateComment: "infinity_update_comment",
  deleteComment: "infinity_delete_comment",
  listFolders: "infinity_list_folders",
  createFolder: "infinity_create_folder",
  getFolder: "infinity_get_folder",
  updateFolder: "infinity_update_folder",
  deleteFolder: "infinity_archive_folder",
  createFromFile: "infinity_upload_attachment_from_base64",
  createFromURL: "infinity_upload_attachment_from_url",
  listViews: "infinity_list_views",
  createView: "infinity_create_view",
  getViews: "infinity_get_view",
  updateView: "infinity_update_view",
  deleteView: "infinity_delete_view",
  listMembers: "infinity_list_workspace_members",
  inviteMember: "infinity_invite_workspace_member",
  addMember: "infinity_add_workspace_member",
  removeMember: "infinity_remove_workspace_member",
  createReference: "infinity_create_reference",
  deleteReference: "infinity_delete_reference",
  createHook: "infinity_create_hook",
  listHooks: "infinity_list_hooks",
  updateHook: "infinity_update_hook",
  deleteHook: "infinity_delete_hook",
  createTimeEntry: "infinity_create_time_entry",
  updateTimeEntry: "infinity_update_time_entry",
  deleteTimeEntry: "infinity_delete_time_entry",
};

const response = await fetch(specUrl);
if (!response.ok) throw new Error(`Could not download OpenAPI spec: ${response.status} ${response.statusText}`);
const spec = await response.text();
const operations = [...spec.matchAll(/^\s{6}operationId: (.+)$/gm)].map((match) => match[1].trim());
const duplicateOperations = operations.filter((operation, index) => operations.indexOf(operation) !== index);
const unmappedOperations = operations.filter((operation) => !operationToolMap[operation]);
const extraMappings = Object.keys(operationToolMap).filter((operation) => !operations.includes(operation));

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  env: { ...process.env, INFINITY_API_TOKEN: process.env.INFINITY_API_TOKEN || "audit-token" },
});
const client = new Client({ name: "infinity-openapi-audit", version: "1.0.0" });
await client.connect(transport);
const tools = await client.listTools();
await client.close();

const toolNames = new Set(tools.tools.map((tool) => tool.name));
const missingTools = Object.entries(operationToolMap)
  .filter(([, tool]) => !toolNames.has(tool))
  .map(([operation, tool]) => `${operation} -> ${tool}`);

if (duplicateOperations.length || unmappedOperations.length || extraMappings.length || missingTools.length) {
  console.error("Infinity OpenAPI coverage audit failed.");
  if (duplicateOperations.length) console.error(`Duplicate operations: ${[...new Set(duplicateOperations)].join(", ")}`);
  if (unmappedOperations.length) console.error(`Unmapped operations: ${unmappedOperations.join(", ")}`);
  if (extraMappings.length) console.error(`Mappings absent from spec: ${extraMappings.join(", ")}`);
  if (missingTools.length) console.error(`Missing registered tools: ${missingTools.join(", ")}`);
  process.exit(1);
}

console.log(`OpenAPI coverage passed: ${operations.length} documented operations map to registered MCP tools.`);
