import { buildBusinessCase, formatMarginRange } from "./businessCase";
import { PROCESS_LABELS, processInSentence } from "./processes";
import type { Process, ProjectVersion } from "./types";

type Range = { low: number; high: number };

/** The numbers compared between versions: the best path at each version's target quantity. */
export type VersionSummary = {
  number: number;
  quantity: number;
  analyzed: boolean;
  process?: Process;
  fitScore?: number;
  unitCost?: Range;
  tooling?: Range;
  topShop?: string;
  /** Margin at the target quantity from this version's own business case, if it has one. */
  margin?: Range & { mid: number };
};

export type DeltaKey = "unitCost" | "tooling" | "process" | "fitScore" | "margin" | "topShop";
export type Direction = "better" | "worse" | "same" | "changed";

export type DeltaRow = {
  key: DeltaKey;
  label: string;
  a: string;
  b: string;
  /** Short signed change ("−40%", "+12", "Switched"); null when it can't be computed. */
  change: string | null;
  direction: Direction;
};

export type Comparison = {
  rows: DeltaRow[];
  summary: string;
  bothAnalyzed: boolean;
  quantitiesDiffer: boolean;
};

const MINUS = "−";
/** Changes smaller than this read as noise, not as a change. */
const MIN_PERCENT_CHANGE = 1;
const MIN_TOOLING_CHANGE_USD = 50;

const mid = (r: Range) => (r.low + r.high) / 2;
const signed = (n: number, text: string) => (n > 0 ? `+${text}` : n < 0 ? `${MINUS}${text}` : text);

const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const usdCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatRange(r: Range | undefined, fmt: (n: number) => string): string {
  if (!r) return "—";
  return r.low === r.high ? fmt(r.low) : `${fmt(r.low)}–${fmt(r.high)}`;
}
const compactUsd = (n: number) => usdCompact.format(n).replace("K", "k");

function marginAtTarget(version: ProjectVersion) {
  if (!version.analysis || !version.businessCase) return undefined;
  const inputs = { ...version.businessCase, quantityTiers: [version.targetQuantity] };
  return buildBusinessCase(version.analysis.paths, inputs).tiers[0].margin;
}

export function summarizeVersion(version: ProjectVersion, topShop?: string): VersionSummary {
  const best = version.analysis?.paths[0];
  const margin = marginAtTarget(version);
  return {
    number: version.number,
    quantity: version.targetQuantity,
    analyzed: Boolean(best),
    ...(best && {
      process: best.process,
      fitScore: best.fitScore,
      unitCost: best.unitCostUsd,
      tooling: best.toolingCostUsd,
    }),
    ...(topShop && { topShop }),
    ...(margin && { margin }),
  };
}

function lowerIsBetter(delta: number, isMeaningful: boolean): Direction {
  if (!isMeaningful) return "same";
  return delta < 0 ? "better" : "worse";
}

function unitCostRow(a: VersionSummary, b: VersionSummary): DeltaRow {
  const row = { key: "unitCost" as const, label: "Unit cost, est.", a: formatRange(a.unitCost, usdCents.format), b: formatRange(b.unitCost, usdCents.format) };
  if (!a.unitCost || !b.unitCost) return { ...row, change: null, direction: "same" };
  const pct = Math.round(((mid(b.unitCost) - mid(a.unitCost)) / mid(a.unitCost)) * 100);
  const meaningful = Math.abs(pct) >= MIN_PERCENT_CHANGE;
  return { ...row, change: meaningful ? signed(pct, `${Math.abs(pct)}%`) : "0%", direction: lowerIsBetter(pct, meaningful) };
}

function toolingRow(a: VersionSummary, b: VersionSummary): DeltaRow {
  const row = { key: "tooling" as const, label: "Tooling, est.", a: formatRange(a.tooling, compactUsd), b: formatRange(b.tooling, compactUsd) };
  if (!a.tooling || !b.tooling) return { ...row, change: null, direction: "same" };
  const delta = mid(b.tooling) - mid(a.tooling);
  const meaningful = Math.abs(delta) >= MIN_TOOLING_CHANGE_USD;
  return { ...row, change: meaningful ? signed(delta, compactUsd(Math.abs(delta))) : "$0", direction: lowerIsBetter(delta, meaningful) };
}

