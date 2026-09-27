import type { AssemblyPartner, OrderCoordination, OrderLine, OrderSource, ProjectVersion } from "../types";
import { assemblyCost, getAssemblerById, needsAssembly, requiredCapabilities, CAPABILITY_LABELS } from "./assemblers";
import { effectiveSource, termsFor, type SourceTerms } from "./sources";

// The order plan for one production run: how many of each line to buy from
// whom, when everything lands at the assembler, and what the run costs
// landed. Computed from the version and the user's choices every time,
// never stored; pure and client-safe. Every money figure is an estimate
// except the quoted unit prices, and the UI labels them that way.

/** Extra parts bought to cover assembly breakage and rejects, on lines that go into an assembly. */
export const SPARES_SHARE = 0.03;
/** An order this far over what the run needs (because of an MOQ) gets a warning. */
export const OVERBUY_WARNING_SHARE = 0.25;

/**
 * Freight to the assembler (or to the creator), as a share of the goods'
 * value, and days in transit. Overseas assumes consolidated sea freight plus
 * import duty and customs brokerage; local assumes a courier or truck.
 */
export const SHIPPING = {
  overseas: { costShare: { low: 0.15, high: 0.3 }, days: { low: 25, high: 40 } },
  local: { costShare: { low: 0.02, high: 0.05 }, days: { low: 1, high: 3 } },
} as const;
/** Assemblers quote a lead time; a first run often slips. */
const ASSEMBLY_SLIP = 1.3;

type Range = { low: number; high: number };

export type PlannedLine = {
  line: OrderLine;
  source: OrderSource | null;
  /** True when the app picked the source; the user confirms it by signing off. */
  suggested: boolean;
  terms: SourceTerms | null;
  /** What the run needs, spares included. */
  neededQty: number;
  /** What gets ordered: the need, or the supplier's MOQ if higher. */
  orderQty: number;
  /** Parts past the need, bought only to meet the MOQ. */
  overbuy: number;
  goodsUsd: number | null;
  toolingUsd: number;
  shippingUsd: Range | null;
  /** Days from placing the order until these parts arrive. */
  arrivesInDays: Range | null;
};

export type OrderIssue = { lineId?: string; message: string };

export type OrderPlan = {
  runQuantity: number;
  lines: PlannedLine[];
  needsAssembly: boolean;
  assembler: AssemblyPartner | null;
  assemblyUsd: Range | null;
  /** Where every part ships to. */
  shipTo: string;
  totals: {
    goodsUsd: number;
    toolingUsd: number;
    shippingUsd: Range;
    assemblyUsd: Range;
    landedUsd: Range;
    perUnitUsd: Range;
  };
  /** Days from placing the orders: all parts in, then finished units ready. */
  timeline: { partsInDays: Range; readyInDays: Range; criticalLineId: string | null };
  /** Must be fixed before the user can sign off. */
  blockers: OrderIssue[];
  /** Worth knowing, don't stop sign-off. */
  warnings: OrderIssue[];
  /** Changes whenever anything the user would be signing off changes. */
  fingerprint: string;
  signedOff: boolean;
  /** Signed off earlier, but the plan has changed since. */
  signOffStale: boolean;
  usesDemoQuotes: boolean;
};

export function emptyOrder(version: ProjectVersion): OrderCoordination {
  return { runQuantity: version.targetQuantity, assignments: [], messages: [] };
}

