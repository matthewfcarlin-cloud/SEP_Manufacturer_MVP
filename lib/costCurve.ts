import { PROCESS_LABELS } from "./processes";
import type { ManufacturingPath, Process } from "./types";

export type CurvePoint = { quantity: number; low: number; high: number; mid: number };
export type CostCurve = { process: Process; points: CurvePoint[] };

/**
 * All-in cost per part at each priced volume: unit cost plus tooling spread
 * over the run. This is what makes tooling-heavy processes (molding) fall
 * steeply with volume while printing stays flat.
 */
export function effectiveCostCurve(path: ManufacturingPath): CostCurve | null {
  if (!path.unitCostAtVolume?.length) return null;
  const points = path.unitCostAtVolume.map(({ quantity, low, high }) => {
    const lo = low + path.toolingCostUsd.low / quantity;
    const hi = high + path.toolingCostUsd.high / quantity;
    return { quantity, low: lo, high: hi, mid: (lo + hi) / 2 };
  });
  return { process: path.process, points };
}

/**
 * Plain-language summary of which process is cheapest as volume grows, e.g.
 * "SLA printing is cheapest up to 100 units; injection molding from 1,000."
 * Compares midpoints of the all-in ranges.
 */
export function cheapestByVolume(curves: readonly CostCurve[]): string | null {
  if (curves.length === 0) return null;
  const quantities = curves[0].points.map((p) => p.quantity);
  const winners = quantities.map((q, i) =>
    curves.reduce((best, c) => (c.points[i].mid < best.points[i].mid ? c : best)).process,
  );

  const runs: { process: Process; from: number; to: number }[] = [];
  winners.forEach((process, i) => {
    const last = runs[runs.length - 1];
    if (last && last.process === process) last.to = quantities[i];
    else runs.push({ process, from: quantities[i], to: quantities[i] });
  });

  const n = (q: number) => q.toLocaleString("en-US");
  if (runs.length === 1) return `${PROCESS_LABELS[runs[0].process]} is cheapest at every volume shown.`;
  return (
    runs
      .map((r, i) => {
        const label = PROCESS_LABELS[r.process];
        if (i === 0) return `${label} is cheapest up to ${n(r.to)} units`;
        return `${label.charAt(0).toLowerCase() + label.slice(1)} from ${n(r.from)}`;
      })
      .join("; ") + "."
  );
}
