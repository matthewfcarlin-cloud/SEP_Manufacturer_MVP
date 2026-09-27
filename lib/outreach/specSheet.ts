import { resolveAiInputs } from "../aiInputs";
import { buildBusinessCase, DEFAULT_QUANTITY_TIERS, MIN_HEALTHY_MARGIN } from "../businessCase";
import type { Process, ProjectVersion, ShareLevel, SpecSheet } from "../types";

/** A sensible default finish per process; the shop confirms it in their quote. */
export const FINISH_BY_PROCESS: Record<Process, string> = {
  cnc_milling: "As machined, deburred; anodize or powder coat quoted separately",
  cnc_turning: "As turned, deburred",
  fdm_print: "As printed, supports removed",
  sla_print: "Supports removed, light sanding",
  sls_print: "Bead blasted",
  injection_molding: "Standard mold finish (SPI B-2)",
  sheet_metal: "Deburred, raw; powder coat quoted separately",
  laser_cutting: "Deburred edges",
  urethane_casting: "Matte, color matched",
};

const QUOTE_WINDOW_DAYS = 7;
const MAX_TIERS = 5;
const DAY_MS = 86_400_000;

/**
 * What a quote request carries. Private by default: "summary" is spec facts
 * only. "full" adds the studio renders, and the notes only if the owner lets
 * the AI see them (the same privacy setting governs both).
 */
export function buildSpecSheet(version: ProjectVersion, process: Process, shareLevel: ShareLevel, requestedAt: string): SpecSheet {
  const path = version.analysis?.paths.find((p) => p.process === process);
  const bc = version.businessCase;
  const tiers = [...new Set([version.targetQuantity, ...(bc?.quantityTiers ?? DEFAULT_QUANTITY_TIERS)])].sort((a, b) => a - b).slice(0, MAX_TIERS);
  const revenue = version.analysis && bc ? buildBusinessCase(version.analysis.paths, bc).revenuePerUnit : undefined;
  const isFull = shareLevel === "full";
  return {
    shareLevel,
    process,
    dimensionsMm: version.geometry?.boundingBoxMm ?? { x: 0, y: 0, z: 0 },
    material: path?.materials[0] ?? version.materialHints?.[0] ?? "To be confirmed",
    finish: FINISH_BY_PROCESS[process],
    quantityTiers: tiers,
    ...(revenue !== undefined && { targetUnitPriceUsd: Math.round(revenue * (1 - MIN_HEALTHY_MARGIN) * 100) / 100 }),
    quoteBy: new Date(Date.parse(requestedAt) + QUOTE_WINDOW_DAYS * DAY_MS).toISOString().slice(0, 10),
    renders: isFull ? (version.renders ?? []) : [],
    ...(isFull && resolveAiInputs(version).includeNotes && version.notes.trim() && { notes: version.notes }),
  };
}
