// Shared contract between Claude Code (main) and Codex (feature branches).
// Do not change these types without updating CLAUDE.md in the same commit.

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  /** Ascending by number and never empty (added in Phase 6). */
  versions: ProjectVersion[];
  /** The browser that owns it: a SHA-256 hash of its owner cookie (Phase 9). Absent on examples. */
  owner?: { keyHash: string };
  /** A shared demo anyone can open and edit, but not delete. */
  isExample?: true;
  /** Public pitch link. Off by default; the owner can turn it off or rotate the token. */
  share?: ShareLink;
};

export type ShareLink = { token: string; enabled: boolean; createdAt: string };

/** What the owner lets the AI see for a version. Absent means everything. */
export type AiInputs = { includePhotos: boolean; includeNotes: boolean };

/** One iteration of a product idea: its own file, photos, brief, and analysis. */
export type ProjectVersion = {
  /** 1, 2, 3… Never reused, even after a version is deleted. */
  number: number;
  createdAt: string;
  notes: string;
  targetQuantity: number;
  budgetUsd?: number;
  materialHints?: string[];
  cadFileUrl?: string;
  imageUrls: string[];
  geometry?: GeometryStats;
  analysis?: Analysis;
  renders?: string[];
  /** The version this one was revised from. */
  basedOn?: number;
  /** "What changed", written by the user on the new-version form. */
  changeNote?: string;
  /** Set when the user picked one of the AI's design tweaks as the reason. */
  appliedTweak?: AppliedTweak;
  /** Inputs for this version's business case (added in Phase 7). Outputs are computed, never stored. */
  businessCase?: BusinessCaseInputs;
  /** Licensing-pitch text for a company decision-maker (added in Phase 8). */
  pitch?: PitchContent;
  /** Slot for a generated pitch video; nothing generates one yet. */
  pitchVideo?: PitchVideo;
  /** Photos and notes can be withheld from every AI call (Phase 9). */
  aiInputs?: AiInputs;
  /** Overseas supplier sourcing (Alibaba): AI search plan, the user's shortlist and drafted messages. */
  sourcing?: Sourcing;
  /** Quote requests to the matched local demo shops, and their simulated quotes (Phase 10+ build 3). */
  outreach?: Outreach;
  /** Bill of materials: the AI's first draft, corrected by the user. Feeds supplier sourcing. */
  bom?: Bom;
};

/** What kind of line a BOM item is. Only custom parts are made to the inventor's drawing; the rest are bought. */
export type BomCategory = "custom_part" | "hardware" | "electronics" | "material" | "finish" | "packaging";

export type BomUnit = "pc" | "set" | "g" | "m" | "ml";

export type BomItem = {
  id: string;
  category: BomCategory;
  /** "Enclosure body", "Button-head screw" */
  name: string;
  /** What a supplier needs to quote or pick it: material, size, standard, finish. */
  spec: string;
  /** Per finished product. */
  quantityPerProduct: number;
  unit: BomUnit;
  /** How a custom part is made. Only on custom parts. */
  process?: Process;
  /** Estimated cost of this line for one finished product, at the target quantity. */
  costPerProductUsd?: { low: number; high: number };
  /** Private to the inventor; never sent to suppliers. */
  notes?: string;
  /** "ai" until the user changes the line. */
  source: "ai" | "user";
};

export type Bom = {
  /** The manufacturing path the BOM was drafted for. */
  process: Process;
  generatedAt: string;
  updatedAt?: string;
  items: BomItem[];
  /** What the AI assumed where the brief was silent. */
  assumptions: string[];
  editedByUser: boolean;
};

/** How far a quote request goes. Private by default: a spec summary, no renders or notes. */
export type ShareLevel = "summary" | "full";

/** What a quote request carries, built from the version and its business case. */
export type SpecSheet = {
  shareLevel: ShareLevel;
  process: Process;
  dimensionsMm: { x: number; y: number; z: number };
  material: string;
  finish: string;
  quantityTiers: number[];
  /** Highest unit price that keeps a healthy margin at the retail price, if there's a business case. */
  targetUnitPriceUsd?: number;
  /** Date quotes are requested by (YYYY-MM-DD). */
  quoteBy: string;
  /** Only with shareLevel "full". */
  renders: string[];
  /** Only with shareLevel "full" and notes allowed in the AI settings. */
  notes?: string;
};

export type QuoteStatus = "sent" | "quoted" | "sample" | "ordered";

