import { z } from "zod";
import { PRODUCT_CATEGORIES } from "./learning/vocabulary";
import { MAX_QUANTITY_TIERS } from "./businessCase";
import { PROCESSES } from "./processes";
import type { AiInputs, AssemblyPartner, Bom, OrderCoordination, DemoQuote, EtsyListing, StoreListing, LaunchPlan, Outreach, SpecSheet, AppliedTweak, Analysis, BusinessCaseInputs, ShareLink, GeometryStats, Machine, PitchContent, PitchVideo, PriceSuggestion, Project, ProjectVersion, Shop, Sourcing } from "./types";

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
  typicalWallMm: z.number().positive().optional(),
}) satisfies z.ZodType<GeometryStats>;

export const PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{10}$/;

export const appliedTweakSchema = z.object({
  fromVersion: z.number().int().positive(),
  process: processSchema,
  change: z.string().min(1),
  why: z.string(),
  impact: z.string(),
}) satisfies z.ZodType<AppliedTweak>;

// ---------------------------------------------------------------------------
// Business case (Phase 7). The price suggestion has the same two layers as
// the analysis: a structural schema the model is constrained to, and business
// rules that trigger one retry.
// ---------------------------------------------------------------------------

export const MAX_RETAIL_PRICE_USD = 1_000_000;
export const MAX_TIER_QUANTITY = 10_000_000;
const MIN_REASONING_WORDS = 6;

export const priceSuggestionOutputSchema = z.object({
  suggested: z.number().describe("The single retail price in USD you would launch at."),
  low: z.number().describe("Low end of the plausible retail range in USD."),
  high: z.number().describe("High end of the plausible retail range in USD."),
  comparables: z
    .array(z.string())
    .describe("2-5 comparable products or categories with their typical retail price, e.g. 'Boutique fuzz pedals: $150-250'. Name a brand only if you are confident it exists and sells at that price."),
  reasoning: z.string().describe("One or two sentences, under 45 words: why this price for this product and buyer."),
});

export const priceSuggestionSchema = priceSuggestionOutputSchema.superRefine((p, ctx) => {
  if (p.low <= 0) ctx.addIssue({ code: "custom", path: ["low"], message: "must be more than $0" });
  if (p.high > MAX_RETAIL_PRICE_USD) ctx.addIssue({ code: "custom", path: ["high"], message: "is implausibly high" });
  if (!(p.low <= p.suggested && p.suggested <= p.high)) {
    ctx.addIssue({ code: "custom", path: ["suggested"], message: "must be between low and high" });
  }
  if (p.reasoning.trim().split(/\s+/).length < MIN_REASONING_WORDS) {
    ctx.addIssue({ code: "custom", path: ["reasoning"], message: "explain the price in a real sentence" });
  }
  if (p.comparables.length < 2 || p.comparables.length > 5) {
    ctx.addIssue({ code: "custom", path: ["comparables"], message: `need 2-5 comparables, got ${p.comparables.length}` });
  }
}) satisfies z.ZodType<PriceSuggestion>;

export const businessCaseInputsSchema = z.object({
  retailPriceUsd: z.number().positive("Retail price must be more than $0.").max(MAX_RETAIL_PRICE_USD, "That retail price is too high."),
  priceSource: z.enum(["ai", "user"]),
  quantityTiers: z
    .array(z.number().int("Quantities must be whole numbers.").min(1, "Quantities must be at least 1.").max(MAX_TIER_QUANTITY, "Quantities must be 10 million or less."))
    .min(1, "Add at least one quantity.")
    .max(MAX_QUANTITY_TIERS, `Use at most ${MAX_QUANTITY_TIERS} quantities.`)
    .refine((tiers) => tiers.every((q, i) => i === 0 || q > tiers[i - 1]), { message: "Quantities must go from smallest to largest, without repeats." }),
  revenueShare: z.number().min(0.05, "Your share of retail must be at least 5%.").max(1, "Your share of retail can't be more than 100%."),
  // Structural only: the business rules above gate new AI answers, and must
  // not make previously saved projects unreadable when they're tightened.
  priceSuggestion: priceSuggestionOutputSchema.optional(),
}) satisfies z.ZodType<BusinessCaseInputs>;

// ---------------------------------------------------------------------------
// Pitch (Phase 8). Structural schema for the model and for storage; word
// limits gate new AI answers only, and user edits get character limits.
// ---------------------------------------------------------------------------

