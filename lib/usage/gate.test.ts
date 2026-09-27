import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { saveWorkspaceKey } from "../ai/keyStore";
import { recordSpend } from "./budget";

const ownerHash = vi.hoisted(() => ({ value: "f".repeat(64) }));
vi.mock("@/lib/access", () => ({ currentOwnerHash: async () => ownerHash.value }));
vi.mock("../access", () => ({ currentOwnerHash: async () => ownerHash.value }));

const { aiBudgetGate } = await import("./gate");

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "idlefit-gate-"));
  process.env.IDLEFIT_DATA_DIR = dir;
  process.env.KEY_ENCRYPTION_SECRET = randomBytes(32).toString("base64");
  process.env.IDLEFIT_BROWSER_BUDGET_USD = "1";
});
afterAll(async () => {
  delete process.env.IDLEFIT_DATA_DIR;
  delete process.env.KEY_ENCRYPTION_SECRET;
  delete process.env.IDLEFIT_BROWSER_BUDGET_USD;
  await rm(dir, { recursive: true, force: true });
});

describe("aiBudgetGate", () => {
  test("a browser that spent its demo budget gets budget_exhausted, pointing at Settings", async () => {
    ownerHash.value = "1".repeat(64);
    await recordSpend(ownerHash.value, 0.99);
    const res = await aiBudgetGate("analysis");
    expect(res).toBeInstanceOf(Response);
    const body = await (res as Response).json();
    expect((res as Response).status).toBe(429);
    expect(body).toMatchObject({ success: false, code: "budget_exhausted", error: expect.stringMatching(/your own .*key/i) });
  });

  test("a browser with its own key skips the demo budget", async () => {
    ownerHash.value = "2".repeat(64);
    await recordSpend(ownerHash.value, 5);
    await saveWorkspaceKey(ownerHash.value, "sk-ant-api03-GATEKEY-abcdefghijklmnopqrstuvwxyz");
    expect(await aiBudgetGate("analysis")).toBe(ownerHash.value);
  });
});
