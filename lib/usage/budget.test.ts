import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { ACTION_ESTIMATE_USD, checkBudget, recordSpend, budgetStatus } from "./budget";
import { costOfTurn } from "./pricing";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "idlefit-budget-"));
  process.env.IDLEFIT_DATA_DIR = dir;
});
beforeEach(() => {
  process.env.IDLEFIT_BROWSER_BUDGET_USD = "3";
  process.env.IDLEFIT_DAILY_BUDGET_USD = "25";
});
afterAll(async () => {
  delete process.env.IDLEFIT_DATA_DIR;
  delete process.env.IDLEFIT_BROWSER_BUDGET_USD;
  delete process.env.IDLEFIT_DAILY_BUDGET_USD;
  await rm(dir, { recursive: true, force: true });
});

const browser = (n: number) => String(n).repeat(64).slice(0, 64);

describe("costOfTurn", () => {
  test("prices Opus 5 tokens, with cache writes at 1.25x and reads at 0.1x", () => {
    const cost = costOfTurn({ model: "claude-opus-5", inputTokens: 1_000_000, outputTokens: 1_000_000, cacheWriteTokens: 1_000_000, cacheReadTokens: 1_000_000 });
    expect(cost).toBeCloseTo(5 + 25 + 6.25 + 0.5);
  });

  test("prices an unknown model at the most expensive known rate, so budgets stay conservative", () => {
    expect(costOfTurn({ model: "claude-new-thing", inputTokens: 1_000_000, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0 })).toBe(10);
  });
});

describe("budget", () => {
  test("a fresh browser has the full budget", async () => {
    expect(await budgetStatus(browser(1))).toEqual({ spentUsd: 0, limitUsd: 3, remainingUsd: 3 });
    expect(await checkBudget(browser(1), "analysis")).toEqual({ ok: true });
  });

  test("records real spend and refuses an action that would go over", async () => {
    await recordSpend(browser(2), 2.6);
    expect((await budgetStatus(browser(2))).remainingUsd).toBeCloseTo(0.4);
    // 2.60 + 0.60 estimate > 3.00
    expect(await checkBudget(browser(2), "analysis")).toMatchObject({ ok: false, reason: "browser" });
    // A cheap price suggestion still fits.
    expect(await checkBudget(browser(2), "price")).toEqual({ ok: true });
  });

  test("the site-wide daily cap applies across browsers", async () => {
    process.env.IDLEFIT_DAILY_BUDGET_USD = "1";
    await recordSpend(browser(3), 0.5);
    await recordSpend(browser(4), 0.45);
    expect(await checkBudget(browser(5), "analysis")).toMatchObject({ ok: false, reason: "daily" });
  });

  test("concurrent spends are all counted", async () => {
    await Promise.all(Array.from({ length: 20 }, () => recordSpend(browser(6), 0.1)));
    expect((await budgetStatus(browser(6))).spentUsd).toBeCloseTo(2);
  });

  test("estimates are ordered by how heavy each call is", () => {
    expect(ACTION_ESTIMATE_USD.analysis).toBeGreaterThan(ACTION_ESTIMATE_USD.pitch);
    expect(ACTION_ESTIMATE_USD.pitch).toBeGreaterThan(ACTION_ESTIMATE_USD.price);
  });
});