/** A simulated quote from a fictional demo shop, priced inside the analysis cost range. Always shown as "Demo quote". */
export type DemoQuote = {
  id: string;
  shopId: string;
  machineModel: string;
  process: Process;
  quantity: number;
  unitPriceUsd: number;
  toolingUsd: number;
  leadTimeDays: number;
  moq: number;
  note: string;
  status: QuoteStatus;
  isDemo: true;
};

export type Outreach = {
  requestedAt: string;
  specSheet: SpecSheet;
  quotes: DemoQuote[];
  chosenQuoteId?: string;
};

/**
 * Alibaba sourcing for one version. Alibaba has no buyer API and forbids
 * automated access, so Idlefit never contacts a supplier: the AI plans the
 * search and drafts messages, and the user sends each one themselves.
 */
export type Sourcing = { plan?: SourcingPlan; suppliers: Supplier[] };

export type SourcingPlan = {
  /** The manufacturing path being sourced. */
  process: Process;
  createdAt: string;
  /** 3-5 phrases to type into Alibaba's search box. */
  searchTerms: string[];
  /** What to check on a listing or supplier profile before shortlisting. */
  supplierChecks: string[];
  /** A request for quotation carrying spec-level facts only, ready to paste or email. */
  rfq: string;
  /** Email subject line for the RFQ (plans made before email generation have none). */
  rfqSubject?: string;
};

export type SupplierStatus = "shortlisted" | "contacted" | "negotiating" | "agreed" | "dropped";

export type Supplier = {
  id: string;
  name: string;
  listingUrl?: string;
  /** The supplier's published sales email, entered by the user. Drafts open in the user's own email app. */
  email?: string;
  status: SupplierStatus;
  /** The latest terms the supplier offered, as typed in by the user. */
  quote?: SupplierQuote;
  notes?: string;
  createdAt: string;
  /** Oldest first. At most one message is an unsent draft, and it is always the last. */
  messages: SupplierMessage[];
};

export type SupplierQuote = { unitUsd?: number; moq?: number; toolingUsd?: number; leadDays?: number };

export type SupplierMessage = {
  id: string;
  from: "me" | "supplier";
  text: string;
  /** Email subject line, on messages the user writes. */
  subject?: string;
  /** "draft" until the user says they sent it themselves. Supplier messages are always "sent". */
  state: "draft" | "sent";
  at: string;
  aiDrafted?: boolean;
};

export type PitchContent = {
  oneLiner: string;
  /** Who has the problem and what it costs them. */
  problem: string;
  /** What the product is and why it's better. */
  product: string;
  /** Who buys it, and which kind of company would license or stock it. */
  audience: string;
  /** What the inventor wants from the company. */
  ask: string;
  editedByUser: boolean;
};

export type PitchVideo = { status: "none" } | { status: "ready"; url: string; provider: string };

export type BusinessCaseInputs = {
  retailPriceUsd: number;
  priceSource: "ai" | "user";
  /** 1-5 run sizes, ascending. */
  quantityTiers: number[];
  /** Share of retail the maker actually receives (the rest is retail/distribution margin). */
  revenueShare: number;
  priceSuggestion?: PriceSuggestion;
};

/** The AI's retail price estimate, from its general knowledge of similar products. */
export type PriceSuggestion = {
  low: number;
  high: number;
  suggested: number;
  comparables: string[];
  reasoning: string;
};

export type AppliedTweak = {
  fromVersion: number;
  process: Process;
  change: string;
  why: string;
  impact: string;
};

export type GeometryStats = {
  boundingBoxMm: { x: number; y: number; z: number };
  volumeCm3: number;
  surfaceAreaCm2: number;
  triangleCount: number;
  isWatertight: boolean;
  thinWallWarning?: boolean;
  /** Area-weighted median material thickness in mm (added in Phase 5). */
  typicalWallMm?: number;
};

export type Process =
  | "cnc_milling"
  | "cnc_turning"
  | "fdm_print"
  | "sla_print"
  | "sls_print"
  | "injection_molding"
  | "sheet_metal"
  | "laser_cutting"
  | "urethane_casting";

export type ManufacturingPath = {
  process: Process;
  fitScore: number; // 0-100
  unitCostUsd: { low: number; high: number };
  toolingCostUsd: { low: number; high: number };
  leadTimeDays: { low: number; high: number };
  materials: string[];
  pros: string[];
  cons: string[];
  designTweaks: { change: string; why: string; impact: string }[];
  /** Per-part cost excluding tooling at 10 / 100 / 1k / 10k units (added in round 2). */
  unitCostAtVolume?: { quantity: number; low: number; high: number }[];
};

