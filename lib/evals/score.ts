import { z } from "zod";
import { unitCostAt } from "../businessCase";
import { PROCESSES } from "../processes";
import type { Analysis, GeometryStats } from "../types";

// Scoring for the eval harness (BACKEND.md 3.7). Pure: evals/run.ts calls
// the real analysis and scores it here.

const range = z.object({ low: z.number().nonnegative(), high: z.number().positive() });
export const goldenCaseSchema = z.strictObject({
  name: z.string().regex(/^[a-z0-9-]+$/),
  notes: z.string().min(10),
  targetQuantity: z.number().int().positive(),
  materialHints: z.array(z.string()),
  geometry: z.strictObject({
    boundingBoxMm: z.object({ x: z.number().positive(), y: z.number().positive(), z: z.number().positive() }),
    volumeCm3: z.number().positive(),
    surfaceAreaCm2: z.number().positive(),
    triangleCount: z.number().int().positive(),
    isWatertight: z.boolean(),
    typicalWallMm: z.number().positive().optional(),
  }),
  expected: z.strictObject({
    /** Processes an experienced engineer would accept as the top pick. */
    bestProcess: z.array(z.enum(PROCESSES)).min(1),
    /** A plausible unit cost at the target quantity. */
    unitCostUsd: range,
    /** Words a part-specific answer should use (case-insensitive substrings). */
    mustMention: z.array(z.string().min(2)).min(1),
  }),
});
export const goldenCasesSchema = z.array(goldenCaseSchema);
export type GoldenCase = z.infer<typeof goldenCaseSchema>;

export type CaseScore = { schemaValid: boolean; processMatch: number; costOverlap: number; specificity: number; mentions: number; total: number };

/** Every sentence the analysis writes, lowercased. */
function allText(a: Analysis): string {
  return [
    a.productSummary,
    ...a.detectedFeatures,
    a.topRecommendation,
    ...a.risks,
    ...a.paths.flatMap((p) => [...p.pros, ...p.cons, ...p.designTweaks.flatMap((t) => [t.change, t.why, t.impact])]),
  ]
    .join("\n")
    .toLowerCase();
}

/** Distinct measured dimensions (box sides, wall) the text uses as numbers; 2 or more is fully specific. */
function specificity(text: string, g: GeometryStats): number {
  const dims = [...new Set([g.boundingBoxMm.x, g.boundingBoxMm.y, g.boundingBoxMm.z, ...(g.typicalWallMm !== undefined ? [g.typicalWallMm] : [])])];
  const found = dims.filter((d) => new RegExp(`(^|[^\\d.])${String(d).replace(".", "\\.")}(?![\\d])`).test(text)).length;
  return Math.min(1, found / 2);
}

export function scoreCase(c: GoldenCase, analysis: Analysis | null): CaseScore {
  if (!analysis) return { schemaValid: false, processMatch: 0, costOverlap: 0, specificity: 0, mentions: 0, total: 0 };
  const [first, second] = analysis.paths;
  const processMatch = c.expected.bestProcess.includes(first.process) ? 1 : second && c.expected.bestProcess.includes(second.process) ? 0.5 : 0;
  const cost = unitCostAt(first, c.targetQuantity);
  const costOverlap = cost.low <= c.expected.unitCostUsd.high && cost.high >= c.expected.unitCostUsd.low ? 1 : 0;
  const text = allText(analysis);
  const spec = specificity(text, { ...c.geometry, thinWallWarning: false } as GeometryStats);
  const mentions = c.expected.mustMention.filter((m) => text.includes(m.toLowerCase())).length / c.expected.mustMention.length;
  const total = Math.round(((processMatch + costOverlap + spec + mentions) / 4) * 100);
  return { schemaValid: true, processMatch, costOverlap, specificity: spec, mentions, total };
}
