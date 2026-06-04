import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export type CredentialProfile = {
  id: string;
  name: string;
  infinity_token: string;
  scopes: string[];
  created_at: string;
  updated_at: string;
};

export type CredentialStorePayload = {
  version: number;
  profiles: CredentialProfile[];
};

type EncryptedCredentialStore = {
  version: number;
  algorithm: "aes-256-gcm";
  nonce: string;
  tag: string;
  ciphertext: string;
};

export function loadCredentialStore(): CredentialStorePayload {
  const storeFile = getCredentialStoreFile();
  if (!existsSync(storeFile)) {
    throw new Error(`Credential store not found at ${storeFile}. Run credentials:init and add a profile first.`);
  }

  const encrypted = JSON.parse(readFileSync(storeFile, "utf8")) as EncryptedCredentialStore;
  const decipher = createDecipheriv(
    encrypted.algorithm,
    deriveKey(getCredentialStoreKey()),
    Buffer.from(encrypted.nonce, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(plaintext) as CredentialStorePayload;
}

export function saveCredentialStore(payload: CredentialStorePayload): void {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(getCredentialStoreKey()), nonce);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload, null, 2), "utf8"), cipher.final()]);
  const encrypted: EncryptedCredentialStore = {
    version: 1,
    algorithm: "aes-256-gcm",
    nonce: nonce.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  };

  writeFileSync(getCredentialStoreFile(), `${JSON.stringify(encrypted, null, 2)}\n`, { mode: 0o600 });
}

function getCredentialStoreFile(): string {
  const storeFile = process.env.MCP_CREDENTIAL_STORE_FILE;
  if (!storeFile) {
    throw new Error("MCP_CREDENTIAL_STORE_FILE is required.");
  }

  return storeFile;
}

function getCredentialStoreKey(): string {
  const storeKey = process.env.MCP_CREDENTIAL_STORE_KEY;
  if (!storeKey) {
    throw new Error("MCP_CREDENTIAL_STORE_KEY is required.");
  }

  return storeKey;
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}
