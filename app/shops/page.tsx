import type { Metadata } from "next";
import { DemoBadge } from "@/components/Badges";
import { getShops, summarizeShops } from "@/lib/shops";
import { ShopBrowser } from "./ShopBrowser";

export const metadata: Metadata = { title: "Shops" };

export default function ShopsPage() {
  const shops = getShops();
  const stats = summarizeShops(shops);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">LA-area shops</h1>
          <DemoBadge />
        </div>
        <p className="max-w-2xl text-muted">
          Machine shops, print farms, fabs, and molders around Los Angeles. Green machines have idle
          time this month, which is where a well-fitted design gets the best price and fastest slot.
        </p>
        <p className="text-sm text-muted">
          All {stats.shops} shops are fictional and exist only for this demo.
        </p>
        <dl className="mt-2 grid max-w-md grid-cols-3 gap-3">
          <Stat label="Shops" value={stats.shops} />
          <Stat label="Machines" value={stats.machines} />
          <Stat label="Idle now" value={stats.idleMachines} highlight />
        </dl>
      </header>
      <ShopBrowser shops={shops} />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-idle/40 bg-idle-soft" : "border-line bg-surface"}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`font-mono text-2xl font-semibold ${highlight ? "text-idle" : ""}`}>{value}</dd>
    </div>
  );
}
