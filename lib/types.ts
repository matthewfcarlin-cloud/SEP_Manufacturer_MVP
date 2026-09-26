// Shared contract between Claude Code (main) and Codex (feature branches).
// Do not change these types without updating CLAUDE.md in the same commit.

export type Project = {
  id: string;
  name: string;
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
