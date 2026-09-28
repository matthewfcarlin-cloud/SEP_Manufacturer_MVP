import { formatDaysRange, formatToolingRange, formatUnitCostRange } from "@/lib/format";
import { InfoTip, PLAIN_TERMS } from "@/components/InfoTip";
import { PROCESS_LABELS } from "@/lib/processes";
import { getShopById } from "@/lib/shops";
import type { Analysis, ShopMatch } from "@/lib/types";

function Stat({ label, value, sub, accent }: { label: React.ReactNode; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 rounded-card p-4 ${accent ? "bg-accent-soft" : "card"}`}>
      <dt className={`text-[13px] ${accent ? "font-medium text-accent-ink" : "text-ink-2"}`}>{label}</dt>
      <dd className="type-h3 text-ink">{value}</dd>
      {sub && <p className="text-[13px] text-ink-2">{sub}</p>}
    </div>
  );
}

/** The four numbers a presenter points at first. */
export function AtAGlance({ analysis, quantity, topMatch }: { analysis: Analysis; quantity: number; topMatch?: ShopMatch }) {
  const best = analysis.paths[0];
  const shop = topMatch ? getShopById(topMatch.shopId) : undefined;
  return (
    <dl className="grid grid-cols-2 gap-3 @3xl:grid-cols-5">
      <Stat accent label="Best way to make it" value={PROCESS_LABELS[best.process]} sub={`How well it fits: ${best.fitScore}/100`} />
      <Stat label={`Per part @ ${quantity.toLocaleString("en-US")}, est.`} value={formatUnitCostRange(best.unitCostUsd)} />
      <Stat label={<>{PLAIN_TERMS.setup.label}, est.<InfoTip text={PLAIN_TERMS.setup.tip} /></>} value={formatToolingRange(best.toolingCostUsd)} sub="mold or fixture, paid once" />
      <Stat label={<>{PLAIN_TERMS.time.label}, est.<InfoTip text={PLAIN_TERMS.time.tip} /></>} value={formatDaysRange(best.leadTimeDays)} />
      <Stat
        label="Best local shop (demo)"
        value={shop?.name ?? "No match yet"}
        sub={topMatch ? `${topMatch.idleBoost ? "Can start this week · " : ""}${shop?.neighborhood ?? ""}` : undefined}
      />
    </dl>
  );
}