export const PITCH_WORD_LIMITS = { oneLiner: 16, problem: 70, product: 70, audience: 45, ask: 50 } as const;
export const MAX_PITCH_FIELD_CHARS = 700;
const MIN_PITCH_FIELD_WORDS = 4;

export const pitchOutputSchema = z.object({
  oneLiner: z.string().describe(`One sentence under ${PITCH_WORD_LIMITS.oneLiner} words: what it is and why it matters. No hype words.`),
  problem: z.string().describe(`2-3 sentences under ${PITCH_WORD_LIMITS.problem} words: who has the problem, how they cope today, what that costs them.`),
  product: z.string().describe(`2-3 sentences under ${PITCH_WORD_LIMITS.product} words: what the product is and why it beats the workaround.`),
  audience: z.string().describe(`1-2 sentences under ${PITCH_WORD_LIMITS.audience} words: who buys it and which kind of company would license, make or stock it.`),
  ask: z.string().describe(`1-2 sentences under ${PITCH_WORD_LIMITS.ask} words: what the inventor is asking this company for (e.g. a licensing deal, a pilot run, shelf space).`),
});

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export const pitchAnswerSchema = pitchOutputSchema.superRefine((p, ctx) => {
  for (const [field, limit] of Object.entries(PITCH_WORD_LIMITS) as [keyof typeof PITCH_WORD_LIMITS, number][]) {
    const words = wordCount(p[field]);
    if (words < MIN_PITCH_FIELD_WORDS) ctx.addIssue({ code: "custom", path: [field], message: "write a real sentence" });
    // A little slack: a 72-word problem statement isn't worth a retry.
    if (words > limit * 1.25) ctx.addIssue({ code: "custom", path: [field], message: `keep it under ${limit} words (got ${words})` });
  }
});

const pitchFieldEdit = z.string().trim().min(1, "Pitch fields can't be empty.").max(MAX_PITCH_FIELD_CHARS, `Keep each pitch field under ${MAX_PITCH_FIELD_CHARS} characters.`);

/** What a user may save when editing the pitch text. */
export const pitchEditSchema = z.object({
  oneLiner: pitchFieldEdit,
  problem: pitchFieldEdit,
  product: pitchFieldEdit,
  audience: pitchFieldEdit,
  ask: pitchFieldEdit,
});

export const pitchContentSchema = pitchOutputSchema.extend({ editedByUser: z.boolean() }) satisfies z.ZodType<PitchContent>;

export const pitchVideoSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("none") }),
  z.object({ status: z.literal("ready"), url: z.string().min(1), provider: z.string().min(1) }),
]) satisfies z.ZodType<PitchVideo>;

export const aiInputsSchema = z.object({ includePhotos: z.boolean(), includeNotes: z.boolean() }) satisfies z.ZodType<AiInputs>;

export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export const shareLinkSchema = z.object({
  token: z.string().regex(SHARE_TOKEN_PATTERN),
  enabled: z.boolean(),
  createdAt: z.iso.datetime(),
}) satisfies z.ZodType<ShareLink>;

// ---------------------------------------------------------------------------
// Supplier sourcing (Alibaba). Stored shape only; the AI output schemas and
// the edit operations live in lib/sourcing/schemas.ts.
// ---------------------------------------------------------------------------

export const MAX_SUPPLIERS = 20;
export const MAX_MESSAGES_PER_SUPPLIER = 60;
export const MAX_MESSAGE_CHARS = 4000;
export const SUPPLIER_STATUSES = ["shortlisted", "contacted", "negotiating", "agreed", "dropped"] as const;

export const supplierQuoteSchema = z.object({
  unitUsd: z.number().positive().max(MAX_RETAIL_PRICE_USD).optional(),
  moq: z.number().int().positive().max(MAX_TIER_QUANTITY).optional(),
  toolingUsd: z.number().min(0).max(10_000_000).optional(),
  leadDays: z.number().int().positive().max(365).optional(),
});

