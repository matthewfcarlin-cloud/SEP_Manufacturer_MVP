import type { LaunchPlan } from "@/lib/types";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const range = (r: { low: number; high: number }) => (r.low === r.high ? usd(r.low) : `${usd(r.low)}–${usd(r.high)}`);

/** Budget per milestone and the running total, all estimates. */
export function PlanBudget({ plan }: { plan: LaunchPlan }) {
  const running = plan.milestones.map((_, i) =>
    plan.milestones.slice(0, i + 1).reduce((t, m) => ({ low: t.low + m.budgetUsd.low, high: t.high + m.budgetUsd.high }), { low: 0, high: 0 }),
  );
  return (
    <div className="overflow-x-auto border border-line bg-surface">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            {["Milestone", "Dates", "Budget, est.", "Running total, est."].map((h) => (
              <th key={h} scope="col" className="eyebrow p-3 font-normal text-muted">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plan.milestones.map((m, i) => {
            return (
              <tr key={m.key} className="border-b border-line last:border-0 align-top">
                <th scope="row" className="p-3 text-left font-medium">
                  {m.title}
                  {m.note && <span className="mt-0.5 block text-xs font-normal text-muted">{m.note}</span>}
                </th>
                <td className="whitespace-nowrap p-3 font-mono text-xs">{m.durationDays ? `${m.startDate} → ${m.endDate}` : "—"}</td>
                <td className="whitespace-nowrap p-3 font-mono text-xs">{range(m.budgetUsd)}</td>
                <td className="whitespace-nowrap p-3 font-mono text-xs font-semibold">{range(running[i])}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
