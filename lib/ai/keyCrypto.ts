import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM for creators' API keys at rest. The server secret comes from
// KEY_ENCRYPTION_SECRET (32 random bytes, base64). The workspace id is bound
// in as associated data, so a sealed key only opens for its own workspace.

const ALGORITHM = "aes-256-gcm";
const SECRET_BYTES = 32;
const IV_BYTES = 12; // GCM's standard nonce size
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export type SealedKey = { ciphertext: string; iv: string; authTag: string }; // all base64

/** KEY_ENCRYPTION_SECRET is missing or malformed. The message never includes the value. */
export class KeyEncryptionConfigError extends Error {
  constructor(problem: string) {
    super(
      `KEY_ENCRYPTION_SECRET ${problem}. It must be 32 random bytes, base64-encoded. ` +
        "Generate one with `openssl rand -base64 32` and set it in .env.local (or the host's environment).",
    );
    this.name = "KeyEncryptionConfigError";
  }
}

/** The 32-byte key-encryption secret. Throws KeyEncryptionConfigError if it's absent or wrong. */
export function encryptionSecret(): Buffer {
  const raw = process.env.KEY_ENCRYPTION_SECRET?.trim();
  if (!raw) throw new KeyEncryptionConfigError("is not set");
  if (!BASE64.test(raw)) throw new KeyEncryptionConfigError("is not valid base64");
  const secret = Buffer.from(raw, "base64");
  if (secret.length !== SECRET_BYTES) throw new KeyEncryptionConfigError(`decodes to ${secret.length} bytes, not 32 bytes`);
  return secret;
}

/** Keeps AI keys and other sealed secrets (store tokens) from opening as each other. */
export type SealPurpose = "idlefit-ai-key:v1" | "moko-store-token:v1:etsy";

const associatedData = (workspaceId: string, purpose: SealPurpose) => Buffer.from(`${purpose}:${workspaceId}`);

export function encryptKey(apiKey: string, workspaceId: string, purpose: SealPurpose = "idlefit-ai-key:v1"): SealedKey {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionSecret(), iv);
  cipher.setAAD(associatedData(workspaceId, purpose));
  const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64") };
}

/** Opens a sealed key. Throws if the secret, workspace, ciphertext or tag don't match. */
export function decryptKey(sealed: SealedKey, workspaceId: string, purpose: SealPurpose = "idlefit-ai-key:v1"): string {
  const decipher = createDecipheriv(ALGORITHM, encryptionSecret(), Buffer.from(sealed.iv, "base64"));
  decipher.setAAD(associatedData(workspaceId, purpose));
  decipher.setAuthTag(Buffer.from(sealed.authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(sealed.ciphertext, "base64")), decipher.final()]).toString("utf8");
}