export type Analysis = {
  productSummary: string;
  detectedFeatures: string[];
  paths: ManufacturingPath[]; // sorted by fitScore desc
  topRecommendation: string;
  risks: string[];
  storyboard: { shot: number; visual: string; voiceover: string; seconds: number }[];
};

export type Machine = {
  type: Process;
  model: string;
  envelopeMm: { x: number; y: number; z: number };
  materials: string[];
  idleThisMonth: boolean;
  idleHoursPerWeek?: number;
};

export type Shop = {
  id: string;
  name: string;
  neighborhood: string; // LA-area
  description: string;
  machines: Machine[];
  minOrderQty: number;
  maxOrderQty: number;
  typicalLeadDays: number;
  specialties: string[];
  isDemoData: true;
};

export type ShopMatch = {
  shopId: string;
  score: number;
  matchedMachine: Machine;
  reasons: string[];
  requiredTweaks: string[];
  idleBoost: boolean;
};

/** One turn of a build-agent conversation (Phase 10). Conversations aren't stored; the browser keeps them. */
export type AgentMessage = { role: "user" | "assistant"; content: string };

/** The creator journey's six stages (Phase 10+). Derived from a product's data, never stored. */
export type Stage = "idea" | "design" | "make" | "money" | "launch" | "sell";

/** What an AI call is for (BACKEND.md A1). The gateway routes model, effort and budget by task. */
export type AiTask = "analyze" | "agent_chat" | "price" | "pitch" | "sourcing_plan" | "negotiation" | "bom";

/** Whose API key paid for a call: the creator's own (A2) or the house demo key. */
export type KeySource = "user" | "house";

/**
 * One AI call, as metered by the gateway. Never holds prompt or response
 * content. `workspaceId` is the browser's owner-cookie hash.
 */
export type UsageRecord = {
  at: string;
  workspaceId: string;
  task: AiTask;
  provider: "anthropic";
  model: string; // the model that served the call (may be a fallback), or the routed model if it failed
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  estCostUsd: number;
  keySource: KeySource;
  latencyMs: number;
  ok: boolean;
  errorKind?: AiErrorKind;
};

/**
 * Why an AI request failed, as the UI sees it (the `code` on an error response).
 * - invalid_key: the provider rejected the key (the creator's, or the house key)
 * - quota_exceeded: the key's account is rate-limited or out of credit
 * - budget_exhausted: no key of their own and the demo budget is used up
 * - provider_down: the provider is unreachable or returned an error
 */
export type AiErrorCode = "invalid_key" | "quota_exceeded" | "budget_exhausted" | "provider_down";

/** Provider failures, normalized so nothing outside lib/ai/ needs the SDK's error classes. */
export type AiErrorKind = Exclude<AiErrorCode, "budget_exhausted">;

/** A workspace's saved AI key, as the API shows it: masked, never the key itself. */
export type AiKeyInfo = { provider: "anthropic"; maskedKey: string; createdAt: string }; // maskedKey like "sk-ant-…7Q2f"

/** GET /api/usage: what pays for this browser's AI calls, for the header pill. */
export type UsageSummary = { keySource: KeySource; maskedKey?: string; demoBudgetRemainingUsd: number };

// Learning pipeline (BACKEND.md B1). Events log what creators do; outcomes
// are ground truth (real quotes, costs, sales). Both hold structured fields
// only: no free text, photos or files. `source` is decided by the server:
// "real" only for the creator's own project and real data; examples and
// anything built on simulated quotes are "demo", and learning never reads demo.
export type LearningSource = "demo" | "real";

export type ProductEventType =
  | "analysis_run" | "tweak_applied" | "tweak_rated" | "quote_requested" | "quote_chosen"
  | "plan_generated" | "listing_generated" | "listing_copied" | "agent_question" | "agent_rated";

export type ProductEvent = {
  id: string;
  workspaceId: string; // owner-cookie hash of the browser that acted
  projectId: string;
  version?: number;
  type: ProductEventType;
  payload: Record<string, string | number | boolean>; // per-type schema in lib/learning/events.ts
  source: LearningSource;
  createdAt: string;
};

export type OutcomeKind = "real_quote" | "actual_unit_cost" | "units_sold" | "tweak_cost_delta";

export type Outcome = {
  id: string;
  projectId: string;
  version: number;
  kind: OutcomeKind;
  process?: Process;
  material?: string; // one of the analysis path's materials, never free text
  quantity?: number;
  estimateUsd?: { low: number; high: number }; // the analysis's unit-cost range at `quantity`, computed server-side
  actualUsd?: number; // per unit
  value?: number; // units_sold: units
  source: LearningSource;
  createdAt: string;
};
