#!/usr/bin/env node
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const command = process.argv[2];
const args = parseArgs(process.argv.slice(3));

const storeFile = process.env.MCP_CREDENTIAL_STORE_FILE || args.store || "./data/credentials.enc.json";
const usersFile = process.env.MCP_USERS_FILE || args.users || "./config/mcp-users.json";
const masterKey = process.env.MCP_CREDENTIAL_STORE_KEY || args.key;

try {
  switch (command) {
    case "init":
      init();
      break;
    case "add-profile":
      addProfile();
      break;
    case "add-user":
      addUser();
      break;
    case "list":
      list();
      break;
    case "rotate-user-key":
      rotateUserKey();
      break;
    default:
      help();
      process.exit(command ? 1 : 0);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function init() {
  const generatedKey = masterKey || randomBytes(32).toString("base64url");
  ensureParent(storeFile);
  ensureParent(usersFile);

  if (!existsSync(storeFile)) {
    saveStore({ version: 1, profiles: [] }, generatedKey);
    console.log(`Created encrypted credential store: ${storeFile}`);
  } else {
    console.log(`Credential store already exists: ${storeFile}`);
  }

  if (!existsSync(usersFile)) {
    writeJson(usersFile, { version: 1, users: [] });
    console.log(`Created MCP users file: ${usersFile}`);
  } else {
    console.log(`MCP users file already exists: ${usersFile}`);
  }

  if (!masterKey) {
    console.log("");
    console.log("Add this value to your local .env as MCP_CREDENTIAL_STORE_KEY:");
    console.log(generatedKey);
  }
}

function addProfile() {
  requireMasterKey();
  const id = requiredArg("id");
  const name = args.name || id;
  const token = args.token || process.env.INFINITY_API_TOKEN;
  if (!token) {
    throw new Error("Provide --token or set INFINITY_API_TOKEN for this command only.");
  }

  const store = loadStore(masterKey);
  const now = new Date().toISOString();
  const existing = store.profiles.find((profile) => profile.id === id);
  if (existing) {
    existing.name = name;
    existing.infinity_token = token;
    existing.scopes = parseScopes(args.scopes || "infinity:read,infinity:write,infinity:admin");
    existing.updated_at = now;
  } else {
    store.profiles.push({
      id,
      name,
      infinity_token: token,
      scopes: parseScopes(args.scopes || "infinity:read,infinity:write,infinity:admin"),
      created_at: now,
      updated_at: now,
    });
  }

  saveStore(store, masterKey);
  console.log(`Saved credential profile "${id}" (${name}).`);
}

function addUser() {
  const name = requiredArg("name");
  const profileId = requiredArg("profile");
  const scopes = parseScopes(args.scopes || "infinity:read");
  const apiKey = args.apiKey || `mcp_${randomBytes(32).toString("base64url")}`;
  const config = loadUsers();
  const now = new Date().toISOString();

  config.users = (config.users || []).filter((user) => user.name !== name);
  config.users.push({
    name,
    key_hash: hashApiKey(apiKey),
    profile_id: profileId,
    scopes,
    created_at: now,
    updated_at: now,
  });

  writeJson(usersFile, config);
  console.log(`Created MCP API key for "${name}".`);
  console.log("Plaintext key, shown once:");
  console.log(apiKey);
}

function list() {
  requireMasterKey();
  const store = existsSync(storeFile) ? loadStore(masterKey) : { profiles: [] };
  const users = existsSync(usersFile) ? loadUsers().users || [] : [];

  console.log("Credential profiles:");
  for (const profile of store.profiles) {
    console.log(`- ${profile.id} (${profile.name}) scopes=${profile.scopes.join(",")}`);
  }

  console.log("");
  console.log("MCP users:");
  for (const user of users) {
    console.log(`- ${user.name} profile=${user.profile_id} scopes=${user.scopes.join(",")}`);
  }
}

function rotateUserKey() {
  const name = requiredArg("name");
  const config = loadUsers();
  const user = (config.users || []).find((candidate) => candidate.name === name);
  if (!user) {
    throw new Error(`MCP user not found: ${name}`);
  }

  const apiKey = `mcp_${randomBytes(32).toString("base64url")}`;
  user.key_hash = hashApiKey(apiKey);
  user.updated_at = new Date().toISOString();
  writeJson(usersFile, config);
  console.log(`Rotated MCP API key for "${name}".`);
  console.log("Plaintext key, shown once:");
  console.log(apiKey);
}

function loadStore(key) {
  const encrypted = JSON.parse(readFileSync(storeFile, "utf8"));
  const decipher = createDecipheriv(encrypted.algorithm, deriveKey(key), Buffer.from(encrypted.nonce, "base64url"));
  decipher.setAuthTag(Buffer.from(encrypted.tag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext);
}

function saveStore(payload, key) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(key), nonce);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload, null, 2), "utf8"), cipher.final()]);
  writeJson(storeFile, {
    version: 1,
    algorithm: "aes-256-gcm",
    nonce: nonce.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  });
}

function loadUsers() {
  if (!existsSync(usersFile)) {
    return { version: 1, users: [] };
  }
  return JSON.parse(readFileSync(usersFile, "utf8"));
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      continue;
    }
    const key = value.slice(2);
    parsed[key] = values[index + 1];
    index += 1;
  }
  return parsed;
}

function parseScopes(value) {
  return value.split(",").map((scope) => scope.trim()).filter(Boolean);
}

function requiredArg(name) {
  const value = args[name];
  if (!value) {
    throw new Error(`Missing required argument --${name}.`);
  }
  return value;
}

function requireMasterKey() {
  if (!masterKey) {
    throw new Error("Set MCP_CREDENTIAL_STORE_KEY or pass --key.");
  }
}

function deriveKey(secret) {
  return createHash("sha256").update(secret, "utf8").digest();
}

function hashApiKey(apiKey) {
  return createHash("sha256").update(apiKey, "utf8").digest("hex");
}

function ensureParent(file) {
  mkdirSync(dirname(file), { recursive: true });
}

function writeJson(file, value) {
  ensureParent(file);
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function help() {
  console.log(`Usage:
  npm run credentials:init
  npm run credentials:add-profile -- --id local --name "Local Infinity" --token <infinity-token>
  npm run credentials:add-user -- --name local-client --profile local --scopes infinity:read,infinity:write,infinity:admin
  npm run credentials:list
  npm run credentials:rotate-user-key -- --name local-client`);
}
