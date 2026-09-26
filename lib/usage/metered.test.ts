import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { ACTION_ESTIMATE_USD, budgetStatus } from "./budget";
import { metered } from "./metered";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "idlefit-meter-"));
  process.env.IDLEFIT_DATA_DIR = dir;
});
afterAll(async () => {
  delete process.env.IDLEFIT_DATA_DIR;
  await rm(dir, { recursive: true, force: true });
});

describe("metered", () => {
  test("charges each turn's real cost to the browser", async () => {
    const owner = "a".repeat(64);
    const call = vi.fn().mockResolvedValue({
      stopReason: "end_turn",
      output: {},
      usage: { model: "claude-opus-5", inputTokens: 10_000, outputTokens: 8_000, cacheWriteTokens: 0, cacheReadTokens: 4_500 },
    });
    await metered(call, owner, "analysis")("brief");
    // 10k * $5 + 8k * $25 + 4.5k * $0.50, per million
    expect((await budgetStatus(owner)).spentUsd).toBeCloseTo(0.05 + 0.2 + 0.00225);
  });

  test("charges the conservative estimate when usage is unknown", async () => {
    const owner = "b".repeat(64);
    await metered(vi.fn().mockResolvedValue({ stopReason: "max_tokens", output: null }), owner, "pitch")("brief");
    expect((await budgetStatus(owner)).spentUsd).toBeCloseTo(ACTION_ESTIMATE_USD.pitch);
  });
});
