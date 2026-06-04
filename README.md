# Infinity MCP Server

MCP server for agents that need to read and write StartInfinity data.

Current version: `0.1.5`

Changelog:

```txt
CHANGELOG.md
```

Skill repository for agents:

```txt
https://github.com/martinjokub/infinity-agent-skills.git
```

Server repository:

```txt
https://github.com/martinjokub/infinity-mcp-server.git
```

## Easiest Setup: Ask An Agent To Install It

Use this when you want Codex or another agent to install Infinity MCP on a cloud server that runs Docker.

The agent should run setup commands on the cloud server, outside Docker. Docker only runs the finished MCP server.

Copy this prompt and fill in the placeholders:

```txt
First, get and use the Infinity MCP skill from:

https://github.com/martinjokub/infinity-agent-skills.git

Then connect to my cloud server over SSH:

<MY_SERVER_SSH_URL_OR_HOST>

Install Infinity MCP from this GitHub repo:

https://github.com/martinjokub/infinity-mcp-server.git

Install it in this folder on the server:

<MY_CHOSEN_FOLDER>

Use this Infinity token only during setup:

<MY_INFINITY_TOKEN>

Create one MCP user:

name: codex
access: admin

Run the MCP server with Docker Compose.

Do not expose my Infinity token in Docker environment variables.
Store the Infinity token in the encrypted credential store.

After setup, test:

1. /health works
2. /mcp fails without Authorization
3. /mcp works with Authorization: Bearer <generated MCP API key>
4. infinity_get_profile works

Then configure Codex/my MCP client to use this MCP server:

name: infinity
transport: streamable HTTP
url: <MY_MCP_URL>
authorization header: Bearer <generated MCP API key>

At the end, tell me:

1. the install folder
2. the GitHub repo and commit used
3. the Docker Compose service added
4. the files created
5. the MCP URL
6. the MCP API key or the file path where it was saved
7. proof that the tests passed
8. where Codex/MCP client config was updated
```

## What The Placeholders Mean

`<MY_SERVER_SSH_URL_OR_HOST>` is your cloud server SSH target. Examples:

```txt
root@example.com
ubuntu@203.0.113.10
```

`<MY_CHOSEN_FOLDER>` is where you want the files to live on the cloud server. You control this path. Examples:

```txt
/root/docker/infinity-mcp
/opt/infinity-mcp
/srv/infinity-mcp
/home/myuser/docker/infinity-mcp
```

`<MY_INFINITY_TOKEN>` is your StartInfinity developer token. Create one here:

```txt
https://app.startinfinity.com/profile/developer/tokens
```

`name: codex` is just the MCP client/user name. It can be anything:

```txt
codex
chatgpt
my-agent
automation
```

`access` controls what that MCP user can do:

```txt
read-only  = can view Infinity data
read-write = can view, create, and update data
admin      = can also archive/delete and manage workspace members
```

For your own trusted Codex agent, `admin` is usually fine. For shared users, start with `read-only` or `read-write`.

`<MY_MCP_URL>` is the URL your MCP client will call. For cloud use, prefer HTTPS through your reverse proxy:

```txt
https://my-domain.com/mcp
```

## What The Agent Will Create

On the Docker host, the install folder will contain files like:

```txt
docker-compose.yml
.env
config/mcp-users.json
data/credentials.enc.json
config/codex-mcp-key.txt
```

Keep these private:

```txt
.env
data/credentials.enc.json
config/*-mcp-key.txt
```

The Infinity token is stored in `data/credentials.enc.json`, encrypted. The MCP API key is what Codex uses. They are different secrets.

## Docker Compose Shape

The service should look like this, adjusted to your folder and reverse proxy setup:

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

The `127.0.0.1` port binding means the container is reachable only from the server itself. Your HTTPS reverse proxy can then expose it safely as `https://your-domain.com/mcp`.

## What This Server Protects

There are two different secrets:

- **MCP API key**: lets an MCP client call this server.
- **Infinity token**: lets this server call Infinity.

Do not give Infinity tokens to MCP clients. In Docker or cloud mode, each MCP API key maps to an encrypted Infinity credential profile stored on the server.

If an Infinity token was placed in `.env`, Docker environment variables, chat messages, logs, screenshots, or any shared place, rotate it in Infinity after moving to the encrypted credential store.

## Manual Local Stdio Mode

Use this only when the MCP server runs as a private subprocess on your own machine.

```powershell
cd path\to\infinity-mcp-server
npm install
npm run build
$env:INFINITY_API_TOKEN = "your-infinity-token"
npm start
```

## Manual Credential Commands

These commands are for advanced/manual setup. Run them on the Docker host, outside Docker, in the MCP server folder.

```powershell
npm run credentials:init
npm run credentials:add-profile -- --id local --name "Local Infinity" --token "your-infinity-token"
npm run credentials:add-user -- --name codex --profile local --scopes infinity:read,infinity:write,infinity:admin
npm run credentials:list
npm run credentials:rotate-user-key -- --name codex
```

Scopes:

- `infinity:read`: list/get/profile tools.
- `infinity:write`: create/update tools.
- `infinity:admin`: archive/delete/member-management tools.

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
