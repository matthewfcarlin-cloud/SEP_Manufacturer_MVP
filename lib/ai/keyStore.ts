import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { dataRoot } from "../projectStore";
import type { AiKeyInfo } from "../types";
import { decryptKey, encryptKey } from "./keyCrypto";

// Creators' own API keys, one per workspace, encrypted at rest in
// .data/keys/<workspaceId>.json. Only the gateway's provider factory reads
// the plaintext (readWorkspaceKey). Moves behind lib/db/ in A3.

const WORKSPACE_ID = /^[0-9a-f]{64}$/;
const MASK_PREFIX = "sk-ant-";

const storedKeySchema = z.object({
  v: z.literal(1),
  provider: z.literal("anthropic"),
  ciphertext: z.string(),
  iv: z.string(),
  authTag: z.string(),
  last4: z.string().length(4),
  createdAt: z.string(),
});
type StoredKey = z.infer<typeof storedKeySchema>;

/** A saved key exists but can't be decrypted (the server secret changed, or the file was altered). */
export class UnreadableKeyError extends Error {
  constructor() {
    super("The saved API key can't be decrypted.");
    this.name = "UnreadableKeyError";
  }
}

function keyFile(workspaceId: string): string {
  if (!WORKSPACE_ID.test(workspaceId)) throw new Error("Invalid workspace id");
  return path.join(dataRoot(), "keys", `${workspaceId}.json`);
}

const infoOf = (stored: StoredKey): AiKeyInfo => ({ provider: stored.provider, maskedKey: `${MASK_PREFIX}…${stored.last4}`, createdAt: stored.createdAt });

async function readStored(workspaceId: string): Promise<StoredKey | null> {
  try {
    return storedKeySchema.parse(JSON.parse(await readFile(keyFile(workspaceId), "utf8")));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/** Encrypts and saves the workspace's key, replacing any earlier one. Callers test the key first. */
export async function saveWorkspaceKey(workspaceId: string, apiKey: string): Promise<AiKeyInfo> {
  const file = keyFile(workspaceId);
  const stored: StoredKey = { v: 1, provider: "anthropic", ...encryptKey(apiKey, workspaceId), last4: apiKey.slice(-4), createdAt: new Date().toISOString() };
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(stored), { mode: 0o600 });
  await rename(tmp, file);
  return infoOf(stored);
}

/** The masked key for display, or null if the workspace has none. */
export async function getKeyInfo(workspaceId: string): Promise<AiKeyInfo | null> {
  const stored = await readStored(workspaceId);
  return stored ? infoOf(stored) : null;
}

/** The plaintext key, for the gateway only. Throws UnreadableKeyError if it can't be decrypted. */
export async function readWorkspaceKey(workspaceId: string): Promise<{ provider: "anthropic"; apiKey: string } | null> {
  const stored = await readStored(workspaceId);
  if (!stored) return null;
  try {
    return { provider: stored.provider, apiKey: decryptKey(stored, workspaceId) };
  } catch {
    throw new UnreadableKeyError();
  }
}

/** Removes the workspace's key (even an unreadable one). False if there was none. */
export async function deleteWorkspaceKey(workspaceId: string): Promise<boolean> {
  const file = keyFile(workspaceId);
  const existed = await access(file).then(
    () => true,
    () => false,
  );
  await rm(file, { force: true });
  return existed;
}
