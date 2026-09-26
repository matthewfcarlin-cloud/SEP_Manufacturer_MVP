import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataRoot } from "../projectStore";
import { serialized } from "../serialize";

// A demo budget for AI calls, so a public URL can't run up the API bill:
//  - per browser (keyed by the owner-cookie hash), default $3;
//  - site-wide per UTC day, default $25, because clearing cookies resets the
//    per-browser budget.
// Spend is recorded from each response's real token usage; before a call,
// a conservative estimate for that action must still fit.

export type AiAction = "analysis" | "pitch" | "price";

/** Conservative cost of one action, including a possible retry (Opus 5, measured usage + headroom). */
export const ACTION_ESTIMATE_USD: Record<AiAction, number> = { analysis: 0.6, pitch: 0.15, price: 0.05 };

const DEFAULT_BROWSER_BUDGET_USD = 3;
const DEFAULT_DAILY_BUDGET_USD = 25;

const envNumber = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};
const browserLimit = () => envNumber("IDLEFIT_BROWSER_BUDGET_USD", DEFAULT_BROWSER_BUDGET_USD);
const dailyLimit = () => envNumber("IDLEFIT_DAILY_BUDGET_USD", DEFAULT_DAILY_BUDGET_USD);

const today = () => new Date().toISOString().slice(0, 10);
const ledgerPath = (kind: "browsers" | "days", key: string) => path.join(dataRoot(), "usage", kind, `${key}.json`);

async function readSpent(file: string): Promise<number> {
  try {
    const spent = JSON.parse(await readFile(file, "utf8")).spentUsd;
    return typeof spent === "number" ? spent : 0;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw err;
  }
}

async function addSpent(file: string, usd: number): Promise<void> {
  await serialized(`ledger:${file}`, async () => {
    const spent = await readSpent(file);
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify({ spentUsd: spent + usd, updatedAt: new Date().toISOString() }));
    await rename(tmp, file);
  });
}

export type BudgetStatus = { spentUsd: number; limitUsd: number; remainingUsd: number };

export async function budgetStatus(ownerHash: string): Promise<BudgetStatus> {
  const spentUsd = await readSpent(ledgerPath("browsers", ownerHash));
  const limitUsd = browserLimit();
  return { spentUsd, limitUsd, remainingUsd: Math.max(0, limitUsd - spentUsd) };
}

export type BudgetCheck = { ok: true } | { ok: false; reason: "browser" | "daily"; message: string };

/** Whether this browser (and the site, today) can afford one more `action`. */
export async function checkBudget(ownerHash: string, action: AiAction): Promise<BudgetCheck> {
  const estimate = ACTION_ESTIMATE_USD[action];
  const { spentUsd, limitUsd } = await budgetStatus(ownerHash);
  if (spentUsd + estimate > limitUsd) {
    return {
      ok: false,
      reason: "browser",
      message: `This browser has used its $${limitUsd.toFixed(2)} AI budget for the demo. The examples and everything already analyzed still work.`,
    };
  }
  if ((await readSpent(ledgerPath("days", today()))) + estimate > dailyLimit()) {
    return { ok: false, reason: "daily", message: "The demo's AI budget for today is used up. Please try again tomorrow." };
  }
  return { ok: true };
}

/** Adds real spend to this browser's and today's ledgers. */
export async function recordSpend(ownerHash: string, usd: number): Promise<void> {
  if (usd <= 0) return;
  await Promise.all([addSpent(ledgerPath("browsers", ownerHash), usd), addSpent(ledgerPath("days", today()), usd)]);
}
