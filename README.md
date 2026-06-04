# Infinity MCP Server

MCP server for agents that need to read and write StartInfinity data.

Reusable agent skills for this server live in the companion repository:

```txt
https://github.com/martinjokub/infinity-agent-skills
```

## What This Server Protects

There are two different secrets:

- **MCP API key**: lets an MCP client call this server.
- **Infinity token**: lets this server call Infinity.

Do not give Infinity tokens to MCP clients. In Docker or cloud mode, each MCP API key maps to an encrypted Infinity credential profile stored on the server.

If an Infinity token was placed in `.env`, Docker environment variables, chat messages, logs, screenshots, or any shared place, rotate it in Infinity after moving to the encrypted credential store.

## Local Private Stdio Mode

Use this only when the MCP server runs as a private subprocess on your own machine.

```powershell
cd path\to\infinity-mcp-server
npm install
npm run build
$env:INFINITY_API_TOKEN = "your-infinity-token"
npm start
```

Optional environment variables:

- `INFINITY_API_TOKEN`: required for stdio mode.
- `INFINITY_API_BASE_URL`: defaults to `https://app.startinfinity.com/api/v2`.
- `INFINITY_API_VERSION`: defaults to `2026-04-20.morava`.
- `TRANSPORT`: `stdio` by default, or `http`.
- `PORT`: HTTP port, defaults to `3000`.

## Local Docker Mode

This is the recommended setup for running a local HTTP MCP endpoint.

### 1. Create `.env`

```powershell
Copy-Item .env.example .env
```

### 2. Create the encrypted store

Run this once:

```powershell
npm run credentials:init
```

The command prints a generated `MCP_CREDENTIAL_STORE_KEY`. Put that value into `.env`.

### 3. Add your Infinity token to the encrypted store

Run this from the same terminal after setting the master key:

```powershell
$env:MCP_CREDENTIAL_STORE_KEY = "the-value-from-your-env-file"
npm run credentials:add-profile -- --id local --name "Local Infinity" --token "your-infinity-token"
```

The Infinity token is encrypted into `data/credentials.enc.json`.

### 4. Create an MCP API key

```powershell
npm run credentials:add-user -- --name local-client --profile local --scopes infinity:read,infinity:write,infinity:admin
```

The command prints the MCP API key once. Your MCP client uses it like this:

```txt
Authorization: Bearer your-mcp-api-key
```

The plaintext MCP API key is not stored by the server. Only its hash is stored in `config/mcp-users.json`.

### 5. Start Docker

```powershell
docker compose up -d --build
```

Default local endpoint:

```txt
http://127.0.0.1:3015/mcp
```

The example Docker port is bound to `127.0.0.1`, so it is only available from this machine.

## Cloud Docker Mode

For cloud Docker, use the same encrypted store and MCP API keys, plus normal cloud security:

- Put the service behind HTTPS.
- Do not publish the container directly to the public internet without a reverse proxy or firewall.
- Use separate MCP API keys per user or automation.
- Use separate Infinity credential profiles per user or automation.
- Give read-only users only `infinity:read`.
- Rotate MCP API keys when a client is removed.
- Rotate Infinity tokens if they were ever exposed outside the encrypted store.

In cloud mode, do not set `INFINITY_API_TOKEN` in Docker environment variables. Store Infinity tokens only through `credentials:add-profile`.

## Credential Commands

```powershell
npm run credentials:init
npm run credentials:add-profile -- --id local --name "Local Infinity" --token "your-infinity-token"
npm run credentials:add-user -- --name local-client --profile local --scopes infinity:read,infinity:write,infinity:admin
npm run credentials:list
npm run credentials:rotate-user-key -- --name local-client
```

Scopes:

- `infinity:read`: list/get/profile tools.
- `infinity:write`: create/update tools.
- `infinity:admin`: archive/delete/member-management tools.

## Docker Compose

Copy `docker-compose.example.yml` into your own Docker Compose stack if needed.

```yaml
services:
  infinity-mcp:
    build:
      context: .
    container_name: infinity-mcp
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - TRANSPORT=http
      - PORT=3000
      - MCP_USERS_FILE=/app/config/mcp-users.json
      - MCP_CREDENTIAL_STORE_FILE=/app/data/credentials.enc.json
    ports:
      - "127.0.0.1:3015:3000"
    volumes:
      - ./config:/app/config:ro
      - ./data:/app/data
```

## Health Check

`/health` is public and intentionally does not require secrets:

```txt
http://127.0.0.1:3015/health
```

`/mcp` always requires an MCP API key in HTTP mode.

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
