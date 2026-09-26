import { currentOwnerHash } from "@/lib/access";
import { ACTION_ESTIMATE_USD, budgetStatus } from "@/lib/usage/budget";

/** "AI budget for this browser: $2.40 of $3.00 left (about 4 analyses)." */
export async function AiBudgetNote() {
  const ownerHash = await currentOwnerHash();
  if (!ownerHash) return null;
  const { remainingUsd, limitUsd } = await budgetStatus(ownerHash);
  const analyses = Math.floor(remainingUsd / ACTION_ESTIMATE_USD.analysis);
  return (
    <p className="text-xs text-muted">
      Demo AI budget for this browser: ${remainingUsd.toFixed(2)} of ${limitUsd.toFixed(2)} left
      {analyses > 0 ? ` (about ${analyses} ${analyses === 1 ? "analysis" : "analyses"})` : ", enough only for small AI requests"}.
    </p>
  );
}
