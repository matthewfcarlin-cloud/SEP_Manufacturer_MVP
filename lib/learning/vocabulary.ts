import type { MaterialFamily, ProductCategory, SizeBucket } from "../types";

// Fixed vocabularies for similar-product features. Everything another
// creator's prompt can see about a product is one of these words or a number.

export const PRODUCT_CATEGORIES = [
  "enclosure",
  "bracket_mount",
  "holder_stand",
  "case_cover",
  "knob_handle",
  "clip_fastener",
  "gear_mechanism",
  "container",
  "organizer",
  "kitchen_tool",
  "lighting",
  "wearable",
  "toy_game",
  "decor",
  "tool_part",
  "other",
] as const satisfies readonly ProductCategory[];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  enclosure: "enclosure",
  bracket_mount: "bracket or mount",
  holder_stand: "holder or stand",
  case_cover: "case or cover",
  knob_handle: "knob or handle",
  clip_fastener: "clip or fastener",
  gear_mechanism: "gear or mechanism",
  container: "container",
  organizer: "organizer",
  kitchen_tool: "kitchen tool",
  lighting: "lighting",
  wearable: "wearable",
  toy_game: "toy or game",
  decor: "decor",
  tool_part: "tool or part",
  other: "other product",
};

// Checked in order: the first family whose pattern matches wins, so the more
// specific names come first ("stainless" before "steel", "PC/ABS" is
// polycarbonate, glass-filled nylon is nylon).
const MATERIAL_PATTERNS: [MaterialFamily, RegExp][] = [
  ["stainless", /stainless|\bss ?3\d\d\b/i],
  ["aluminum", /alumin/i],
  ["titanium", /titanium/i],
  ["brass_copper", /brass|bronze|copper/i],
  ["steel", /steel|\bcrs\b|\bhrs\b/i],
  ["nylon", /nylon|\bpa ?\d{1,2}\b/i],
  ["polycarbonate", /polycarbonate|\bpc\b/i],
  ["abs", /\babs\b/i],
  ["acetal", /delrin|acetal|\bpom\b/i],
  ["pla_petg", /\bpla\b|petg/i],
  ["resin", /resin/i],
  ["rubber_tpu", /\btpu\b|\btpe\b|rubber|silicone|urethane/i],
  ["acrylic", /acrylic|pmma/i],
  ["wood", /wood|walnut|maple|oak|birch|plywood|bamboo/i],
];

/** Normalizes a free-text material name (from the AI) to a fixed family. */
export function materialFamily(name: string): MaterialFamily {
  return MATERIAL_PATTERNS.find(([, pattern]) => pattern.test(name))?.[0] ?? "other";
}

export const MATERIAL_LABELS: Record<MaterialFamily, string> = {
  aluminum: "aluminum",
  stainless: "stainless steel",
  steel: "steel",
  brass_copper: "brass or copper",
  titanium: "titanium",
  nylon: "nylon",
  polycarbonate: "polycarbonate",
  abs: "ABS",
  acetal: "acetal (POM)",
  pla_petg: "PLA or PETG",
  resin: "resin",
  rubber_tpu: "rubber or TPU",
  acrylic: "acrylic",
  wood: "wood",
  other: "other material",
};

// Upper bounds (exclusive) on the largest bounding-box side, in mm.
const SIZE_BOUNDS: [SizeBucket, number][] = [
  ["xs", 50],
  ["s", 150],
  ["m", 400],
  ["l", 1000],
];

export const SIZE_BUCKETS: readonly SizeBucket[] = ["xs", "s", "m", "l", "xl"];

export function sizeBucket(box: { x: number; y: number; z: number }): SizeBucket {
  const largest = Math.max(box.x, box.y, box.z);
  return SIZE_BOUNDS.find(([, bound]) => largest < bound)?.[0] ?? "xl";
}
