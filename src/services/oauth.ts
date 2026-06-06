import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Request, Response } from "express";
import type { InfinityScope } from "./auth.js";

type OAuthClient = {
  client_id: string;
  client_secret_hash: string;
  redirect_uris: string[];
  created_at: string;
};

type AuthorizationCode = {
  code: string;
  client_id: string;
  redirect_uri: string;
  scope: InfinityScope[];
  user_name: string;
  expires_at: number;
};

type AccessToken = {
  scope: InfinityScope[];
  user_name: string;
  expires_at: number;
};

type PersistedOAuthStore = {
  version: 1;
  access_tokens: Array<AccessToken & { token_hash: string; created_at?: string }>;
};

const codes = new Map<string, AuthorizationCode>();
const accessTokens = new Map<string, AccessToken>();
const CODE_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_SECONDS = 60 * 60 * 12;
const DEFAULT_SCOPES: InfinityScope[] = ["infinity:read", "infinity:write", "infinity:admin"];
let tokensLoaded = false;

export type OAuthTokenContext = {
  userName: string;
  scopes: InfinityScope[];
};

export function validateOAuthConfig(): void {
  if (!isOAuthEnabled()) return;

  const missing = [
    ["OAUTH_PUBLIC_URL", getPublicUrl()],
    ["OAUTH_CLIENT_ID", process.env.OAUTH_CLIENT_ID],
    ["OAUTH_CLIENT_SECRET", process.env.OAUTH_CLIENT_SECRET],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    console.error(`ERROR: OAuth is enabled but missing ${missing.map(([key]) => key).join(", ")}.`);
    process.exit(1);
  }
}

export function registerOAuthRoutes(app: { get: Function; post: Function }): void {
  app.get("/.well-known/oauth-protected-resource", protectedResourceMetadata);
  app.get("/.well-known/oauth-protected-resource/mcp", protectedResourceMetadata);
  app.get("/.well-known/oauth-authorization-server", authorizationServerMetadata);
  app.get("/oauth/authorize", authorize);
  app.post("/oauth/token", token);
}

export function getOAuthWwwAuthenticateHeader(): string | null {
  if (!isOAuthEnabled()) return null;

  return [
    "Bearer",
    'error="invalid_token"',
    'error_description="Authentication required"',
    `resource_metadata="${getPublicUrl()}/.well-known/oauth-protected-resource"`,
    `scope="${DEFAULT_SCOPES.join(" ")}"`,
  ].join(" ");
}

export function validateOAuthAccessToken(token: string): OAuthTokenContext | null {
  if (!isOAuthEnabled()) return null;

  ensureAccessTokensLoaded();
  purgeExpired();
  const record = accessTokens.get(hashToken(token));
  if (!record || record.expires_at <= Date.now()) {
    return null;
  }

  return {
    userName: record.user_name,
    scopes: record.scope,
  };
}

function protectedResourceMetadata(_req: Request, res: Response): void {
  const publicUrl = getPublicUrl();
  res.json({
    resource: `${publicUrl}/mcp`,
    authorization_servers: [publicUrl],
    scopes_supported: DEFAULT_SCOPES,
    bearer_methods_supported: ["header"],
  });
}

