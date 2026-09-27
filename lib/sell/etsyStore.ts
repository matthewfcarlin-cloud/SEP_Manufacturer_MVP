import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { decryptKey, encryptKey } from "../ai/keyCrypto";
import { dataRoot } from "../projectStore";

// A creator's Etsy connection, one per workspace (browser), in
// .data/stores/etsy/<workspaceId>.json. The OAuth tokens are sealed with the
// same AES-256-GCM secret as AI keys, under their own purpose, and only
// lib/sell/etsyClient.ts reads them.

const WORKSPACE_ID = /^[0-9a-f]{64}$/;

const sealedSchema = z.object({ ciphertext: z.string(), iv: z.string(), authTag: z.string() });
const storedSchema = z.object({
  v: z.literal(1),
  tokens: sealedSchema,
  userId: z.string(),
  shopId: z.number().int().positive(),
  shopName: z.string(),
  connectedAt: z.string(),
});

export type EtsyTokens = { accessToken: string; refreshToken: string; expiresAt: number };
export type EtsyConnection = { userId: string; shopId: number; shopName: string; connectedAt: string };

function connectionFile(workspaceId: string): string {
  if (!WORKSPACE_ID.test(workspaceId)) throw new Error("Invalid workspace id");
  return path.join(dataRoot(), "stores", "etsy", `${workspaceId}.json`);
}

async function readStored(workspaceId: string) {
  try {
    return storedSchema.parse(JSON.parse(await readFile(connectionFile(workspaceId), "utf8")));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function saveEtsyConnection(workspaceId: string, connection: EtsyConnection, tokens: EtsyTokens): Promise<void> {
  const file = connectionFile(workspaceId);
  const stored = { v: 1 as const, tokens: encryptKey(JSON.stringify(tokens), workspaceId, "moko-store-token:v1:etsy"), ...connection };
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(stored), { mode: 0o600 });
  await rename(tmp, file);
}

/** The shop this browser connected, for display. Never the tokens. */
export async function getEtsyConnection(workspaceId: string): Promise<EtsyConnection | null> {
  const stored = await readStored(workspaceId);
  return stored && { userId: stored.userId, shopId: stored.shopId, shopName: stored.shopName, connectedAt: stored.connectedAt };
}

/** The connection with its tokens, or null. A connection that can't be decrypted any more counts as none. */
export async function readEtsyTokens(workspaceId: string): Promise<(EtsyConnection & { tokens: EtsyTokens }) | null> {
  const stored = await readStored(workspaceId);
  if (!stored) return null;
  try {
    const tokens = JSON.parse(decryptKey(stored.tokens, workspaceId, "moko-store-token:v1:etsy")) as EtsyTokens;
    return { userId: stored.userId, shopId: stored.shopId, shopName: stored.shopName, connectedAt: stored.connectedAt, tokens };
  } catch {
    return null;
  }
}

/** Forgets the connection. False if there was none. (Revoking the app's access is done on Etsy.) */
export async function deleteEtsyConnection(workspaceId: string): Promise<boolean> {
  try {
    await rm(connectionFile(workspaceId));
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}
