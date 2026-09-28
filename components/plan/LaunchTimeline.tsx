import { CalendarCheck, Check } from "lucide-react";
import { cx } from "@/components/ui/classes";
import { timelineRows } from "@/lib/studio/stageDisplay";
import type { LaunchPlan } from "@/lib/types";

const longDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const DAY_MS = 86_400_000;

function TodayMarker() {
  return (
    <div aria-label="Today" role="separator" className="flex items-center gap-3 py-1">
      <span className="w-[72px] shrink-0 text-right text-[12px] font-semibold text-accent-ink">Today</span>
      <span aria-hidden className="h-0.5 flex-1 rounded-pill bg-accent" />
    </div>
  );
}

/**
 * The launch plan as a vertical timeline (design/DESIGN.md §4 Launch): the
 * date on the left in mono, a dot on a line, the milestone and its cost on
 * the right, today's position in orange, and launch day as a card at the end.
 */
export function LaunchTimeline({ plan, today }: { plan: LaunchPlan; today: string }) {
  const { rows, todayIndex } = timelineRows(plan, today);
  const daysToLaunch = Math.round((Date.parse(`${plan.launchDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);

  return (
    <section aria-labelledby="launch-timeline-heading" className="flex flex-col gap-3">
      <h2 id="launch-timeline-heading" className="type-h2">
        Your launch timeline
      </h2>
      <figure aria-label="Launch plan timeline" className="card card-pad">
        <ol className="flex flex-col">
          {rows.map((row, i) => {
            const isLast = i === rows.length - 1;
            return (
              <li key={row.key} className="flex flex-col">
                {i === todayIndex && <TodayMarker />}
                <div className="flex gap-3">
                  <span className="w-[72px] shrink-0 pt-0.5 text-right font-mono text-[13px] text-ink-2">{row.date}</span>
                  <div aria-hidden className="flex flex-col items-center">
                    <span className={cx("mt-1.5 grid h-3.5 w-3.5 place-items-center rounded-pill", row.isPast ? "bg-green text-white" : "border-2 border-border-strong bg-surface")}>
                      {row.isPast && <Check size={9} strokeWidth={3.5} />}
                    </span>
                    {!isLast && <span className="w-0.5 flex-1 bg-border" />}
                  </div>
                  <div className={cx("min-w-0 flex-1", !isLast && "pb-5")}>
                    <p className={cx("text-[15px] font-medium", row.isPast ? "text-ink-2" : "text-ink")}>
                      {row.title}
                      {row.isPast && <span className="sr-only"> (done)</span>}
                    </p>
                    <p className="font-mono text-[13px] text-muted">{row.cost}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        {todayIndex === rows.length && <TodayMarker />}
      </figure>
      <div className="flex items-center gap-4 rounded-card bg-accent-soft p-5">
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-surface text-accent-ink">
          <CalendarCheck size={20} strokeWidth={1.75} />
        </span>
        <div>
          <p className="type-small text-ink-2">Launch day</p>
          <p className="type-h2">{longDate(plan.launchDate)}</p>
          <p className="type-small text-ink-2">{daysToLaunch > 0 ? `${daysToLaunch} days from today (est.)` : daysToLaunch === 0 ? "That's today!" : "Launch day has passed. Draft a new plan to re-date it."}</p>
        </div>
      </div>
    </section>
  );
}
