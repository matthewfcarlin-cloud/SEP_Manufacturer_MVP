import { PROCESS_LABELS } from "@/lib/processes";
import type { Machine, Shop } from "@/lib/types";
import { DemoBadge, StartBadge } from "./Badges";
import { DetailsAccordion } from "@/components/ui/DetailsAccordion";

const formatEnvelope = ({ x, y, z }: Machine["envelopeMm"]) => `${x} × ${y} × ${z} mm`;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[13px] font-medium text-ink-2">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/** One manufacturer in the directory: who, where, what they make, order size, how soon they can start. */
export function ShopCard({ shop }: { shop: Shop }) {
  const makes = [...new Set(shop.machines.map((m) => PROCESS_LABELS[m.type]))];
  const canStartNow = shop.machines.some((m) => m.idleThisMonth);
  return (
    <article className="flex flex-col gap-4 card card-pad">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{shop.name}</h2>
          <p className="text-sm text-ink-2">{shop.neighborhood}, Los Angeles</p>
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

      <DetailsAccordion label="Machines and materials" className="border-t border-border pt-2 text-[14px]">
        <div className="flex flex-col gap-3">
          <p className="text-ink-2">{shop.description}</p>
          <p className="text-[13px] text-ink-2">Usually delivers in about {shop.typicalLeadDays} days.</p>
          <ul className="flex flex-col gap-2">
            {shop.machines.map((m) => (
              <li key={`${m.type}-${m.model}`} className="rounded-control bg-bg p-3">
                <p className="font-medium">{m.model}</p>
                <p className="text-[13px] text-ink-2">
                  {PROCESS_LABELS[m.type]} · {formatEnvelope(m.envelopeMm)}
                </p>
                <p className="mt-1 text-[13px] text-ink-2">{m.materials.join(", ")}</p>
              </li>
            ))}
          </ul>
          {shop.specialties.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {shop.specialties.map((s) => (
                <li key={s} className="rounded-pill bg-hover px-2.5 py-0.5 text-[13px] text-ink-2">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DetailsAccordion>
    </article>
  );
}
