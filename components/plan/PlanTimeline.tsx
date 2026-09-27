import type { LaunchPlan } from "@/lib/types";

const DAY_MS = 86_400_000;
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const monthLabel = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });

/**
 * Milestones as bars on one date axis, with today and launch markers.
 * Production (set by the quote) is the accent bar; a zero-day step is a
 * diamond. Positions are percentages, so it scales to any width.
 */
export function PlanTimeline({ plan, today }: { plan: LaunchPlan; today: string }) {
  const start = toMs(plan.startDate);
  const end = toMs(plan.launchDate) + DAY_MS;
  const span = end - start;
  const pct = (ms: number) => `${Math.min(100, Math.max(0, ((ms - start) / span) * 100))}%`;
  const todayMs = toMs(today);
  const months: number[] = [];
  for (let d = new Date(start); d.getTime() < end; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    const first = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    if (first > start) months.push(first);
  }

  return (
    <figure className="flex flex-col gap-2" aria-label={`Launch plan timeline from ${plan.startDate} to launch on ${plan.launchDate}`}>
      <div className="relative ml-0 h-5 sm:ml-44">
        {months.map((m) => (
          <span key={m} className="eyebrow absolute -translate-x-1/2 text-[10px] text-muted" style={{ left: pct(m) }}>
            {monthLabel(m)}
          </span>
        ))}
      </div>
      <ol className="relative flex flex-col gap-2">
        {plan.milestones.map((m) => {
          const isProduction = m.key === "production";
          return (
            <li key={m.key} className="grid gap-1 sm:grid-cols-[11rem_1fr] sm:items-center">
              <span className="truncate text-sm">
                {m.title}
                <span className="ml-2 font-mono text-[11px] text-muted sm:hidden">
                  {m.durationDays ? `${m.durationDays} d` : "none"}
                </span>
              </span>
              <span className="relative h-6 border-y border-line/60 bg-bg">
                {m.durationDays === 0 ? (
                  <span aria-hidden className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-muted bg-surface" style={{ left: pct(toMs(m.startDate)) }} />
                ) : (
                  <span
                    className={`absolute inset-y-1 ${isProduction ? "bg-accent" : "bg-ink"}`}
                    style={{ left: pct(toMs(m.startDate)), width: `max(4px, calc(${pct(toMs(m.endDate) + DAY_MS)} - ${pct(toMs(m.startDate))}))` }}
                    title={`${m.title}: ${m.startDate} → ${m.endDate}`}
                  />
                )}
              </span>
            </li>
          );
        })}
        {todayMs >= start && todayMs <= end && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 right-0 sm:left-44">
            <span className="absolute inset-y-0 border-l border-dashed border-ink" style={{ left: pct(todayMs) }}>
              <span className="eyebrow absolute -top-5 -translate-x-1/2 bg-bg px-1 text-[10px]">Today</span>
            </span>
          </span>
        )}
      </ol>
      <figcaption className="flex justify-between font-mono text-[11px] text-muted sm:ml-44">
        <span>Start {plan.startDate}</span>
        <span className="font-semibold text-accent">Launch {plan.launchDate}</span>
      </figcaption>
    </figure>
  );
}
