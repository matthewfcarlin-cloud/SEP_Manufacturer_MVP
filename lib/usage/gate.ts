import { currentOwnerHash } from "../access";
import { fail } from "../api";
import { checkBudget, type AiAction } from "./budget";

/** The browser's owner hash if it may run `action` now, else the response to return (429 when over budget). */
export async function aiBudgetGate(action: AiAction): Promise<string | Response> {
  const ownerHash = await currentOwnerHash();
  if (!ownerHash) return fail("Enable cookies for this site to use the AI features.", 400);
  const check = await checkBudget(ownerHash, action);
  return check.ok ? ownerHash : fail(check.message, 429);
}
