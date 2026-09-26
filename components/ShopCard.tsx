import { PROCESS_LABELS } from "@/lib/processes";
import type { Machine, Shop } from "@/lib/types";
import { DemoBadge, IdleBadge } from "./Badges";

function formatEnvelope({ x, y, z }: Machine["envelopeMm"]) {
  return `${x} × ${y} × ${z} mm`;
}

function MachineRow({ machine }: { machine: Machine }) {
  return (
    <li
      className={`rounded-lg border p-3 ${
        machine.idleThisMonth ? "border-idle/40 bg-idle-soft/40" : "border-line"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{machine.model}</p>
          <p className="text-xs text-muted">
            {PROCESS_LABELS[machine.type]} · {formatEnvelope(machine.envelopeMm)}
          </p>
        </div>
        {machine.idleThisMonth && <IdleBadge hoursPerWeek={machine.idleHoursPerWeek} />}
      </div>
      <p className="mt-2 text-xs text-muted">{machine.materials.join(", ")}</p>
    </li>
  );
}

export function ShopCard({ shop }: { shop: Shop }) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">{shop.name}</h2>
          <DemoBadge />
        </div>
        <p className="text-sm text-muted">{shop.neighborhood}</p>
      </header>

      <p className="text-sm">{shop.description}</p>

      <dl className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-bg p-2">
          <dt className="text-muted">Order qty</dt>
          <dd className="font-mono font-medium">
            {shop.minOrderQty.toLocaleString()}–{shop.maxOrderQty.toLocaleString()}
          </dd>
        </div>
        <div className="rounded-lg bg-bg p-2">
          <dt className="text-muted">Lead time</dt>
          <dd className="font-mono font-medium">~{shop.typicalLeadDays} days</dd>
        </div>
        <div className="rounded-lg bg-bg p-2">
          <dt className="text-muted">Machines</dt>
          <dd className="font-mono font-medium">{shop.machines.length}</dd>
        </div>
      </dl>

      <ul className="flex flex-col gap-2">
        {shop.machines.map((m) => (
          <MachineRow key={`${m.type}-${m.model}`} machine={m} />
        ))}
      </ul>

      {shop.specialties.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {shop.specialties.map((s) => (
            <li key={s} className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
              {s}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