export function planOrder(version: ProjectVersion, lines: readonly OrderLine[]): OrderPlan {
  const order = version.order ?? emptyOrder(version);
  const units = order.runQuantity;
  const assembly = needsAssembly(lines);
  const assembler = order.assemblerId ? (getAssemblerById(order.assemblerId) ?? null) : null;
  const blockers: OrderIssue[] = [];
  const warnings: OrderIssue[] = [];

  const planned = lines.map((line): PlannedLine => {
    const needed = Math.ceil(line.quantityPerUnit * units * (assembly && isPiece(line) ? 1 + SPARES_SHARE : 1));
    const picked = effectiveSource(version, line);
    if (!picked) {
      blockers.push({ lineId: line.id, message: `Pick a source for ${line.name}.` });
      return { line, source: null, suggested: false, terms: null, neededQty: needed, orderQty: needed, overbuy: 0, goodsUsd: null, toolingUsd: 0, shippingUsd: null, arrivesInDays: null };
    }
    const terms = termsFor(version, picked.source);
    if (terms.problem) blockers.push({ lineId: line.id, message: terms.problem });
    const orderQty = Math.max(needed, terms.moq);
    const overbuy = orderQty - needed;
    if (overbuy > needed * OVERBUY_WARNING_SHARE) {
      warnings.push({ lineId: line.id, message: `${terms.vendor}'s minimum order means buying ${fmt(overbuy)} more ${line.name.toLowerCase()} than this run needs.` });
    }
    const goodsUsd = terms.unitUsd === null ? null : cents(terms.unitUsd * orderQty);
    const ship = SHIPPING[terms.overseas ? "overseas" : "local"];
    const shippingUsd = goodsUsd === null ? null : { low: cents(goodsUsd * ship.costShare.low), high: cents(goodsUsd * ship.costShare.high) };
    const arrivesInDays = terms.leadDays === null ? null : { low: terms.leadDays + ship.days.low, high: terms.leadDays + ship.days.high };
    return { line, source: picked.source, suggested: picked.suggested, terms, neededQty: needed, orderQty, overbuy, goodsUsd, toolingUsd: terms.toolingUsd, shippingUsd, arrivesInDays };
  });

  let assemblyUsd: Range | null = null;
  if (assembly) {
    if (!assembler) {
      blockers.push({ message: order.assemblerId ? "That assembler is no longer listed. Pick another." : "Pick an assembly partner to put the product together." });
    } else {
      const missing = requiredCapabilities(lines).filter((c) => !assembler.capabilities.includes(c));
      if (missing.length) blockers.push({ message: `${assembler.name} doesn't do ${missing.map((c) => CAPABILITY_LABELS[c]).join(" or ")}, which this product needs.` });
      if (units < assembler.minUnits) warnings.push({ message: `${assembler.name}'s minimum run is ${fmt(assembler.minUnits)} units.` });
      if (units > assembler.maxUnits) warnings.push({ message: `${fmt(units)} units is more than ${assembler.name} usually takes on.` });
      assemblyUsd = assemblyCost(assembler, lines, units).costUsd;
    }
  }

  const usesDemoQuotes = planned.some((p) => p.terms?.isDemo);
  if (usesDemoQuotes) warnings.push({ message: "Some lines use demo quotes from fictional shops. Nothing can really be ordered from them." });
  if (units !== version.targetQuantity) warnings.push({ message: `This run is ${fmt(units)} units; the version's target quantity is ${fmt(version.targetQuantity)}.` });

  const sum = (f: (p: PlannedLine) => number) => cents(planned.reduce((s, p) => s + f(p), 0));
  const goodsUsd = sum((p) => p.goodsUsd ?? 0);
  const toolingUsd = sum((p) => p.toolingUsd);
  const shippingUsd = { low: sum((p) => p.shippingUsd?.low ?? 0), high: sum((p) => p.shippingUsd?.high ?? 0) };
  const assemblyTotal = assemblyUsd ?? { low: 0, high: 0 };
  const landedUsd = {
    low: cents(goodsUsd + toolingUsd + shippingUsd.low + assemblyTotal.low),
    high: cents(goodsUsd + toolingUsd + shippingUsd.high + assemblyTotal.high),
  };
  const perUnitUsd = { low: cents(landedUsd.low / units), high: cents(landedUsd.high / units) };
  if (version.budgetUsd !== undefined && landedUsd.low > version.budgetUsd) {
    warnings.push({ message: `The run costs more than the ${usd(version.budgetUsd)} budget on this version, even at the low estimate.` });
  } else if (version.budgetUsd !== undefined && landedUsd.high > version.budgetUsd) {
    warnings.push({ message: `The high estimate is over the ${usd(version.budgetUsd)} budget on this version.` });
  }

  const arrivals = planned.filter((p) => p.arrivesInDays);
  const critical = arrivals.reduce<PlannedLine | null>((worst, p) => (!worst || p.arrivesInDays!.high > worst.arrivesInDays!.high ? p : worst), null);
  const partsInDays = {
    low: Math.max(0, ...arrivals.map((p) => p.arrivesInDays!.low)),
    high: Math.max(0, ...arrivals.map((p) => p.arrivesInDays!.high)),
  };
  const assemblyDays = assembly && assembler ? { low: assembler.leadDays, high: Math.ceil(assembler.leadDays * ASSEMBLY_SLIP) } : { low: 0, high: 0 };
  const readyInDays = { low: partsInDays.low + assemblyDays.low, high: partsInDays.high + assemblyDays.high };

  const fingerprint = fingerprintOf({
    units,
    assemblerId: assembly ? (assembler?.id ?? null) : null,
    lines: planned.map((p) => [p.line.id, p.line.quantityPerUnit, p.source, p.terms?.unitUsd, p.terms?.toolingUsd, p.terms?.moq, p.terms?.leadDays]),
  });
  const signedOff = order.signOff?.fingerprint === fingerprint;

  return {
    runQuantity: units,
    lines: planned,
    needsAssembly: assembly,
    assembler: assembly ? assembler : null,
    assemblyUsd,
    shipTo: assembly ? (assembler ? assembler.name : "the assembly partner") : "you",
    totals: { goodsUsd, toolingUsd, shippingUsd, assemblyUsd: assemblyTotal, landedUsd, perUnitUsd },
    timeline: { partsInDays, readyInDays, criticalLineId: critical?.line.id ?? null },
    blockers,
    warnings,
    fingerprint,
    signedOff,
    signOffStale: !!order.signOff && !signedOff,
    usesDemoQuotes,
  };
}

const isPiece = (l: OrderLine) => l.unit === "pc" || l.unit === "set";
const cents = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => n.toLocaleString("en-US");
const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/** FNV-1a over a stable JSON string: short, deterministic, and the same in the browser and on the server. */
export function fingerprintOf(value: unknown): string {
  const text = JSON.stringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
