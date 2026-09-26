import { formatDaysRange, formatToolingRange, formatUnitCostRange } from "@/lib/format";
import { PROCESS_LABELS } from "@/lib/processes";
import { getShopById } from "@/lib/shops";
import type { Analysis, ShopMatch } from "@/lib/types";

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl p-4 ${accent ? "bg-ink text-bg" : "bg-surface border border-line"}`}>
      <dt className={`text-xs ${accent ? "text-bg/70" : "text-muted"}`}>{label}</dt>
      <dd className="text-lg font-semibold leading-tight">{value}</dd>
      {sub && <p className={`text-xs ${accent ? "text-bg/70" : "text-muted"}`}>{sub}</p>}
    </div>
  );
}

/** The four numbers a presenter points at first. */
export function AtAGlance({ analysis, quantity, topMatch }: { analysis: Analysis; quantity: number; topMatch?: ShopMatch }) {
  const best = analysis.paths[0];
  const shop = topMatch ? getShopById(topMatch.shopId) : undefined;
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Stat accent label="Best way to make it" value={PROCESS_LABELS[best.process]} sub={`${best.fitScore}/100 fit`} />
      <Stat label={`Per part @ ${quantity.toLocaleString("en-US")}, est.`} value={formatUnitCostRange(best.unitCostUsd)} />
      <Stat label="Tooling, est." value={formatToolingRange(best.toolingCostUsd)} sub="one-time" />
      <Stat label="Lead time, est." value={formatDaysRange(best.leadTimeDays)} />
      <Stat
        label="Best local shop (demo)"
        value={shop?.name ?? "No match yet"}
        sub={topMatch ? `${topMatch.idleBoost ? "Idle machine · " : ""}${shop?.neighborhood ?? ""}` : undefined}
      />
    </dl>
  );
}