export const sourcingSchema = z.object({
  plan: z
    .object({
      process: processSchema,
      createdAt: z.iso.datetime(),
      searchTerms: z.array(z.string()),
      supplierChecks: z.array(z.string()),
      rfq: z.string(),
      rfqSubject: z.string().optional(),
    })
    .optional(),
  suppliers: z
    .array(
      z.object({
        id: z.string().regex(/^[A-Za-z0-9_-]{8,16}$/),
        name: z.string().min(1),
        listingUrl: z.string().optional(),
        email: z.string().optional(),
        status: z.enum(SUPPLIER_STATUSES),
        quote: supplierQuoteSchema.optional(),
        notes: z.string().optional(),
        createdAt: z.iso.datetime(),
        messages: z.array(
          z.object({
            id: z.string().regex(/^[A-Za-z0-9_-]{8,16}$/),
            from: z.enum(["me", "supplier"]),
            text: z.string(),
            subject: z.string().optional(),
            state: z.enum(["draft", "sent"]),
            at: z.iso.datetime(),
            aiDrafted: z.boolean().optional(),
          }),
        ),
      }),
    )
    .max(MAX_SUPPLIERS),
}) satisfies z.ZodType<Sourcing>;

// ---------------------------------------------------------------------------
// Outreach (Phase 10+ build 3): quote requests to local demo shops.
// ---------------------------------------------------------------------------

export const shareLevelSchema = z.enum(["summary", "full"]);
export const quoteStatusSchema = z.enum(["sent", "quoted", "sample", "ordered"]);

export const specSheetSchema = z.object({
  shareLevel: shareLevelSchema,
  process: processSchema,
  dimensionsMm: z.object({ x: z.number().nonnegative(), y: z.number().nonnegative(), z: z.number().nonnegative() }),
  material: z.string().min(1),
  finish: z.string().min(1),
  quantityTiers: z.array(z.number().int().positive()).min(1),
  targetUnitPriceUsd: z.number().positive().optional(),
  quoteBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  renders: z.array(z.string()),
  notes: z.string().optional(),
}) satisfies z.ZodType<SpecSheet>;

export const demoQuoteSchema = z.object({
  id: z.string().min(1),
  shopId: z.string().min(1),
  machineModel: z.string().min(1),
  process: processSchema,
  quantity: z.number().int().positive(),
  unitPriceUsd: z.number().positive(),
  toolingUsd: z.number().nonnegative(),
  leadTimeDays: z.number().int().positive(),
  moq: z.number().int().positive(),
  note: z.string(),
  status: quoteStatusSchema,
  isDemo: z.literal(true),
}) satisfies z.ZodType<DemoQuote>;

export const outreachSchema = z.object({
  requestedAt: z.iso.datetime(),
  specSheet: specSheetSchema,
  quotes: z.array(demoQuoteSchema),
  chosenQuoteId: z.string().optional(),
}) satisfies z.ZodType<Outreach>;

// ---------------------------------------------------------------------------
// Launch plan (build 4). The AI drafts durations, budgets and notes per
// milestone in a fixed order; dates and the production numbers are computed.
// ---------------------------------------------------------------------------

export const MILESTONE_KEYS = ["finalize_design", "prototype", "sample_approval", "tooling", "production", "photos", "listing", "launch"] as const;
const milestoneKeySchema = z.enum(MILESTONE_KEYS);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const milestoneSchema = z.object({
  key: milestoneKeySchema,
  title: z.string().min(1),
  startDate: isoDate,
  endDate: isoDate,
  durationDays: z.number().int().nonnegative(),
  budgetUsd: z.object({ low: z.number().nonnegative(), high: z.number().nonnegative() }),
  note: z.string().optional(),
});

export const launchPlanSchema = z.object({
  generatedAt: z.iso.datetime(),
  startDate: isoDate,
  launchDate: isoDate,
  basedOn: z.discriminatedUnion("kind", [z.object({ kind: z.literal("quote"), quoteId: z.string() }), z.object({ kind: z.literal("analysis") })]),
  milestones: z.array(milestoneSchema),
  warnings: z.array(z.string()),
}) satisfies z.ZodType<LaunchPlan>;

/** What the model returns: one entry per milestone, in MILESTONE_KEYS order. */
export const planDraftOutputSchema = z.object({
  milestones: z
    .array(
      z.object({
        key: milestoneKeySchema,
        title: z.string().describe("Short, specific to this product, under 6 words."),
        durationDays: z.number().describe("Calendar days for this step. Use 0 only for tooling when there is no tooling."),
        budgetLowUsd: z.number().describe("Low end of this step's cost in USD (estimate)."),
        budgetHighUsd: z.number().describe("High end of this step's cost in USD (estimate)."),
        note: z.string().describe("One sentence, under 25 words: what to do and what to watch for."),
      }),
    )
    .describe("Exactly 8 milestones in this order: finalize_design, prototype, sample_approval, tooling, production, photos, listing, launch."),
  warnings: z.array(z.string()).describe("0-3 one-sentence warnings about timing or budget risks specific to this plan."),
});

