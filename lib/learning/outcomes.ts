import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AccessibleProject } from "../access";
import { unitCostAt } from "../businessCase";
import { PROCESSES } from "../processes";
import type { Outcome, ProjectVersion } from "../types";
import { sourceFor } from "./events";

// Ground truth a creator types in: a real supplier quote, what a unit really
// cost, and units sold. tweak_cost_delta is computed by the learning jobs
// (B4), never posted. The estimate to compare against is always computed
// here from the version's own analysis, never taken from the client.

const MAX_QUANTITY = 10_000_000;
const MAX_UNIT_USD = 1_000_000;
const MAX_MATERIAL_LENGTH = 80;

const target = { projectId: z.string().min(1).max(64), version: z.number().int().positive() };
const quantity = z.number().int().min(1).max(MAX_QUANTITY);
const unitUsd = z.number().positive().max(MAX_UNIT_USD);

export const outcomeRequestSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    ...target,
    kind: z.literal("real_quote"),
    process: z.enum(PROCESSES),
    quantity,
    actualUsd: unitUsd,
    material: z.string().trim().min(1).max(MAX_MATERIAL_LENGTH).optional(),
  }),
  z.strictObject({ ...target, kind: z.literal("actual_unit_cost"), process: z.enum(PROCESSES), quantity, actualUsd: unitUsd }),
  z.strictObject({ ...target, kind: z.literal("units_sold"), value: z.number().int().min(0).max(MAX_QUANTITY) }),
]);
export type OutcomeRequest = z.infer<typeof outcomeRequestSchema>;

export type BuiltOutcome = { ok: true; outcome: Outcome } | { ok: false; status: number; error: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Validates the request against the version and builds the stored row, with its source and estimate. */
export function buildOutcome(req: OutcomeRequest, version: ProjectVersion, access: AccessibleProject["access"]): BuiltOutcome {
  const base = { id: randomUUID(), projectId: req.projectId, version: req.version, source: sourceFor(access), createdAt: new Date().toISOString() };
  if (req.kind === "units_sold") return { ok: true, outcome: { ...base, kind: "units_sold", value: req.value } };

  if (!version.analysis) return { ok: false, status: 422, error: "Analyze this version before entering a quote or cost, so there's an estimate to compare it with." };
  const path = version.analysis.paths.find((p) => p.process === req.process);
  if (!path) return { ok: false, status: 422, error: "That process isn't one of this version's manufacturing paths, so there's no estimate to compare it with." };

  let material: string | undefined;
  if (req.kind === "real_quote" && req.material) {
    material = path.materials.find((m) => m.toLowerCase() === req.material!.toLowerCase());
    if (!material) return { ok: false, status: 400, error: `Pick a material from this path's list: ${path.materials.join(", ")}.` };
  }

  const estimate = unitCostAt(path, req.quantity);
  return {
    ok: true,
    outcome: {
      ...base,
      kind: req.kind,
      process: req.process,
      ...(material && { material }),
      quantity: req.quantity,
      estimateUsd: { low: round2(estimate.low), high: round2(estimate.high) },
      actualUsd: req.actualUsd,
    },
  };
}
