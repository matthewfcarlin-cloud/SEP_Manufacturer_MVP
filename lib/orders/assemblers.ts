import rawAssemblers from "@/data/assemblers.json";
import { assemblyPartnersSchema } from "../schemas";
import type { AssemblyCapability, AssemblyPartner, OrderLine, OrderLineKind } from "../types";

// Low-volume assembly partners: fictional LA-area demo data, matched
// deterministically (no AI). An assembler receives every line, puts the
// product together, packs it and, for some, ships it to buyers.

const partners: readonly AssemblyPartner[] = Object.freeze(parse(rawAssemblers));

function parse(input: unknown): AssemblyPartner[] {
  const result = assemblyPartnersSchema.safeParse(input);
  if (!result.success) throw new Error(`data/assemblers.json is invalid: ${result.error.message}`);
  return result.data;
}

export const getAssemblers = (): readonly AssemblyPartner[] => partners;
export const getAssemblerById = (id: string) => partners.find((a) => a.id === id);

export const CAPABILITY_LABELS: Record<AssemblyCapability, string> = {
  mechanical: "mechanical assembly",
  electronics: "soldering and electronics",
  adhesive_bonding: "bonding",
  finishing: "finishing",
  testing: "functional testing",
  kitting: "kitting",
  packaging: "retail packaging",
  fulfillment: "order fulfillment",
};

/** Hands-on minutes per finished unit for each line, per piece, before the spread. Capped so a bag of 40 screws doesn't count as 40 steps. */
const MINUTES_PER_PIECE: Record<OrderLineKind, number> = {
  custom_part: 1.5,
  hardware: 0.4,
  electronics: 3,
  material: 0.5,
  finish: 2,
  packaging: 1,
};
const MAX_PIECES_COUNTED = 8;
/** Receiving, a quick inspection and moving the unit along. */
const BASE_MINUTES = 1.5;
/** The estimate is a range: simple builds go faster than the table, fiddly ones slower. */
const MINUTES_SPREAD = { low: 0.7, high: 1.4 } as const;

/** A product needs an assembler when it's more than one line; a single part ships finished from its maker. */
export const needsAssembly = (lines: readonly OrderLine[]) => lines.length > 1;

export function assemblyMinutes(lines: readonly OrderLine[]): { low: number; high: number } {
  const mid =
    BASE_MINUTES +
    lines.reduce((sum, l) => {
      const pieces = l.unit === "pc" || l.unit === "set" ? Math.min(Math.ceil(l.quantityPerUnit), MAX_PIECES_COUNTED) : 1;
      return sum + MINUTES_PER_PIECE[l.kind] * pieces;
    }, 0);
  return { low: round1(mid * MINUTES_SPREAD.low), high: round1(mid * MINUTES_SPREAD.high) };
}

/** What an assembler must be able to do for this BOM. */
export function requiredCapabilities(lines: readonly OrderLine[]): AssemblyCapability[] {
  const kinds = new Set(lines.map((l) => l.kind));
  const needs: AssemblyCapability[] = [];
  if (lines.filter((l) => l.kind !== "packaging").length > 1 || kinds.has("hardware")) needs.push("mechanical");
  if (kinds.has("electronics")) needs.push("electronics");
  if (kinds.has("finish")) needs.push("finishing");
  if (kinds.has("packaging")) needs.push("packaging");
  return needs;
}

/** Nice to have: a test step for anything electronic, kitting for many small parts. */
function preferredCapabilities(lines: readonly OrderLine[]): AssemblyCapability[] {
  const prefs: AssemblyCapability[] = [];
  if (lines.some((l) => l.kind === "electronics")) prefs.push("testing");
  if (lines.some((l) => l.kind === "hardware")) prefs.push("kitting");
  return prefs;
}

export type AssemblerMatch = {
  assembler: AssemblyPartner;
  score: number;
  /** Setup plus labor for the whole run, est. */
  costUsd: { low: number; high: number };
  perUnitUsd: { low: number; high: number };
  reasons: string[];
  /** Things to know before picking this one. */
  cautions: string[];
};

const IDLE_BONUS = 15;
const PREFERRED_BONUS = 6;
const OUT_OF_RANGE_PENALTY = 30;

export function assemblyCost(assembler: AssemblyPartner, lines: readonly OrderLine[], units: number) {
  const minutes = assemblyMinutes(lines);
  const low = assembler.setupUsd + assembler.laborUsdPerMinute * minutes.low * units;
  const high = assembler.setupUsd + assembler.laborUsdPerMinute * minutes.high * units;
  return { costUsd: { low: cents(low), high: cents(high) }, perUnitUsd: { low: cents(low / units), high: cents(high / units) } };
}

/**
 * Assemblers that can build this BOM, best first. Anyone missing a required
 * capability is left out; a run outside their size range is kept but
 * penalized and flagged. Score also favors idle capacity and lower cost.
 */
export function matchAssemblers(lines: readonly OrderLine[], units: number, list: readonly AssemblyPartner[] = partners): AssemblerMatch[] {
  const required = requiredCapabilities(lines);
  const preferred = preferredCapabilities(lines);
  const capable = list.filter((a) => required.every((c) => a.capabilities.includes(c)));
  const costs = capable.map((a) => assemblyCost(a, lines, units));
  const mids = costs.map((c) => (c.costUsd.low + c.costUsd.high) / 2);
  const cheapest = Math.min(...mids);

  return capable
    .map((a, i) => {
      const reasons: string[] = [];
      const cautions: string[] = [];
      let score = 50;
      if (required.length) reasons.push(`Does ${required.map((c) => CAPABILITY_LABELS[c]).join(", ")}`);
      const extras = preferred.filter((c) => a.capabilities.includes(c));
      score += extras.length * PREFERRED_BONUS;
      if (extras.length) reasons.push(`Also offers ${extras.map((c) => CAPABILITY_LABELS[c]).join(" and ")}`);
      if (units < a.minUnits) {
        score -= OUT_OF_RANGE_PENALTY;
        cautions.push(`Their minimum is ${a.minUnits.toLocaleString("en-US")} units; this run is ${units.toLocaleString("en-US")}.`);
      } else if (units > a.maxUnits) {
        score -= OUT_OF_RANGE_PENALTY;
        cautions.push(`Runs over ${a.maxUnits.toLocaleString("en-US")} units are outside their usual size.`);
      } else {
        score += 10;
        reasons.push(`Takes runs of ${a.minUnits.toLocaleString("en-US")}–${a.maxUnits.toLocaleString("en-US")} units`);
      }
      if (a.idleThisMonth) {
        score += IDLE_BONUS;
        reasons.push("Has open bench time this month");
      }
      // Up to 20 points for cost: the cheapest gets all of them.
      score += Math.round(20 * (cheapest / mids[i]));
      if (a.capabilities.includes("fulfillment")) reasons.push("Can ship straight to your buyers");
      return { assembler: a, score: Math.max(0, Math.min(100, score)), ...costs[i], reasons, cautions };
    })
    .sort((x, y) => y.score - x.score || x.costUsd.low - y.costUsd.low);
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const cents = (n: number) => Math.round(n * 100) / 100;
