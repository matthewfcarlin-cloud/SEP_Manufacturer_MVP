import type { Metadata } from "next";
import { DemoBadge } from "@/components/Badges";
import { PageHeader } from "@/components/PageHeader";
import { getShops, summarizeShops } from "@/lib/shops";
import { ShopBrowser } from "./ShopBrowser";

export const metadata: Metadata = { title: "Shops" };

export default function ShopsPage() {
  const shops = getShops();
  const stats = summarizeShops(shops);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader
        eyebrow={
          <>
            <span>Los Angeles · {stats.shops} shops</span>
            <DemoBadge />
          </>
        }
        title="LA-area shops"
        description={
          <>
            Machine shops, print farms, fabs, and molders. Green machines have idle time this month,
            which is where a well-fitted design gets the best price and fastest slot. All{" "}
            {stats.shops} shops are fictional and exist only for this demo.
          </>
        }
        actions={
          <dl className="grid grid-cols-3 gap-2">
            <Stat label="Shops" value={stats.shops} />
            <Stat label="Machines" value={stats.machines} />
            <Stat label="Idle now" value={stats.idleMachines} highlight />
          </dl>
        }
      />
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
