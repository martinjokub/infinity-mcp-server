# Infinity MCP Server

MCP server for agents that need to read and write StartInfinity data.

Reusable agent skills for this server live in the companion repository:

```txt
https://github.com/martinjokub/infinity-agent-skills
```

## Setup

```powershell
cd path\to\infinity-mcp-server
npm install
npm run build
$env:INFINITY_API_TOKEN = "your-infinity-token"
npm start
```

Optional environment variables:

- `INFINITY_API_TOKEN`: required bearer token.
- `INFINITY_API_BASE_URL`: defaults to `https://app.startinfinity.com/api/v2`.
- `INFINITY_API_VERSION`: defaults to `2026-04-20.morava`.
- `TRANSPORT`: `stdio` by default, or `http`.
- `PORT`: HTTP port, defaults to `3000`.
- `MCP_AUTH_TOKEN`: optional bearer token required for HTTP `/mcp` requests when set.

## Local Configuration

Copy the example environment file and edit it for your own machine:

```powershell
Copy-Item .env.example .env
notepad .env
```

Do not commit `.env`. It contains your private Infinity API token.

## Docker

Build and run directly:

```powershell
docker build -t infinity-mcp-server .
docker run --rm --env-file .env -p 127.0.0.1:3015:3000 infinity-mcp-server
```

Or copy `docker-compose.example.yml` into your own Docker Compose stack and adjust the paths, port, and environment file for your setup.

Default local HTTP MCP endpoint when using the example port:

```txt
http://127.0.0.1:3015/mcp
```

The host binding is local-only (`127.0.0.1`) so the MCP endpoint is available on this machine without being exposed publicly.

## Security

Keep `.env` local and ignored. It contains the private Infinity token.

For local Docker use, bind the published port to `127.0.0.1` as shown above. For shared, remote, or reverse-proxied deployments, set `MCP_AUTH_TOKEN` and configure MCP clients to send:

```txt
Authorization: Bearer your-mcp-auth-token
```

The `/health` endpoint remains public so container health checks do not need secrets. The `/mcp` endpoint requires the bearer token only when `MCP_AUTH_TOKEN` is configured.

## Versioning

This project uses semver-compatible versions in the form `x.x.y`. Treat the final number as the change counter requested for the project: increment it by `+1` for each update or edit unless a higher-level version bump is explicitly requested.

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