function authorizationServerMetadata(_req: Request, res: Response): void {
  const publicUrl = getPublicUrl();
  res.json({
    issuer: publicUrl,
    authorization_endpoint: `${publicUrl}/oauth/authorize`,
    token_endpoint: `${publicUrl}/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    code_challenge_methods_supported: ["S256", "plain"],
    scopes_supported: DEFAULT_SCOPES,
  });
}

function authorize(req: Request, res: Response): void {
  const client = getConfiguredClient();
  const clientId = String(req.query.client_id ?? "");
  const redirectUri = String(req.query.redirect_uri ?? "");
  const responseType = String(req.query.response_type ?? "");
  const state = typeof req.query.state === "string" ? req.query.state : undefined;
  const scope = parseScopes(String(req.query.scope ?? DEFAULT_SCOPES.join(" ")));

  if (responseType !== "code") {
    redirectError(res, redirectUri, state, "unsupported_response_type");
    return;
  }

  if (clientId !== client.client_id || !isAllowedRedirectUri(redirectUri, client)) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  const code = `oauth_code_${randomBytes(32).toString("base64url")}`;
  codes.set(code, {
    code,
    client_id: client.client_id,
    redirect_uri: redirectUri,
    scope,
    user_name: process.env.OAUTH_MCP_USER || "codex",
    expires_at: Date.now() + CODE_TTL_MS,
  });

  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  res.redirect(url.toString());
}

function token(req: Request, res: Response): void {
  ensureAccessTokensLoaded();
  purgeExpired();
  const client = getConfiguredClient();
  const credentials = extractClientCredentials(req);
  const grantType = String(req.body?.grant_type ?? "");
  const code = String(req.body?.code ?? "");
  const redirectUri = String(req.body?.redirect_uri ?? "");

  if (grantType !== "authorization_code") {
    res.status(400).json({ error: "unsupported_grant_type" });
    return;
  }

  if (credentials.clientId !== client.client_id || !constantTimeEqual(credentials.clientSecret, process.env.OAUTH_CLIENT_SECRET || "")) {
    res.status(401).json({ error: "invalid_client" });
    return;
  }

  const authorizationCode = codes.get(code);
  if (!authorizationCode || authorizationCode.expires_at <= Date.now()) {
    res.status(400).json({ error: "invalid_grant" });
    return;
  }

  if (authorizationCode.client_id !== client.client_id || authorizationCode.redirect_uri !== redirectUri) {
    res.status(400).json({ error: "invalid_grant" });
    return;
  }

  codes.delete(code);
  const accessToken = `oauth_${randomBytes(32).toString("base64url")}`;
  accessTokens.set(hashToken(accessToken), {
    scope: authorizationCode.scope,
    user_name: authorizationCode.user_name,
    expires_at: Date.now() + TOKEN_TTL_SECONDS * 1000,
  });
  saveAccessTokens();

  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: TOKEN_TTL_SECONDS,
    scope: authorizationCode.scope.join(" "),
  });
}

function redirectError(res: Response, redirectUri: string, state: string | undefined, error: string): void {
  if (!redirectUri) {
    res.status(400).json({ error });
    return;
  }

  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  if (state) url.searchParams.set("state", state);
  res.redirect(url.toString());
}

function getConfiguredClient(): OAuthClient {
  return {
    client_id: process.env.OAUTH_CLIENT_ID || "",
    client_secret_hash: sha256(process.env.OAUTH_CLIENT_SECRET || ""),
    redirect_uris: getAllowedRedirectOrigins(),
    created_at: new Date(0).toISOString(),
  };
}

function extractClientCredentials(req: Request): { clientId: string; clientSecret: string } {
  const authorization = req.header("authorization") || "";
  const basic = /^Basic\s+(.+)$/i.exec(authorization);
  if (basic) {
    const decoded = Buffer.from(basic[1], "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator >= 0) {
      return {
        clientId: decoded.slice(0, separator),
        clientSecret: decoded.slice(separator + 1),
      };
    }
  }

  return {
    clientId: String(req.body?.client_id ?? ""),
    clientSecret: String(req.body?.client_secret ?? ""),
  };
}

function parseScopes(value: string): InfinityScope[] {
  const requested = value.split(/[,\s]+/).map((scope) => scope.trim()).filter(Boolean);
  const allowed = new Set(DEFAULT_SCOPES);
  const scopes = requested.filter((scope): scope is InfinityScope => allowed.has(scope as InfinityScope));
  return scopes.length > 0 ? scopes : DEFAULT_SCOPES;
}

function isAllowedRedirectUri(redirectUri: string, client: OAuthClient): boolean {
  try {
    const url = new URL(redirectUri);
    return client.redirect_uris.some((allowed) => {
      const allowedUrl = new URL(allowed);
      return url.protocol === allowedUrl.protocol && url.hostname === allowedUrl.hostname;
    });
  } catch {
    return false;
  }
}

function getAllowedRedirectOrigins(): string[] {
  return (process.env.OAUTH_ALLOWED_REDIRECT_ORIGINS || "https://chatgpt.com,https://chat.openai.com")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function purgeExpired(): void {
  const now = Date.now();
  let changed = false;
  for (const [code, record] of codes) {
    if (record.expires_at <= now) codes.delete(code);
  }
  for (const [token, record] of accessTokens) {
    if (record.expires_at <= now) {
      accessTokens.delete(token);
      changed = true;
    }
  }
  if (changed) saveAccessTokens();
}

function isOAuthEnabled(): boolean {
  return process.env.OAUTH_ENABLED === "true";
}

function getPublicUrl(): string {
  return (process.env.OAUTH_PUBLIC_URL || "").replace(/\/+$/, "");
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hashToken(token: string): string {
  return sha256(token);
}

function ensureAccessTokensLoaded(): void {
  if (tokensLoaded) return;
  tokensLoaded = true;

  const storeFile = getOAuthTokenStoreFile();
  if (!storeFile || !existsSync(storeFile)) return;

  const parsed = JSON.parse(readFileSync(storeFile, "utf8")) as PersistedOAuthStore;
  const now = Date.now();
  for (const record of parsed.access_tokens ?? []) {
    if (!record.token_hash || record.expires_at <= now) continue;
    accessTokens.set(record.token_hash, {
      scope: parseScopes(record.scope.join(" ")),
      user_name: record.user_name,
      expires_at: record.expires_at,
    });
  }
}

function saveAccessTokens(): void {
  const storeFile = getOAuthTokenStoreFile();
  if (!storeFile) return;

  const store: PersistedOAuthStore = {
    version: 1,
    access_tokens: Array.from(accessTokens.entries()).map(([token_hash, record]) => ({
      token_hash,
      scope: record.scope,
      user_name: record.user_name,
      expires_at: record.expires_at,
      created_at: new Date().toISOString(),
    })),
  };

  mkdirSync(dirname(storeFile), { recursive: true });
  const tempFile = `${storeFile}.tmp`;
  writeFileSync(tempFile, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  renameSync(tempFile, storeFile);
}

function getOAuthTokenStoreFile(): string {
  return process.env.OAUTH_TOKEN_STORE_FILE || "";
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftHash = Buffer.from(sha256(left), "hex");
  const rightHash = Buffer.from(sha256(right), "hex");
  return timingSafeEqual(leftHash, rightHash);
}
