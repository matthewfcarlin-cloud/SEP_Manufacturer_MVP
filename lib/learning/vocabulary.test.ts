import { describe, expect, test } from "vitest";
import { analysisOutputSchema, storedAnalysisShape } from "../schemas";
import { readFileSync } from "node:fs";
import type { Project } from "../types";
import { materialFamily, PRODUCT_CATEGORIES, sizeBucket } from "./vocabulary";

describe("materialFamily", () => {
  test.each([
    ["Aluminum 6061 (anodized)", "aluminum"],
    ["Aluminum 5052-H32 2 mm", "aluminum"],
    ["Stainless 304", "stainless"],
    ["Mild steel (CRS)", "steel"],
    ["Mild steel CRS (1.8 mm)", "steel"],
    ["Brass 360", "brass_copper"],
    ["Glass-filled PA12", "nylon"],
    ["30% glass-filled Nylon PA66", "nylon"],
    ["Carbon-fiber nylon", "nylon"],
    ["PC/ABS", "polycarbonate"],
    ["Polycarbonate", "polycarbonate"],
    ["ABS", "abs"],
    ["Delrin (POM)", "acetal"],
    ["PETG", "pla_petg"],
    ["Tough resin (SLA)", "resin"],
    ["TPU 95A", "rubber_tpu"],
    ["Walnut hardwood", "wood"],
    ["Unobtainium", "other"],
  ] as const)("%s → %s", (name, family) => {
    expect(materialFamily(name)).toBe(family);
  });
});

describe("sizeBucket", () => {
  test.each([
    [{ x: 49, y: 10, z: 10 }, "xs"],
    [{ x: 50, y: 10, z: 10 }, "s"],
    [{ x: 122, y: 66, z: 39.5 }, "s"],
    [{ x: 10, y: 150, z: 10 }, "m"],
    [{ x: 10, y: 10, z: 999 }, "l"],
    [{ x: 1000, y: 10, z: 10 }, "xl"],
  ] as const)("%o → %s", (box, bucket) => {
    expect(sizeBucket(box)).toBe(bucket);
  });
});

describe("analysis category", () => {
  // A real saved answer (it has the cost-by-volume curves the output schema requires).
  const saved = (JSON.parse(readFileSync("demo/sample-project.json", "utf8")) as Project).versions[0].analysis!;
  // A new answer also tags every tweak (B4).
  const withCategory = {
    ...saved,
    category: "enclosure",
    paths: saved.paths.map((p) => ({ ...p, designTweaks: p.designTweaks.map((t) => ({ ...t, category: "add_draft" })) })),
  };

  test("new answers must tag a category from the fixed list", () => {
    const { category: _, ...without } = withCategory;
    void _;
    expect(analysisOutputSchema.safeParse(withCategory).success).toBe(true);
    expect(analysisOutputSchema.safeParse(without).success).toBe(false);
    expect(analysisOutputSchema.safeParse({ ...withCategory, category: "my secret gadget" }).success).toBe(false);
  });

  test("saved analyses from before B2, with no category, stay readable", () => {
    const { category: _, ...without } = withCategory;
    void _;
    expect(storedAnalysisShape.safeParse(without).success).toBe(true);
  });

  test("new answers must tag every tweak's category from the fixed list; saved ones without it stay readable", () => {
    const untagged = { ...withCategory, paths: saved.paths };
    expect(analysisOutputSchema.safeParse(untagged).success).toBe(false);
    const freeText = { ...withCategory, paths: withCategory.paths.map((p) => ({ ...p, designTweaks: p.designTweaks.map((t) => ({ ...t, category: "make it nicer" })) })) };
    expect(analysisOutputSchema.safeParse(freeText).success).toBe(false);
    expect(storedAnalysisShape.safeParse(saved).success).toBe(true);
  });

  test("the list ends with a catch-all", () => {
    expect(PRODUCT_CATEGORIES.at(-1)).toBe("other");
  });
});
