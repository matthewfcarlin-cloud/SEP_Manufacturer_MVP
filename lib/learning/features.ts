import { unitCostAt } from "../businessCase";
import { summarizeVersion } from "../compare";
import type { Outcome, Process, ProductFeatures, Project, ProjectVersion } from "../types";
import { getVersion } from "../versions";
import { materialFamily, sizeBucket } from "./vocabulary";

// The features job: each analyzed version of a contributing product becomes
// a compact, private-safe row (BACKEND.md 3.2). Pure; retrieval.ts feeds it
// current data on every call, so nothing derived outlives an opt-out or a
// delete.

const round2 = (n: number) => Math.round(n * 100) / 100;
const mid = (r: { low: number; high: number }) => (r.low + r.high) / 2;

/** Only an owned product whose owner switched contributing on. Examples never contribute. */
export function isContributing(project: Project): boolean {
  return !project.isExample && Boolean(project.owner) && project.learning?.contribute === true;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

/** This version's real supplier quotes (source "real" only), summarized. */
function realQuotesFor(version: number, outcomes: Outcome[]): ProductFeatures["realQuotes"] {
  const quotes = outcomes.filter((o) => o.kind === "real_quote" && o.source === "real" && o.version === version && o.actualUsd !== undefined);
  if (quotes.length === 0) return undefined;
  return {
    count: quotes.length,
    medianUnitUsd: round2(median(quotes.map((q) => q.actualUsd!))),
    medianQuantity: Math.round(median(quotes.map((q) => q.quantity ?? 0))),
  };
}

/** How the tweak this version applied moved the best unit cost, if both versions were analyzed. */
function revisionOf(project: Project, version: ProjectVersion): ProductFeatures["revision"] {
  const tweak = version.appliedTweak;
  const before = tweak && getVersion(project, tweak.fromVersion);
  const was = before && summarizeVersion(before).unitCost;
  const now = summarizeVersion(version).unitCost;
  if (!tweak || !was || !now) return undefined;
  return { tweakProcess: tweak.process, unitCostChangePct: Math.round(((mid(now) - mid(was)) / mid(was)) * 100) };
}

/** One version's features, or null if it hasn't been analyzed and measured. */
export function featuresForVersion(project: Project, version: ProjectVersion, outcomes: Outcome[]): ProductFeatures | null {
  const top = version.analysis?.paths[0];
  const geometry = version.geometry;
  if (!top || !geometry) return null;
  const estimate = unitCostAt(top, version.targetQuantity);
  const realQuotes = realQuotesFor(version.number, outcomes);
  const revision = revisionOf(project, version);
  return {
    projectId: project.id,
    version: version.number,
    ...(version.analysis!.category && { category: version.analysis!.category }),
    process: top.process,
    material: materialFamily(top.materials[0] ?? ""),
    sizeBucket: sizeBucket(geometry.boundingBoxMm),
    volumeCm3: geometry.volumeCm3,
    ...(geometry.typicalWallMm !== undefined && { wallMm: geometry.typicalWallMm }),
    quantity: version.targetQuantity,
    unitCostEst: { low: round2(estimate.low), high: round2(estimate.high) },
    ...(realQuotes && { realQuotes }),
    ...(revision && { revision }),
  };
}

/** Feature rows for every analyzed version of every contributing product. */
export function buildFeatureRows(entries: { project: Project; outcomes: Outcome[] }[]): ProductFeatures[] {
  return entries
    .filter(({ project }) => isContributing(project))
    .flatMap(({ project, outcomes }) => project.versions.map((v) => featuresForVersion(project, v, outcomes)).filter((r): r is ProductFeatures => r !== null));
}

export type FeatureQuery = { projectId: string } & Partial<Pick<ProductFeatures, "category" | "process" | "material" | "sizeBucket" | "quantity">>;

/**
 * What's known about a version to look up similar products. Before its
 * first analysis that's size, quantity and the creator's material ideas;
 * after, the analysis's category, top process and top material too.
 */
export function queryFeatures(project: Project, version: ProjectVersion): FeatureQuery {
  const top = version.analysis?.paths[0];
  const hintedMaterial = version.materialHints?.map(materialFamily).find((f) => f !== "other");
  const material = top ? materialFamily(top.materials[0] ?? "") : hintedMaterial;
  const process: Process | undefined = top?.process;
  return {
    projectId: project.id,
    ...(version.geometry && { sizeBucket: sizeBucket(version.geometry.boundingBoxMm) }),
    quantity: version.targetQuantity,
    ...(version.analysis?.category && { category: version.analysis.category }),
    ...(process && { process }),
    ...(material && material !== "other" && { material }),
  };
}