export const planDraftSchema = planDraftOutputSchema.superRefine((d, ctx) => {
  const keys = d.milestones.map((m) => m.key).join(",");
  if (keys !== MILESTONE_KEYS.join(",")) ctx.addIssue({ code: "custom", path: ["milestones"], message: `must be exactly ${MILESTONE_KEYS.join(", ")} in that order` });
  d.milestones.forEach((m, i) => {
    if (m.durationDays < 0 || m.durationDays > 365) ctx.addIssue({ code: "custom", path: ["milestones", i, "durationDays"], message: "must be 0-365" });
    if (m.budgetLowUsd < 0 || m.budgetHighUsd < m.budgetLowUsd) ctx.addIssue({ code: "custom", path: ["milestones", i], message: "budget high must be >= low >= 0" });
  });
  if (d.warnings.length > 3) ctx.addIssue({ code: "custom", path: ["warnings"], message: "at most 3 warnings" });
});

// ---------------------------------------------------------------------------
// Etsy listing (build 5). Etsy's limits: title <= 140 chars, 13 tags, each
// tag <= 20 chars.
// ---------------------------------------------------------------------------

export const ETSY_TITLE_MAX = 140;
export const ETSY_TAG_COUNT = 13;
export const ETSY_TAG_MAX = 20;

export const etsyListingSchema = z.object({
  title: z.string().min(1).max(ETSY_TITLE_MAX),
  description: z.string().min(1),
  tags: z.array(z.string().min(1).max(ETSY_TAG_MAX)).length(ETSY_TAG_COUNT),
  priceUsd: z.number().positive(),
  photos: z.array(z.string()),
  generatedAt: z.iso.datetime(),
}) satisfies z.ZodType<EtsyListing>;

export const storeListingSchema = z.object({
  channel: z.literal("etsy"),
  listingId: z.string().min(1),
  url: z.string().min(1),
  state: z.literal("draft"),
  photosUploaded: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
}) satisfies z.ZodType<StoreListing>;

export const listingDraftOutputSchema = z.object({
  title: z.string().describe(`Etsy title, at most ${ETSY_TITLE_MAX} characters: what it is first, then key buyer search words. No ALL CAPS, no emoji.`),
  description: z.string().describe("Etsy description, 120-220 words, plain text with short paragraphs and '- ' bullets: what it is, who it's for, key features and dimensions, materials, what's in the box. No claims the brief doesn't support."),
  tags: z.array(z.string()).describe(`Exactly ${ETSY_TAG_COUNT} Etsy tags, each at most ${ETSY_TAG_MAX} characters, lowercase, distinct phrases buyers search for.`),
});

export const listingDraftSchema = listingDraftOutputSchema.superRefine((d, ctx) => {
  if (d.title.length > ETSY_TITLE_MAX) ctx.addIssue({ code: "custom", path: ["title"], message: `must be at most ${ETSY_TITLE_MAX} characters (got ${d.title.length})` });
  if (d.tags.length !== ETSY_TAG_COUNT) ctx.addIssue({ code: "custom", path: ["tags"], message: `need exactly ${ETSY_TAG_COUNT} tags, got ${d.tags.length}` });
  d.tags.forEach((t, i) => {
    if (t.trim().length === 0 || t.length > ETSY_TAG_MAX) ctx.addIssue({ code: "custom", path: ["tags", i], message: `"${t}" must be 1-${ETSY_TAG_MAX} characters` });
  });
  if (new Set(d.tags.map((t) => t.trim().toLowerCase())).size !== d.tags.length) ctx.addIssue({ code: "custom", path: ["tags"], message: "tags must be distinct" });
  if (d.description.trim().split(/\s+/).length < 60) ctx.addIssue({ code: "custom", path: ["description"], message: "write a fuller description (at least 60 words)" });
});

// ---------------------------------------------------------------------------
// Bill of materials. Stored shape only; the AI output schema and the edit
// schema live in lib/bom/schemas.ts.
// ---------------------------------------------------------------------------

export const BOM_CATEGORIES = ["custom_part", "hardware", "electronics", "material", "finish", "packaging"] as const;
export const BOM_UNITS = ["pc", "set", "g", "m", "ml"] as const;
export const MAX_BOM_ITEMS = 40;
export const BOM_ITEM_ID = /^[A-Za-z0-9_-]{8,16}$/;

