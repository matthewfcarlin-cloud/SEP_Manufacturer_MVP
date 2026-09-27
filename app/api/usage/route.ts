import { fail, ok } from "@/lib/api";
import { getKeyInfo } from "@/lib/ai/keyStore";
import { workspaceOrFail } from "@/lib/ai/keySettings";
import type { UsageSummary } from "@/lib/types";
import { demoBudgetRemaining } from "@/lib/usage/budget";

/** What pays for this browser's AI calls, for the header pill. */
export async function GET(): Promise<Response> {
  const workspaceId = await workspaceOrFail();
  if (workspaceId instanceof Response) return workspaceId;
  try {
    const [key, demoBudgetRemainingUsd] = await Promise.all([getKeyInfo(workspaceId), demoBudgetRemaining(workspaceId)]);
    const summary: UsageSummary = key ? { keySource: "user", maskedKey: key.maskedKey, demoBudgetRemainingUsd } : { keySource: "house", demoBudgetRemainingUsd };
    return ok(summary);
  } catch (err) {
    console.error("[api/usage] couldn't read usage", err instanceof Error ? err.name : typeof err);
    return fail("Couldn't load AI usage. Please try again.", 500);
  }
}
