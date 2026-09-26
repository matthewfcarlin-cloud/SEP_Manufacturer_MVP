import { PROCESS_LABELS } from "@/lib/processes";
import type { Shop } from "@/lib/types";

type Entry = { key: string; model: string; process: string; neighborhood: string; hours?: number };

function idleEntries(shops: readonly Shop[]): Entry[] {
  return shops.flatMap((shop) =>
    shop.machines
      .filter((m) => m.idleThisMonth)
      .map((m) => ({
        key: `${shop.id}-${m.model}`,
        model: m.model,
        process: PROCESS_LABELS[m.type],
        neighborhood: shop.neighborhood,
        hours: m.idleHoursPerWeek,
      })),
  );
}

function Row({ entries, hidden = false }: { entries: Entry[]; hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {entries.map((e) => (
        <li key={e.key} className="eyebrow flex items-center gap-3 whitespace-nowrap px-6 text-night-muted">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-night-idle" />
          <span className="text-night-ink">{e.model}</span>
          <span>{e.process}</span>
          <span>{e.neighborhood}</span>
          {e.hours && <span className="text-night-idle">{e.hours} h/wk open</span>}
        </li>
      ))}
    </ul>
  );
}

/** A scrolling strip of every machine flagged idle in the (demo) shop data. */
export function IdleTicker({ shops }: { shops: readonly Shop[] }) {
  const entries = idleEntries(shops);
  return (
    <section
      aria-label={`${entries.length} machines idle this month (demo data)`}
      className="group overflow-hidden border-y border-night-line bg-night py-4"
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] [--marquee-duration:90s]">
        <Row entries={entries} />
        <Row entries={entries} hidden />
      </div>
    </section>
  );
}
