import { buildBusinessCase } from "./businessCase";
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
  /** What you keep on each sale at the target quantity, from this version's own price, if it has one. */
  perSale?: number;
};

export type DeltaKey = "unitCost" | "tooling" | "process" | "fitScore" | "perSale" | "topShop";
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

function perSaleAtTarget(version: ProjectVersion): number | undefined {
  if (!version.analysis || !version.businessCase) return undefined;
  const inputs = { ...version.businessCase, quantityTiers: [version.targetQuantity] };
  const bc = buildBusinessCase(version.analysis.paths, inputs);
  return bc.revenuePerUnit - bc.tiers[0].allIn.mid;
}

export function summarizeVersion(version: ProjectVersion, topShop?: string): VersionSummary {
  const best = version.analysis?.paths[0];
  const perSale = perSaleAtTarget(version);
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
    ...(perSale !== undefined && { perSale }),
  };
}

function lowerIsBetter(delta: number, isMeaningful: boolean): Direction {
  if (!isMeaningful) return "same";
  return delta < 0 ? "better" : "worse";
}

function unitCostRow(a: VersionSummary, b: VersionSummary): DeltaRow {
  const row = { key: "unitCost" as const, label: "Cost of each, est.", a: formatRange(a.unitCost, usdCents.format), b: formatRange(b.unitCost, usdCents.format) };
  if (!a.unitCost || !b.unitCost) return { ...row, change: null, direction: "same" };
  const pct = Math.round(((mid(b.unitCost) - mid(a.unitCost)) / mid(a.unitCost)) * 100);
  const meaningful = Math.abs(pct) >= MIN_PERCENT_CHANGE;
  return { ...row, change: meaningful ? signed(pct, `${Math.abs(pct)}%`) : "0%", direction: lowerIsBetter(pct, meaningful) };
}

function toolingRow(a: VersionSummary, b: VersionSummary): DeltaRow {
  const row = { key: "tooling" as const, label: "One-time setup cost, est.", a: formatRange(a.tooling, compactUsd), b: formatRange(b.tooling, compactUsd) };
  if (!a.tooling || !b.tooling) return { ...row, change: null, direction: "same" };
  const delta = mid(b.tooling) - mid(a.tooling);
  const meaningful = Math.abs(delta) >= MIN_TOOLING_CHANGE_USD;
  return { ...row, change: meaningful ? signed(delta, compactUsd(Math.abs(delta))) : "$0", direction: lowerIsBetter(delta, meaningful) };
}

function processRow(a: VersionSummary, b: VersionSummary): DeltaRow {
  const label = (p?: Process) => (p ? PROCESS_LABELS[p] : "—");
  const row = { key: "process" as const, label: "Best way to make it", a: label(a.process), b: label(b.process) };
  if (!a.process || !b.process) return { ...row, change: null, direction: "same" };
  return a.process === b.process ? { ...row, change: "Same", direction: "same" } : { ...row, change: "Switched", direction: "changed" };
}

function fitRow(a: VersionSummary, b: VersionSummary): DeltaRow {
  const show = (n?: number) => (n === undefined ? "—" : `${n}/100`);
  const row = { key: "fitScore" as const, label: "How well it fits", a: show(a.fitScore), b: show(b.fitScore) };
  if (a.fitScore === undefined || b.fitScore === undefined) return { ...row, change: null, direction: "same" };
  const delta = b.fitScore - a.fitScore;
  return { ...row, change: signed(delta, String(Math.abs(delta))), direction: delta === 0 ? "same" : delta > 0 ? "better" : "worse" };
}

/** Changes under half a dollar per sale read as noise. */
const MIN_PER_SALE_CHANGE_USD = 0.5;

function perSaleRow(a: VersionSummary, b: VersionSummary): DeltaRow {
  const show = (n?: number) => (n === undefined ? "—" : signed(n, usdCents.format(Math.abs(n))).replace(/^\+/, ""));
  const row = { key: "perSale" as const, label: "You keep per sale, est.", a: show(a.perSale), b: show(b.perSale) };
  if (a.perSale === undefined || b.perSale === undefined) return { ...row, change: null, direction: "same" };
  const delta = b.perSale - a.perSale;
  const meaningful = Math.abs(delta) >= MIN_PER_SALE_CHANGE_USD;
  return { ...row, change: meaningful ? signed(delta, usdCents.format(Math.abs(delta))) : "$0", direction: !meaningful ? "same" : delta > 0 ? "better" : "worse" };
}

function topShopRow(a: VersionSummary, b: VersionSummary): DeltaRow {
  const row = { key: "topShop" as const, label: "Top shop match", a: a.topShop ?? "—", b: b.topShop ?? "—" };
  if (!a.analyzed || !b.analyzed) return { ...row, change: null, direction: "same" };
  return a.topShop === b.topShop ? { ...row, change: "Same", direction: "same" } : { ...row, change: "Changed", direction: "changed" };
}

/** "a", "a and b", "a, b, and c". */
const listing = (parts: string[]) => (parts.length < 3 ? parts.join(" and ") : `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`);

function summarize(rows: DeltaRow[], a: VersionSummary, b: VersionSummary): string {
  if (!a.analyzed || !b.analyzed) {
    const missing = [a, b].filter((s) => !s.analyzed);
    const other = a.analyzed ? a : b.analyzed ? b : null;
    return other
      ? `See how version ${missing[0].number} is made to compare it with version ${other.number}.`
      : `See how version ${a.number} and version ${b.number} are made to compare them.`;
  }
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r])) as Record<DeltaKey, DeltaRow>;
  const parts: string[] = [];
  if (byKey.unitCost.direction !== "same" && a.unitCost && b.unitCost) {
    const pct = Math.abs(Math.round(((mid(b.unitCost) - mid(a.unitCost)) / mid(a.unitCost)) * 100));
    parts.push(`each one costs ${pct}% ${byKey.unitCost.direction === "better" ? "less" : "more"}`);
  }
  if (byKey.tooling.direction !== "same" && a.tooling && b.tooling) {
    parts.push(`the one-time setup cost is ${compactUsd(Math.abs(mid(b.tooling) - mid(a.tooling)))} ${byKey.tooling.direction === "better" ? "lower" : "higher"}`);
  }
  if (byKey.process.direction === "changed" && a.process && b.process) {
    parts.push(`it's made by ${processInSentence(b.process)} instead of ${processInSentence(a.process)}`);
  }
  if (byKey.fitScore.direction !== "same" && a.fitScore !== undefined && b.fitScore !== undefined) {
    parts.push(`it fits ${Math.abs(b.fitScore - a.fitScore)} points ${byKey.fitScore.direction === "better" ? "better" : "worse"}`);
  }
  if (byKey.perSale.direction !== "same" && a.perSale !== undefined && b.perSale !== undefined) {
    parts.push(`you keep ${usdCents.format(Math.abs(b.perSale - a.perSale))} ${byKey.perSale.direction === "better" ? "more" : "less"} per sale`);
  }
  if (parts.length === 0) return "No real change in what it costs or how it's made.";
  const sentence = listing(parts);
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

/** How version b differs from version a. Pure: the page does no math. */
export function compareVersions(a: VersionSummary, b: VersionSummary): Comparison {
  const rows = [unitCostRow(a, b), toolingRow(a, b), processRow(a, b), fitRow(a, b), perSaleRow(a, b), topShopRow(a, b)];
  return {
    rows,
    summary: summarize(rows, a, b),
    bothAnalyzed: a.analyzed && b.analyzed,
    quantitiesDiffer: a.quantity !== b.quantity,
  };
}
