import { randomBytes } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { deleteWorkspaceKey, getKeyInfo, readWorkspaceKey, saveWorkspaceKey, UnreadableKeyError } from "./keyStore";

const API_KEY = "sk-ant-api03-STOREKEY-abcdefghijklmnopqrstuvwxyz7Q2f";
const WS = "c".repeat(64);

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "idlefit-keys-"));
  process.env.IDLEFIT_DATA_DIR = dir;
  process.env.KEY_ENCRYPTION_SECRET = randomBytes(32).toString("base64");
});
afterAll(async () => {
  delete process.env.IDLEFIT_DATA_DIR;
  delete process.env.KEY_ENCRYPTION_SECRET;
  await rm(dir, { recursive: true, force: true });
});

describe("workspace key store", () => {
  test("a workspace with no key has none", async () => {
    expect(await getKeyInfo("d".repeat(64))).toBeNull();
    expect(await readWorkspaceKey("d".repeat(64))).toBeNull();
  });

  test("saves a key encrypted, shows it masked, and reads it back for the gateway", async () => {
    const info = await saveWorkspaceKey(WS, API_KEY);
    expect(info).toEqual({ provider: "anthropic", maskedKey: "sk-ant-…7Q2f", createdAt: expect.any(String) });
    expect(await getKeyInfo(WS)).toEqual(info);
    expect(await readWorkspaceKey(WS)).toEqual({ provider: "anthropic", apiKey: API_KEY });
  });

  test("the file on disk holds no part of the key beyond its last four characters, and only the owner can read it", async () => {
    await saveWorkspaceKey(WS, API_KEY);
    const files = await readdir(path.join(dir, "keys"));
    expect(files).toEqual([`${WS}.json`]);
    const file = path.join(dir, "keys", files[0]);
    const raw = await readFile(file, "utf8");
    expect(raw).not.toContain("STOREKEY");
    expect(raw).not.toContain("sk-ant-api03");
    expect(JSON.parse(raw)).toMatchObject({ provider: "anthropic", last4: "7Q2f", ciphertext: expect.any(String), iv: expect.any(String), authTag: expect.any(String) });
    expect((await stat(file)).mode & 0o777).toBe(0o600);
  });

  test("a key that can't be decrypted any more is reported as unreadable, without its contents", async () => {
    await saveWorkspaceKey(WS, API_KEY);
    const original = process.env.KEY_ENCRYPTION_SECRET;
    process.env.KEY_ENCRYPTION_SECRET = randomBytes(32).toString("base64");
    const err = await readWorkspaceKey(WS).catch((e: unknown) => e);
    process.env.KEY_ENCRYPTION_SECRET = original;
    expect(err).toBeInstanceOf(UnreadableKeyError);
    expect(String(err)).not.toContain("STOREKEY");
  });

  test("deleting removes the file; deleting again reports nothing to remove", async () => {
    await saveWorkspaceKey(WS, API_KEY);
    expect(await deleteWorkspaceKey(WS)).toBe(true);
    expect(await getKeyInfo(WS)).toBeNull();
    expect(await deleteWorkspaceKey(WS)).toBe(false);
  });

  test("rejects a workspace id that isn't a hash, so it can't escape the keys folder", async () => {
    await expect(saveWorkspaceKey("../../etc", API_KEY)).rejects.toThrow();
    await expect(getKeyInfo("../x")).rejects.toThrow();
  });
});
