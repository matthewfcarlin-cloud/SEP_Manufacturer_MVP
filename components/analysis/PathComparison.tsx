import { formatDaysRange, formatToolingRange, formatUnitCostRange } from "@/lib/format";
import { InfoTip, PLAIN_TERMS } from "@/components/InfoTip";
import { PROCESS_LABELS } from "@/lib/processes";
import type { ManufacturingPath } from "@/lib/types";

/** Side-by-side table of every path; details live in the cards below. */
export function PathComparison({ paths, quantity }: { paths: ManufacturingPath[]; quantity: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">Manufacturing paths compared</caption>
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            <th className="px-4 py-3 font-medium">Process</th>
            <th className="px-4 py-3 font-medium">{PLAIN_TERMS.fit.label}<InfoTip text={PLAIN_TERMS.fit.tip} /></th>
            <th className="px-4 py-3 font-medium">Per part @ {quantity.toLocaleString("en-US")}, est.</th>
            <th className="px-4 py-3 font-medium">{PLAIN_TERMS.setup.label}, est.<InfoTip text={PLAIN_TERMS.setup.tip} /></th>
            <th className="px-4 py-3 font-medium">{PLAIN_TERMS.time.label}, est.<InfoTip text={PLAIN_TERMS.time.tip} /></th>
            <th className="px-4 py-3 font-medium">Top tweak</th>
          </tr>
        </thead>
        <tbody>
          {paths.map((p, i) => (
            <tr key={`${p.process}-${i}`} className="border-b border-line align-top last:border-0">
              <td className="px-4 py-3 font-medium">
                <a href={`#path-${p.process}`} className="hover:underline">
                  {PROCESS_LABELS[p.process]}
                </a>
                {i === 0 && <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">Best</span>}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2" aria-label={`${p.fitScore} out of 100`}>
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${p.fitScore}%` }} />
                  </div>
                  <span className="font-mono text-xs">{p.fitScore}</span>
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono">{formatUnitCostRange(p.unitCostUsd)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono">{formatToolingRange(p.toolingCostUsd)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono">{formatDaysRange(p.leadTimeDays)}</td>
              <td className="px-4 py-3 text-muted">{p.designTweaks[0]?.change ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
