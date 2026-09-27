import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { UsageRecord } from "../types";
import { appendUsage, readUsage } from "./usageLog";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "idlefit-usagelog-"));
  process.env.IDLEFIT_DATA_DIR = dir;
});
afterAll(async () => {
  delete process.env.IDLEFIT_DATA_DIR;
  await rm(dir, { recursive: true, force: true });
});

const row = (at: string, task: UsageRecord["task"]): UsageRecord => ({
  at,
  workspaceId: "a".repeat(64),
  task,
  provider: "anthropic",
  model: "claude-opus-5",
  inputTokens: 1,
  outputTokens: 2,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  estCostUsd: 0.01,
  keySource: "house",
  latencyMs: 5,
  ok: true,
});

describe("usage log", () => {
  test("appends rows to that UTC day's file and reads them back in order", async () => {
    await appendUsage(row("2026-09-27T10:00:00.000Z", "analyze"));
    await appendUsage(row("2026-09-27T11:00:00.000Z", "price"));
    await appendUsage(row("2026-09-28T00:30:00.000Z", "pitch"));
    expect((await readUsage("2026-09-27")).map((r) => r.task)).toEqual(["analyze", "price"]);
    expect((await readUsage("2026-09-28")).map((r) => r.task)).toEqual(["pitch"]);
  });

  test("a day with no calls reads as empty", async () => {
    expect(await readUsage("2020-01-01")).toEqual([]);
  });

  test("rejects a malformed day instead of reading an arbitrary path", async () => {
    await expect(readUsage("../../etc/passwd")).rejects.toThrow();
  });
});