export const costRangeSchema = z
  .object({ low: z.number().min(0).max(100_000), high: z.number().min(0).max(100_000) })
  .refine((r) => r.low <= r.high, { message: "The low cost can't be above the high cost." });

export const bomSchema = z.object({
  process: processSchema,
  generatedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime().optional(),
  items: z
    .array(
      z.object({
        id: z.string().regex(BOM_ITEM_ID),
        category: z.enum(BOM_CATEGORIES),
        name: z.string().min(1),
        spec: z.string(),
        quantityPerProduct: z.number().positive(),
        unit: z.enum(BOM_UNITS),
        process: processSchema.optional(),
        costPerProductUsd: costRangeSchema.optional(),
        notes: z.string().optional(),
        source: z.enum(["ai", "user"]),
      }),
    )
    .max(MAX_BOM_ITEMS),
  assumptions: z.array(z.string()),
  editedByUser: z.boolean(),
}) satisfies z.ZodType<Bom>;

// ---------------------------------------------------------------------------
// Order coordination: the user's choices only (the plan is computed).
// ---------------------------------------------------------------------------

export const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{8,16}$/;
export const MAX_ORDER_LINES = 40;
export const MAX_ORDER_MESSAGES = 120;
export const MAX_RUN_QUANTITY = 100_000;

export const assemblyCapabilitySchema = z.enum(["mechanical", "electronics", "adhesive_bonding", "finishing", "testing", "kitting", "packaging", "fulfillment"]);

export const orderSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("local_quote"), quoteId: z.string().min(1).max(40) }),
  z.object({ kind: z.literal("alibaba"), supplierId: z.string().regex(ORDER_ID_PATTERN) }),
  z.object({
    kind: z.literal("catalog"),
    vendor: z.string().trim().min(1, "Name the vendor.").max(120, "Keep the vendor name under 120 characters."),
    unitUsd: z.number().positive("Enter a price above $0.").max(100_000),
    leadDays: z.number().int().min(0).max(365),
    moq: z.number().int().positive().max(1_000_000).optional(),
    overseas: z.boolean(),
  }),
]);

export const orderRecipientSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("local_quote"), quoteId: z.string().min(1).max(40) }),
  z.object({ kind: z.literal("alibaba"), supplierId: z.string().regex(ORDER_ID_PATTERN) }),
  z.object({ kind: z.literal("assembler"), assemblerId: z.string().regex(/^[a-z0-9-]+$/) }),
]);

export const orderMessagePurposeSchema = z.enum(["purchase_order", "assembly_rfq"]);

export const orderCoordinationSchema = z.object({
  runQuantity: z.number().int().positive().max(MAX_RUN_QUANTITY),
  assignments: z.array(z.object({ lineId: z.string().min(1).max(64), source: orderSourceSchema })).max(MAX_ORDER_LINES),
  assemblerId: z.string().optional(),
  messages: z
    .array(
      z.object({
        id: z.string().regex(ORDER_ID_PATTERN),
        to: orderRecipientSchema,
        purpose: orderMessagePurposeSchema,
        subject: z.string(),
        text: z.string(),
        state: z.enum(["draft", "sent"]),
        at: z.iso.datetime(),
        aiDrafted: z.boolean().optional(),
      }),
    )
    .max(MAX_ORDER_MESSAGES),
  signOff: z.object({ at: z.iso.datetime(), fingerprint: z.string(), landedTotalUsd: z.object({ low: z.number().nonnegative(), high: z.number().nonnegative() }) }).optional(),
}) satisfies z.ZodType<OrderCoordination>;

export const assemblyPartnerSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    neighborhood: z.string().min(1),
    description: z.string().min(1),
    capabilities: z.array(assemblyCapabilitySchema).min(1),
    minUnits: z.number().int().positive(),
    maxUnits: z.number().int().positive(),
    setupUsd: z.number().nonnegative(),
    laborUsdPerMinute: z.number().positive(),
    leadDays: z.number().int().positive(),
    idleThisMonth: z.boolean(),
    isDemoData: z.literal(true),
  })
  .refine((a) => a.minUnits <= a.maxUnits, { message: "minUnits must be <= maxUnits" }) satisfies z.ZodType<AssemblyPartner>;

export const assemblyPartnersSchema = z.array(assemblyPartnerSchema).refine((list) => new Set(list.map((a) => a.id)).size === list.length, {
  message: "assembler ids must be unique",
});

