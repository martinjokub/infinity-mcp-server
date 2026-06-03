# Infinity MCP Server

MCP server for agents that need to read and write StartInfinity data.

Reusable agent skills for this server live in the companion repository:

```txt
https://github.com/martinjokub/infinity-agent-skills
```

## Setup

```powershell
cd D:\AI\infinity\mcp
npm install
npm run build
$env:INFINITY_API_TOKEN = "your-token"
npm start
```

Optional environment variables:

- `INFINITY_API_TOKEN`: required bearer token.
- `INFINITY_API_BASE_URL`: defaults to `https://app.startinfinity.com/api/v2`.
- `INFINITY_API_VERSION`: defaults to `2026-04-20.morava`.
- `TRANSPORT`: `stdio` by default, or `http`.
- `PORT`: HTTP port, defaults to `3000`.

## Docker Compose

The existing compose stack at `D:\AI\Docker\docker-compose.yml` includes this service as `infinity-mcp`.

```powershell
cd D:\AI\Docker
docker compose up -d --build infinity-mcp
curl.exe http://127.0.0.1:3015/health
```

HTTP MCP endpoint:

```txt
http://127.0.0.1:3015/mcp
```

The host binding is local-only (`127.0.0.1`) so the MCP endpoint is available on this machine without being exposed publicly.

## Tools

- `infinity_get_profile`
- `infinity_list_workspaces`
- `infinity_list_workspace_members`
- `infinity_invite_workspace_member`
- `infinity_add_workspace_member`
- `infinity_remove_workspace_member`
- `infinity_list_boards`
- `infinity_get_board`
- `infinity_create_board`
- `infinity_list_folders`
- `infinity_get_folder`
- `infinity_create_folder`
- `infinity_update_folder`
- `infinity_archive_folder`
- `infinity_list_attributes`
- `infinity_get_attribute`
- `infinity_create_attribute`
- `infinity_update_attribute`
- `infinity_delete_attribute`
- `infinity_list_items`
- `infinity_get_item`
- `infinity_create_item`
- `infinity_update_item`
- `infinity_archive_item`
- `infinity_list_subitems`
- `infinity_create_subitem`

## Agent Workflow

For item creation or updates, agents should usually:

1. List workspaces.
2. List boards in the selected workspace.
3. List folders in the selected board.
4. List attributes for the board.
5. Use attribute IDs in `values`.

The item tools accept `values` as an object keyed by attribute ID:

```json
{
  "workspace_id": "52593",
  "board_id": "qSV7FQJcEcw",
  "folder_id": "PssjTc4Yb1b",
  "values": {
    "8b935736-943f-458a-a511-80fe04bd8911": "Task name",
    "40c82ac2-fe83-4dda-88a3-461ee4d945f7": true
  }
}
```

The server automatically converts that object into Infinity's `values: [{ attribute_id, data }]` API shape.
