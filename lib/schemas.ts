import { z } from "zod";
import { PROCESSES } from "./processes";
import type { Analysis, GeometryStats, Machine, Project, Shop } from "./types";

const dimsMm = z.object({
  x: z.number().positive(),
  y: z.number().positive(),
  z: z.number().positive(),
});

export const processSchema = z.enum(PROCESSES);

export const machineSchema = z.object({
  type: processSchema,
  model: z.string().min(1),
  envelopeMm: dimsMm,
  materials: z.array(z.string().min(1)).min(1),
  idleThisMonth: z.boolean(),
  idleHoursPerWeek: z.number().positive().max(168).optional(),
}) satisfies z.ZodType<Machine>;

export const shopSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    neighborhood: z.string().min(1),
    description: z.string().min(1),
    machines: z.array(machineSchema).min(1),
    minOrderQty: z.number().int().positive(),
    maxOrderQty: z.number().int().positive(),
    typicalLeadDays: z.number().int().positive(),
    specialties: z.array(z.string().min(1)),
    isDemoData: z.literal(true),
  })
  .refine((s) => s.minOrderQty <= s.maxOrderQty, {
    message: "minOrderQty must be <= maxOrderQty",
  }) satisfies z.ZodType<Shop>;

export const shopsSchema = z.array(shopSchema).refine(
  (shops) => new Set(shops.map((s) => s.id)).size === shops.length,
  { message: "shop ids must be unique" },
);

export const geometryStatsSchema = z.object({
  // Nonnegative, not positive: a zero-thickness surface mesh is still readable.
  boundingBoxMm: z.object({
    x: z.number().nonnegative(),
    y: z.number().nonnegative(),
    z: z.number().nonnegative(),
  }),
  volumeCm3: z.number().nonnegative(),
  surfaceAreaCm2: z.number().nonnegative(),
  triangleCount: z.number().int().positive(),
  isWatertight: z.boolean(),
  thinWallWarning: z.boolean().optional(),
}) satisfies z.ZodType<GeometryStats>;

export const PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{10}$/;

export const projectSchema = z.object({
  id: z.string().regex(PROJECT_ID_PATTERN),
  name: z.string().min(1),
  createdAt: z.iso.datetime(),
  notes: z.string(),
  targetQuantity: z.number().int().positive(),
  budgetUsd: z.number().positive().optional(),
  materialHints: z.array(z.string()).optional(),
  cadFileUrl: z.string().optional(),
  imageUrls: z.array(z.string()),
  geometry: geometryStatsSchema.optional(),
  analysis: z.lazy(() => analysisSchema).optional(),
  renders: z.array(z.string()).optional(),
}) satisfies z.ZodType<Project>;

// ---------------------------------------------------------------------------
// Analysis. Two layers:
//  - analysisOutputSchema is purely structural. It is what the model is
//    constrained to (structured outputs don't support numeric bounds), with
//    descriptions that act as field-level instructions.
//  - analysisSchema adds the business rules (ranges ordered, 2-4 paths,
//    6 storyboard shots ~30 s). Model output failing these gets one retry.
// ---------------------------------------------------------------------------

const usdRange = z.object({ low: z.number(), high: z.number() });

const designTweakSchema = z.object({
  change: z.string().describe("The concrete geometry or spec change, referencing this part's features and dimensions."),
  why: z.string().describe("Why it helps for this process at this quantity."),
  impact: z.string().describe("Expected effect, quantified where possible (e.g. '~20% lower unit cost', 'removes a second setup')."),
});

