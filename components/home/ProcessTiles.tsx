import Link from "next/link";
import { PROCESS_LABELS, PROCESSES } from "@/lib/processes";
import type { Process, Shop } from "@/lib/types";
import { Reveal } from "./Reveal";

type ProcessStat = {
  process: Process;
  machines: number;
  idle: number;
  largestIdle?: string;
  materials: string[];
};

function processStats(shops: readonly Shop[]): ProcessStat[] {
  return PROCESSES.map((process) => {
    const machines = shops.flatMap((s) => s.machines).filter((m) => m.type === process);
    const idle = machines.filter((m) => m.idleThisMonth);
    const biggest = [...idle].sort(
      (a, b) => b.envelopeMm.x * b.envelopeMm.y * b.envelopeMm.z - a.envelopeMm.x * a.envelopeMm.y * a.envelopeMm.z,
    )[0];
    return {
      process,
      machines: machines.length,
      idle: idle.length,
      largestIdle: biggest && `${biggest.envelopeMm.x} × ${biggest.envelopeMm.y} × ${biggest.envelopeMm.z} mm`,
      materials: [...new Set(machines.flatMap((m) => m.materials))].slice(0, 3),
    };
  });
}

/** Nox-style spec tiles: every process the local shops run, with live idle counts. */
export function ProcessTiles({ shops }: { shops: readonly Shop[] }) {
  const stats = processStats(shops);
  return (
    <section aria-labelledby="processes-heading" className="py-24 sm:py-32">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 sm:px-6">
        <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow text-muted">Nine processes · 25 shops · Los Angeles</p>
            <h2 id="processes-heading" className="display-type mt-4 text-[clamp(2.6rem,6vw,5.5rem)]">
              What&apos;s running
              <br />
              near you
            </h2>
          </div>
          <p className="max-w-sm text-muted">
            Moko prices your part against the machines local shops actually have, and pushes
            the ones sitting idle this month to the top.
          </p>
        </Reveal>

        <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s, i) => (
            <li key={s.process} className="group bg-surface">
              <Reveal delay={(i % 3) * 0.06} className="flex h-full flex-col gap-6 p-6 transition-colors group-hover:bg-bg">
                <div className="flex items-start justify-between gap-4">
                  <span className="eyebrow text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span className={`eyebrow ${s.idle > 0 ? "text-idle" : "text-muted"}`}>
                    {s.idle > 0 ? `● ${s.idle} idle` : "None idle"}
                  </span>
                </div>
                <h3 className="display-type text-3xl">{PROCESS_LABELS[s.process]}</h3>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-sm text-muted">{s.idle} of {s.machines} machines open</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-idle" style={{ width: `${s.machines ? (s.idle / s.machines) * 100 : 0}%` }} />
                  </div>
                </div>
                <dl className="mt-auto grid gap-3 border-t border-line pt-4">
                  {s.largestIdle && (
                    <div>
                      <dt className="eyebrow text-muted">Largest idle bed</dt>
                      <dd className="mt-1 font-mono text-sm">{s.largestIdle}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="eyebrow text-muted">Materials</dt>
                    <dd className="mt-1 text-sm">{s.materials.join(" · ")}</dd>
                  </div>
                </dl>
              </Reveal>
            </li>
          ))}
        </ul>
        <Link href="/shops" className="eyebrow self-start text-muted underline-offset-4 hover:text-ink hover:underline">
          Browse every shop and machine →
        </Link>
      </div>
    </section>
  );
}
