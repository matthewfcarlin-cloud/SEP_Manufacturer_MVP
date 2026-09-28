import type { LaunchPlan } from "@/lib/types";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const range = (r: { low: number; high: number }) => (r.low === r.high ? usd(r.low) : `${usd(r.low)}–${usd(r.high)}`);

/** Budget per milestone and the running total, all estimates. */
export function PlanBudget({ plan }: { plan: LaunchPlan }) {
  const running = plan.milestones.map((_, i) =>
    plan.milestones.slice(0, i + 1).reduce((t, m) => ({ low: t.low + m.budgetUsd.low, high: t.high + m.budgetUsd.high }), { low: 0, high: 0 }),
  );
  return (
    <div className="overflow-x-auto card">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {["Milestone", "Dates", "Budget, est.", "Running total, est."].map((h) => (
              <th key={h} scope="col" className="text-[13px] font-medium p-3 text-ink-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plan.milestones.map((m, i) => {
            return (
              <tr key={m.key} className="border-b border-border last:border-0 align-top">
                <th scope="row" className="p-3 text-left font-medium">
                  {m.title}
                  {m.note && <span className="mt-0.5 block text-[13px] font-medium text-ink-2">{m.note}</span>}
                </th>
                <td className="whitespace-nowrap p-3 font-mono text-[13px]">{m.durationDays ? `${m.startDate} → ${m.endDate}` : "—"}</td>
                <td className="whitespace-nowrap p-3 font-mono text-[13px]">{range(m.budgetUsd)}</td>
                <td className="whitespace-nowrap p-3 font-mono text-[13px] font-semibold">{range(running[i])}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
