#!/usr/bin/env node
import express, { type Request, type Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerAttributeTools } from "./tools/attributes.js";
import { registerAttachmentTools } from "./tools/attachments.js";
import { registerBoardTools } from "./tools/boards.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerFolderTools } from "./tools/folders.js";
import { registerHookTools } from "./tools/hooks.js";
import { registerItemTools } from "./tools/items.js";
import { registerProfileTools } from "./tools/profile.js";
import { registerReferenceTools } from "./tools/references.js";
import { registerTimeTrackingTools } from "./tools/timeTracking.js";
import { registerValueTools } from "./tools/values.js";
import { registerViewTools } from "./tools/views.js";
import { registerWorkspaceTools } from "./tools/workspaces.js";
import { authenticateBearerToken, getAuthContext, runWithAuthContext, validateHttpSecurityConfig } from "./services/auth.js";
import { getOAuthWwwAuthenticateHeader, registerOAuthRoutes, validateOAuthConfig } from "./services/oauth.js";

function createServer(): McpServer {
  const server = new McpServer({
    name: "infinity-mcp-server",
    version: "0.2.0",
  });
  const toolServer = createToolRegistrationServer(server);

  registerProfileTools(toolServer);
  registerWorkspaceTools(toolServer);
  registerBoardTools(toolServer);
  registerFolderTools(toolServer);
  registerAttributeTools(toolServer);
  registerItemTools(toolServer);
  registerCommentTools(toolServer);
  registerValueTools(toolServer);
  registerAttachmentTools(toolServer);
  registerViewTools(toolServer);
  registerReferenceTools(toolServer);
  registerHookTools(toolServer);
  registerTimeTrackingTools(toolServer);

  return server;
}

function createToolRegistrationServer(server: McpServer): McpServer {
  const allowedTools = getAllowedToolsForCurrentContext();
  if (!allowedTools) return server;

  return new Proxy(server, {
    get(target, property, receiver) {
      if (property !== "registerTool") {
        return Reflect.get(target, property, receiver);
      }

      return (name: string, ...args: unknown[]) => {
        if (!allowedTools.has(name)) {
          return undefined;
        }
        return (target.registerTool as unknown as Function).call(target, name, ...args);
      };
    },
  }) as McpServer;
}

function getAllowedToolsForCurrentContext(): Set<string> | null {
  const context = getAuthContext();
  if (context?.authMethod !== "oauth") return null;

  const configured = (process.env.OAUTH_ALLOWED_TOOLS || "").trim();
  if (["*", "all", "full"].includes(configured.toLowerCase())) return null;

  const toolNames = configured.split(",").map((tool) => tool.trim()).filter(Boolean);
  return toolNames.length > 0 ? new Set(toolNames) : null;
}

async function runStdio(): Promise<void> {
  validateToken();
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Infinity MCP server running via stdio.");
}

async function runHttp(): Promise<void> {
  validateHttpSecurityConfig();
  validateOAuthConfig();
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: false }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "infinity-mcp-server" });
  });

  registerOAuthRoutes(app);

  app.post("/mcp", async (req, res) => {
    const authContext = authorizeMcpRequest(req, res);
    if (!authContext) {
      return;
    }

    logMcpRequest(req.body, authContext.authMethod);

    await runWithAuthContext(authContext, async () => {
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      res.on("close", () => {
        transport.close().catch((error: unknown) => {
          console.error("Failed to close MCP transport", error);
        });
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });
  });

  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  app.listen(port, "0.0.0.0", () => {
    console.error(`Infinity MCP server running at http://0.0.0.0:${port}/mcp`);
  });
}

function validateToken(): void {
  if (!process.env.INFINITY_API_TOKEN) {
    console.error("ERROR: INFINITY_API_TOKEN environment variable is required.");
    process.exit(1);
  }
}

function authorizeMcpRequest(req: Request, res: Response): ReturnType<typeof authenticateBearerToken> {
  try {
    const authContext = authenticateBearerToken(req.header("authorization"));
    if (authContext) {
      return authContext;
    }
  } catch (error) {
    console.error("MCP authentication failed:", error instanceof Error ? error.message : String(error));
  }

  const authenticateHeader = getOAuthWwwAuthenticateHeader();
  if (authenticateHeader) {
    res.setHeader("WWW-Authenticate", authenticateHeader);
  }
  res.status(401).json({ error: "Unauthorized" });
  return null;
}

function logMcpRequest(body: unknown, authMethod: string): void {
  const requests = Array.isArray(body) ? body : [body];

  for (const request of requests) {
    if (!isRecord(request)) continue;
    const method = typeof request.method === "string" ? request.method : "unknown";
    const id = typeof request.id === "string" || typeof request.id === "number" ? request.id : "none";
    const params = isRecord(request.params) ? request.params : {};
    const toolName = typeof params.name === "string" ? params.name : "";
    const toolSuffix = toolName ? ` tool=${toolName}` : "";
    console.error(`[mcp] auth=${authMethod} method=${method}${toolSuffix} id=${id}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const transport = process.env.TRANSPORT ?? "stdio";

if (transport === "http") {
  runHttp().catch((error: unknown) => {
    console.error("Infinity MCP server failed:", error);
    process.exit(1);
  });
} else {
  runStdio().catch((error: unknown) => {
    console.error("Infinity MCP server failed:", error);
    process.exit(1);
  });
}
