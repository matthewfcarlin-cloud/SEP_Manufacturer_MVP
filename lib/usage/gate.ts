import { currentOwnerHash } from "../access";
import { SETTINGS_HINT } from "../ai/errors";
import { getKeyInfo } from "../ai/keyStore";
import { fail } from "../api";
import { checkBudget, type AiAction } from "./budget";

/**
 * The browser's owner hash (its workspace id) if it may run `action` now,
 * else the response to return. A browser with its own AI key pays for its
 * own calls, so only browsers on the house key are held to the demo budget
 * (429, code budget_exhausted).
 */
export async function aiBudgetGate(action: AiAction): Promise<string | Response> {
  const ownerHash = await currentOwnerHash();
  if (!ownerHash) return fail("Enable cookies for this site to use the AI features.", 400);
  if (await getKeyInfo(ownerHash)) return ownerHash;
  const check = await checkBudget(ownerHash, action);
  return check.ok ? ownerHash : fail(`${check.message} ${SETTINGS_HINT}`, 429, "budget_exhausted");
}
