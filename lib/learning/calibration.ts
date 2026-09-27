import type { CalibratedRange, CalibrationCell, Process, QuantityBucket, SizeBucket } from "../types";

// Cost calibration math (BACKEND.md 3.4). Pure and client-safe: pages can
// apply it to any displayed range. Cells come from calibrationData.ts.

/** Pseudo-count pulling thin cells toward "no correction": factor = (n·median + k·1) / (n + k). */
export const SHRINK_K = 5;
/** Real/estimate ratios outside this band are treated as typos, not data. */
const RATIO_BOUNDS = { min: 0.1, max: 10 } as const;

const QUANTITY_BOUNDS: [QuantityBucket, number][] = [
  ["q1", 100],
  ["q100", 1_000],
  ["q1k", 10_000],
];

export function quantityBucket(quantity: number): QuantityBucket {
  return QUANTITY_BOUNDS.find(([, bound]) => quantity < bound)?.[0] ?? "q10k";
}

export type CalibrationSample = { process: Process; sizeBucket: SizeBucket; quantity: number; ratio: number };

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

const cellKey = (process: Process, size: SizeBucket, qty: QuantityBucket) => `${process}|${size}|${qty}`;

/** One cell per process × size × quantity bucket that has usable real quotes. */
export function calibrationCells(samples: CalibrationSample[]): CalibrationCell[] {
  const groups = new Map<string, { cell: Omit<CalibrationCell, "n" | "factor">; ratios: number[] }>();
  for (const s of samples) {
    if (!Number.isFinite(s.ratio) || s.ratio < RATIO_BOUNDS.min || s.ratio > RATIO_BOUNDS.max) continue;
    const qty = quantityBucket(s.quantity);
    const key = cellKey(s.process, s.sizeBucket, qty);
    const group = groups.get(key) ?? { cell: { process: s.process, sizeBucket: s.sizeBucket, quantityBucket: qty }, ratios: [] };
    groups.set(key, { ...group, ratios: [...group.ratios, s.ratio] });
  }
  return [...groups.values()].map(({ cell, ratios }) => {
    const n = ratios.length;
    return { ...cell, n, factor: round2((n * median(ratios) + SHRINK_K) / (n + SHRINK_K)) };
  });
}

export function calibrationLabel(n: number): string {
  return n === 0 ? "Uncalibrated estimate" : `Calibrated from ${n} real quote${n === 1 ? "" : "s"}`;
}

/** Applies the matching cell's factor to a cost range. No matching cell = unchanged, labeled uncalibrated. */
export function calibrate(
  range: { low: number; high: number },
  cells: CalibrationCell[],
  process: Process,
  size: SizeBucket,
  quantity: number,
): CalibratedRange {
  const cell = cells.find((c) => c.process === process && c.sizeBucket === size && c.quantityBucket === quantityBucket(quantity));
  const factor = cell?.factor ?? 1;
  const n = cell?.n ?? 0;
  return { low: round2(range.low * factor), high: round2(range.high * factor), factor, n, label: calibrationLabel(n) };
}