function processRow(a: VersionSummary, b: VersionSummary): DeltaRow {
  const label = (p?: Process) => (p ? PROCESS_LABELS[p] : "—");
  const row = { key: "process" as const, label: "Best process", a: label(a.process), b: label(b.process) };
  if (!a.process || !b.process) return { ...row, change: null, direction: "same" };
  return a.process === b.process ? { ...row, change: "Same", direction: "same" } : { ...row, change: "Switched", direction: "changed" };
}

function fitRow(a: VersionSummary, b: VersionSummary): DeltaRow {
  const show = (n?: number) => (n === undefined ? "—" : `${n}/100`);
  const row = { key: "fitScore" as const, label: "Fit score", a: show(a.fitScore), b: show(b.fitScore) };
  if (a.fitScore === undefined || b.fitScore === undefined) return { ...row, change: null, direction: "same" };
  const delta = b.fitScore - a.fitScore;
  return { ...row, change: signed(delta, String(Math.abs(delta))), direction: delta === 0 ? "same" : delta > 0 ? "better" : "worse" };
}

function marginRow(a: VersionSummary, b: VersionSummary): DeltaRow {
  const show = (m?: Range) => (m ? formatMarginRange(m) : "—");
  const row = { key: "margin" as const, label: "Your margin, est.", a: show(a.margin), b: show(b.margin) };
  if (!a.margin || !b.margin) return { ...row, change: null, direction: "same" };
  const points = Math.round((b.margin.mid - a.margin.mid) * 100);
  return { ...row, change: `${signed(points, String(Math.abs(points)))} pts`, direction: points === 0 ? "same" : points > 0 ? "better" : "worse" };
}

function topShopRow(a: VersionSummary, b: VersionSummary): DeltaRow {
  const row = { key: "topShop" as const, label: "Top shop match", a: a.topShop ?? "—", b: b.topShop ?? "—" };
  if (!a.analyzed || !b.analyzed) return { ...row, change: null, direction: "same" };
  return a.topShop === b.topShop ? { ...row, change: "Same", direction: "same" } : { ...row, change: "Changed", direction: "changed" };
}

function summarize(rows: DeltaRow[], a: VersionSummary, b: VersionSummary): string {
  if (!a.analyzed || !b.analyzed) {
    const missing = [a, b].filter((s) => !s.analyzed).map((s) => `v${s.number}`);
    const other = a.analyzed ? a : b.analyzed ? b : null;
    return other
      ? `Analyze ${missing[0]} to compare it with v${other.number}.`
      : `Analyze ${missing.join(" and ")} to compare them.`;
  }
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r])) as Record<DeltaKey, DeltaRow>;
  const parts: string[] = [];
  if (byKey.unitCost.direction !== "same") parts.push(`unit cost ${byKey.unitCost.change}`);
  if (byKey.tooling.direction !== "same") parts.push(`tooling ${byKey.tooling.change}`);
  if (byKey.process.direction === "changed" && a.process && b.process) {
    parts.push(`switched from ${processInSentence(a.process)} to ${processInSentence(b.process)}`);
  }
  if (byKey.fitScore.direction !== "same") parts.push(`fit score ${byKey.fitScore.change}`);
  if (byKey.margin.direction !== "same") parts.push(`margin ${byKey.margin.change}`);
  if (parts.length === 0) return "No meaningful change in cost, tooling, or process.";
  const sentence = parts.join(", ");
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

/** How version b differs from version a. Pure: the page does no math. */
export function compareVersions(a: VersionSummary, b: VersionSummary): Comparison {
  const rows = [unitCostRow(a, b), toolingRow(a, b), processRow(a, b), fitRow(a, b), marginRow(a, b), topShopRow(a, b)];
  return {
    rows,
    summary: summarize(rows, a, b),
    bothAnalyzed: a.analyzed && b.analyzed,
    quantitiesDiffer: a.quantity !== b.quantity,
  };
}
