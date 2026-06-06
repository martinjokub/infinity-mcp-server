#!/usr/bin/env node
import express, { type Request, type Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerAttributeTools } from "./tools/attributes.js";
import { registerBoardTools } from "./tools/boards.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerFolderTools } from "./tools/folders.js";
import { registerItemTools } from "./tools/items.js";
import { registerProfileTools } from "./tools/profile.js";
import { registerWorkspaceTools } from "./tools/workspaces.js";
import { authenticateBearerToken, runWithAuthContext, validateHttpSecurityConfig } from "./services/auth.js";
import { getOAuthWwwAuthenticateHeader, registerOAuthRoutes, validateOAuthConfig } from "./services/oauth.js";

function createServer(): McpServer {
  const server = new McpServer({
    name: "infinity-mcp-server",
    version: "0.1.8",
  });

  registerProfileTools(server);
  registerWorkspaceTools(server);
  registerBoardTools(server);
  registerFolderTools(server);
  registerAttributeTools(server);
  registerItemTools(server);
  registerCommentTools(server);

  return server;
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
