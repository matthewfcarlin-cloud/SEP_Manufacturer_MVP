import { DemoBadge, IdleBadge } from "@/components/Badges";
import { PROCESS_LABELS } from "@/lib/processes";
import { getShopById } from "@/lib/shops";
import type { ShopMatch } from "@/lib/types";

export function ShopMatches({ matches }: { matches: ShopMatch[] }) {
  return (
    <section aria-labelledby="shop-matches-heading" className="flex flex-col gap-4 border-t border-line pt-8">
      <div>
        <h2 id="shop-matches-heading" className="text-2xl font-semibold tracking-tight">Shop matches</h2>
        <p className="mt-1 text-sm text-muted">Ranked by process fit, material, order size, and available machine time.</p>
      </div>
      {matches.length ? (
        <ol className="grid gap-4 lg:grid-cols-2">
          {matches.map((match, index) => {
            const shop = getShopById(match.shopId);
            if (!shop) return null;
            return (
              <li key={`${match.shopId}-${match.matchedMachine.model}`} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted">Match {index + 1}</p>
                    <h3 className="mt-1 text-lg font-semibold">{shop.name}</h3>
                    <p className="text-sm text-muted">{shop.neighborhood}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {match.idleBoost && <IdleBadge hoursPerWeek={match.matchedMachine.idleHoursPerWeek} />}
                    <DemoBadge />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg p-3">
                  <div>
                    <p className="text-xs text-muted">Matched machine</p>
                    <p className="font-medium">{match.matchedMachine.model}</p>
                    <p className="text-xs text-muted">{PROCESS_LABELS[match.matchedMachine.type]}</p>
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">{match.score}<span className="text-sm font-normal text-muted"> / 100</span></p>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-semibold">Why it matches</h4>
                  <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted">
                    {match.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                </div>
                {match.requiredTweaks.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">Required tweaks</h4>
                    <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted">
                      {match.requiredTweaks.map((tweak) => <li key={tweak}>{tweak}</li>)}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">No shop machines match the recommended processes and part envelope.</p>
      )}
    </section>
  );
}
