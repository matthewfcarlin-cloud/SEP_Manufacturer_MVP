import { DemoBadge, StartBadge } from "@/components/Badges";
import { PROCESS_LABELS } from "@/lib/processes";
import { getShopById } from "@/lib/shops";
import { specSummaryFor, type SpecSummary } from "@/lib/specSummary";
import type { ProjectVersion, ShopMatch } from "@/lib/types";

// Labels by position: lib/match.ts emits reasons in this order, and
// lib/match.test.ts fails if that order changes.
const REASON_LABELS = ["Process", "Part size", "Material", "Order size", "Timing"];

function SpecShared({ spec }: { spec: SpecSummary }) {
  const rows: [string, string][] = [
    ["Size", spec.size],
    ["Material", spec.material],
    ["Quantity", spec.quantity],
    ["Process", spec.process],
  ];
  return (
    <details className="rounded-xl border border-line bg-bg/60 p-4 text-sm">
      <summary className="cursor-pointer font-semibold">
        What this shop would see <span className="font-normal text-muted">· spec summary only</span>
      </summary>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="eyebrow text-muted">{k}</dt>
            <dd className="font-mono text-xs">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted">
        A quote request would carry only these four facts, not your file, photos or notes, until you choose to share more. This shop is
        fictional demo data, so nothing is sent.
      </p>
    </details>
  );
}

export function ShopMatches({ matches, version }: { matches: ShopMatch[]; version: ProjectVersion }) {
  return (
    <section aria-labelledby="shop-matches-heading" className="flex flex-col gap-4 border-t border-line pt-8">
      <div>
        <h2 id="shop-matches-heading" className="display-type text-[clamp(2rem,4vw,3.25rem)]">Shop matches</h2>
        <p className="mt-1 text-sm text-muted">Ranked by process fit, material, order size, and how soon they can start.</p>
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
                    <StartBadge canStartNow={match.idleBoost} />
                    <DemoBadge />
                  </div>
                </div>
                <div className="grid gap-3 rounded-xl bg-bg p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">Matched machine</p>
                    <p className="font-medium">{match.matchedMachine.model}</p>
                    <p className="text-sm text-muted">{PROCESS_LABELS[match.matchedMachine.type]} · {match.matchedMachine.envelopeMm.x} × {match.matchedMachine.envelopeMm.y} × {match.matchedMachine.envelopeMm.z} mm</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">Match score</p>
                    <p className="text-2xl font-semibold tabular-nums">{match.score}<span className="text-sm font-normal text-muted"> / 100</span></p>
                  </div>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-semibold">Why it matches</h4>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {match.reasons.map((reason, reasonIndex) => (
                      <li key={reason} className="flex items-start gap-2 rounded-lg border border-line bg-bg/60 p-3 text-sm">
                        <span aria-hidden className="mt-0.5 font-semibold text-accent">{reasonIndex + 1}.</span>
                        <span><span className="mb-0.5 block text-xs font-medium uppercase tracking-wider text-muted">{REASON_LABELS[reasonIndex] ?? "Fit detail"}</span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <SpecShared spec={specSummaryFor(version, match.matchedMachine.type)} />
                {match.requiredTweaks.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">Suggested changes for this shop</h4>
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