const manufacturingPathSchema = z.object({
  process: processSchema,
  // Plain numbers, not .int(): .int() leaks safe-integer bounds into the
  // schema description the model sees. normalizeAnalysis() rounds instead.
  fitScore: z.number().describe("0-100 fit for this part at the target quantity."),
  unitCostUsd: usdRange.describe("Per-part cost at the target quantity, excluding tooling. USD estimate."),
  toolingCostUsd: usdRange.describe("One-time tooling/fixture/mold cost in USD. 0-0 if none."),
  leadTimeDays: usdRange.describe("Calendar days from order to first delivered parts."),
  materials: z.array(z.string()).describe("Specific grades suited to this part, best first."),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  designTweaks: z.array(designTweakSchema).describe("2-3 tweaks that make this path cheaper or more reliable."),
});

const storyboardShotSchema = z.object({
  shot: z.number(),
  visual: z.string().describe("What the camera sees."),
  voiceover: z.string().describe("The spoken line."),
  seconds: z.number(),
});

export const analysisOutputSchema = z.object({
  productSummary: z.string().describe("2 sentences, under 50 words: what it is, who buys it, and the key manufacturing takeaway."),
  detectedFeatures: z.array(z.string()).describe("4-8 short noun phrases (under 8 words each) naming physical features of this part."),
  paths: z.array(manufacturingPathSchema).describe("2-4 candidate processes, best fit first."),
  topRecommendation: z.string().describe("2-3 sentences, under 70 words: the path to take now, and the quantity where that changes."),
  risks: z.array(z.string()).describe("3-5 one-sentence risks, most important first."),
  storyboard: z.array(storyboardShotSchema).describe("Exactly 6 shots of a 30-second commercial, seconds summing to 30."),
});

export const MIN_PATHS = 2;
export const MAX_PATHS = 4;
export const STORYBOARD_SHOTS = 6;
export const STORYBOARD_SECONDS = { min: 25, max: 35 } as const;

function checkRange(
  ctx: z.RefinementCtx,
  path: (string | number)[],
  range: { low: number; high: number },
  minLow: number,
) {
  if (range.low < minLow) {
    ctx.addIssue({ code: "custom", path, message: `low must be at least ${minLow}` });
  }
  if (range.high < range.low) {
    ctx.addIssue({ code: "custom", path, message: "high must be >= low" });
  }
}

export const analysisSchema = analysisOutputSchema.superRefine((a, ctx) => {
  if (a.paths.length < MIN_PATHS || a.paths.length > MAX_PATHS) {
    ctx.addIssue({ code: "custom", path: ["paths"], message: `need ${MIN_PATHS}-${MAX_PATHS} paths, got ${a.paths.length}` });
  }
  a.paths.forEach((p, i) => {
    if (p.fitScore < 0 || p.fitScore > 100) {
      ctx.addIssue({ code: "custom", path: ["paths", i, "fitScore"], message: "must be 0-100" });
    }
    checkRange(ctx, ["paths", i, "unitCostUsd"], p.unitCostUsd, 0.01);
    checkRange(ctx, ["paths", i, "toolingCostUsd"], p.toolingCostUsd, 0);
    checkRange(ctx, ["paths", i, "leadTimeDays"], p.leadTimeDays, 1);
    if (p.designTweaks.length === 0) {
      ctx.addIssue({ code: "custom", path: ["paths", i, "designTweaks"], message: "give at least one tweak" });
    }
  });
  if (a.storyboard.length !== STORYBOARD_SHOTS) {
    ctx.addIssue({ code: "custom", path: ["storyboard"], message: `need exactly ${STORYBOARD_SHOTS} shots, got ${a.storyboard.length}` });
  }
  const total = a.storyboard.reduce((sum, s) => sum + s.seconds, 0);
  if (total < STORYBOARD_SECONDS.min || total > STORYBOARD_SECONDS.max) {
    ctx.addIssue({ code: "custom", path: ["storyboard"], message: `shots should total ~30 seconds, got ${total}` });
  }
  if (a.storyboard.some((s) => s.seconds <= 0)) {
    ctx.addIssue({ code: "custom", path: ["storyboard"], message: "every shot needs a positive duration" });
  }
}) satisfies z.ZodType<Analysis>;