export const projectVersionSchema = z.object({
  number: z.number().int().positive(),
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
  basedOn: z.number().int().positive().optional(),
  changeNote: z.string().max(1000).optional(),
  appliedTweak: appliedTweakSchema.optional(),
  businessCase: businessCaseInputsSchema.optional(),
  pitch: pitchContentSchema.optional(),
  pitchVideo: pitchVideoSchema.optional(),
  aiInputs: aiInputsSchema.optional(),
  sourcing: sourcingSchema.optional(),
  outreach: outreachSchema.optional(),
  plan: launchPlanSchema.optional(),
  listing: etsyListingSchema.optional(),
  storeListings: z.array(storeListingSchema).optional(),
  bom: bomSchema.optional(),

// ---------------------------------------------------------------------------
  order: orderCoordinationSchema.optional(),
}) satisfies z.ZodType<ProjectVersion>;

export const projectSchema = z.object({
  id: z.string().regex(PROJECT_ID_PATTERN),
  name: z.string().min(1),
  createdAt: z.iso.datetime(),
  versions: z
    .array(projectVersionSchema)
    .min(1, "a project needs at least one version")
    .refine((vs) => vs.every((v, i) => i === 0 || v.number > vs[i - 1].number), {
      message: "versions must be in ascending order with unique numbers",
    }),
  owner: z.object({ keyHash: z.string().regex(/^[0-9a-f]{64}$/) }).optional(),
  isExample: z.literal(true).optional(),
  share: shareLinkSchema.optional(),
  learning: z.object({ contribute: z.boolean(), updatedAt: z.string() }).optional(),
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

/** Volumes at which the model prices each path, for the cost-by-quantity chart. */
export const COST_CURVE_QUANTITIES = [10, 100, 1000, 10000] as const;

const unitCostAtVolumeSchema = z
  .array(z.object({ quantity: z.number(), low: z.number(), high: z.number() }))
  .describe(
    "Per-part cost in USD excluding tooling at exactly 10, 100, 1000 and 10000 units, in that order, as low-high estimates. Include volumes where the process is impractical, priced honestly.",
  );

const manufacturingPathBase = z.object({
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

// The model must always price every volume; stored analyses from before the
// curve existed (Phase 5 and earlier) are still valid without it.
const manufacturingPathOutputSchema = manufacturingPathBase.extend({ unitCostAtVolume: unitCostAtVolumeSchema });
const manufacturingPathSchema = manufacturingPathBase.extend({ unitCostAtVolume: unitCostAtVolumeSchema.optional() });

const storyboardShotSchema = z.object({
  shot: z.number(),
  visual: z.string().describe("What the camera sees."),
  voiceover: z.string().describe("The spoken line."),
  seconds: z.number(),
});

export const analysisOutputSchema = z.object({
  productSummary: z.string().describe("2 sentences, under 50 words: what it is, who buys it, and the key manufacturing takeaway."),
  detectedFeatures: z.array(z.string()).describe("4-8 short noun phrases (under 8 words each) naming physical features of this part."),
  paths: z.array(manufacturingPathOutputSchema).describe("2-4 candidate processes, best fit first."),
  topRecommendation: z.string().describe("2-3 sentences, under 70 words: the path to take now, and the quantity where that changes."),
  risks: z.array(z.string()).describe("3-5 one-sentence risks, most important first."),
  storyboard: z.array(storyboardShotSchema).describe("Exactly 6 shots of a 30-second commercial, seconds summing to 30."),
  category: z.enum(PRODUCT_CATEGORIES).describe("What kind of product this is, from the fixed list; \"other\" if none fits."),
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

/** Structure of a stored analysis (curve optional), before the business rules. */
// category is optional here: analyses saved before B2 don't have one.
export const storedAnalysisShape = analysisOutputSchema.extend({ paths: z.array(manufacturingPathSchema), category: z.enum(PRODUCT_CATEGORIES).optional() });

export const analysisSchema = storedAnalysisShape.superRefine((a, ctx) => {
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
    if (p.unitCostAtVolume) {
      const quantities = p.unitCostAtVolume.map((v) => v.quantity);
      if (quantities.join(",") !== COST_CURVE_QUANTITIES.join(",")) {
        ctx.addIssue({
          code: "custom",
          path: ["paths", i, "unitCostAtVolume"],
          message: `must price exactly ${COST_CURVE_QUANTITIES.join(", ")} units in that order, got ${quantities.join(", ")}`,
        });
      }
      p.unitCostAtVolume.forEach((v, j) => checkRange(ctx, ["paths", i, "unitCostAtVolume", j], v, 0.01));
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
