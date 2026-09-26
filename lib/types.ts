// Shared contract between Claude Code (main) and Codex (feature branches).
// Do not change these types without updating CLAUDE.md in the same commit.

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  /** Ascending by number and never empty (added in Phase 6). */
  versions: ProjectVersion[];
};

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
};

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
