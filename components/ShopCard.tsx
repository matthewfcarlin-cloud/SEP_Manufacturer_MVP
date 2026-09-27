import { PROCESS_LABELS } from "@/lib/processes";
import type { Machine, Shop } from "@/lib/types";
import { DemoBadge, StartBadge } from "./Badges";

const formatEnvelope = ({ x, y, z }: Machine["envelopeMm"]) => `${x} × ${y} × ${z} mm`;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="eyebrow text-[10px] text-muted">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/** One manufacturer in the directory: who, where, what they make, order size, how soon they can start. */
export function ShopCard({ shop }: { shop: Shop }) {
  const makes = [...new Set(shop.machines.map((m) => PROCESS_LABELS[m.type]))];
  const canStartNow = shop.machines.some((m) => m.idleThisMonth);
  return (
    <article className="flex flex-col gap-4 border border-line bg-surface p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{shop.name}</h2>
          <p className="text-sm text-muted">{shop.neighborhood}, Los Angeles</p>
        </div>
        <DemoBadge />
      </header>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Fact label="What they make">{makes.join(" · ")}</Fact>
        </div>
        <Fact label="Typical order size">
          {shop.minOrderQty.toLocaleString("en-US")}–{shop.maxOrderQty.toLocaleString("en-US")} units
        </Fact>
        <Fact label="How fast they can start">
          <StartBadge canStartNow={canStartNow} />
        </Fact>
      </dl>

      <details className="group border-t border-line pt-3 text-sm">
        <summary className="cursor-pointer text-muted hover:text-ink">Machines and materials</summary>
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-muted">{shop.description}</p>
          <p className="text-xs text-muted">Usually delivers in about {shop.typicalLeadDays} days.</p>
          <ul className="flex flex-col gap-2">
            {shop.machines.map((m) => (
              <li key={`${m.type}-${m.model}`} className="border border-line p-3">
                <p className="font-medium">{m.model}</p>
                <p className="text-xs text-muted">
                  {PROCESS_LABELS[m.type]} · {formatEnvelope(m.envelopeMm)}
                </p>
                <p className="mt-1 text-xs text-muted">{m.materials.join(", ")}</p>
              </li>
            ))}
          </ul>
          {shop.specialties.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {shop.specialties.map((s) => (
                <li key={s} className="border border-line px-2 py-0.5 text-xs text-muted">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </article>
  );
}
