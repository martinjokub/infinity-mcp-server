import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { InfinityClient } from "./infinityClient.js";
import { loadCredentialStore } from "./credentialStore.js";

export type InfinityScope = "infinity:read" | "infinity:write" | "infinity:admin";

export type AuthContext = {
  callerName: string;
  profileId: string;
  scopes: InfinityScope[];
  infinityToken: string;
};

type UserConfig = {
  version: number;
  users: UserRecord[];
};

type UserRecord = {
  name: string;
  key_hash: string;
  profile_id: string;
  scopes: InfinityScope[];
  created_at?: string;
  updated_at?: string;
};

const authStorage = new AsyncLocalStorage<AuthContext>();

export function runWithAuthContext<T>(context: AuthContext, callback: () => T): T {
  return authStorage.run(context, callback);
}

export function getInfinityClient(requiredScope: InfinityScope): InfinityClient {
  const context = authStorage.getStore();
  if (!context) {
    if (process.env.TRANSPORT === "http") {
      throw new Error("MCP request is missing authentication context.");
    }
    return new InfinityClient();
  }

  requireScope(context, requiredScope);
  return new InfinityClient({ token: context.infinityToken });
}

export function authenticateBearerToken(authorizationHeader: string | undefined): AuthContext | null {
  const token = parseBearerToken(authorizationHeader);
  if (!token) {
    return null;
  }

  const user = findUserByApiKey(token);
  if (!user) {
    return null;
  }

  const store = loadCredentialStore();
  const profile = store.profiles.find((candidate) => candidate.id === user.profile_id);
  if (!profile) {
    throw new Error(`MCP user "${user.name}" references missing credential profile "${user.profile_id}".`);
  }

  return {
    callerName: user.name,
    profileId: user.profile_id,
    scopes: user.scopes,
    infinityToken: profile.infinity_token,
  };
}

export function validateHttpSecurityConfig(): void {
  const usersFile = process.env.MCP_USERS_FILE;
  const storeFile = process.env.MCP_CREDENTIAL_STORE_FILE;
  const storeKey = process.env.MCP_CREDENTIAL_STORE_KEY;

  if (!usersFile || !storeFile || !storeKey) {
    console.error("ERROR: HTTP mode requires MCP_USERS_FILE, MCP_CREDENTIAL_STORE_FILE, and MCP_CREDENTIAL_STORE_KEY.");
    process.exit(1);
  }
}

export function generateApiKey(): string {
  return `mcp_${randomBytes(32).toString("base64url")}`;
}

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey, "utf8").digest("hex");
}

function requireScope(context: AuthContext, requiredScope: InfinityScope): void {
  if (context.scopes.includes(requiredScope)) {
    return;
  }

  throw new Error(`MCP caller "${context.callerName}" is missing required scope "${requiredScope}".`);
}

function parseBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  return match?.[1] ?? null;
}

function findUserByApiKey(apiKey: string): UserRecord | null {
  const usersFile = process.env.MCP_USERS_FILE;
  if (!usersFile) {
    throw new Error("MCP_USERS_FILE is required in HTTP mode.");
  }

  const config = JSON.parse(readFileSync(usersFile, "utf8")) as UserConfig;
  const apiKeyHash = hashApiKey(apiKey);
  for (const user of config.users ?? []) {
    if (constantTimeEqualHex(apiKeyHash, user.key_hash)) {
      return user;
    }
  }

  return null;
}

function constantTimeEqualHex(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
