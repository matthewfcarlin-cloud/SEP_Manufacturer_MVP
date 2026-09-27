import { describe, expect, test, vi } from "vitest";
import sample from "@/demo/sample-project.json";
import { WITHHELD } from "../aiInputs";
import type { BomAnswer } from "../bom/schemas";
import type { Project } from "../types";
import { BOM_SYSTEM_PROMPT, buildBomBrief, runBomGeneration } from "./bom";
import { AnalysisError } from "./run";
import type { CallTextModel } from "./structured";

const pedal = sample as Project;
const v1 = pedal.versions[0];

const good: BomAnswer = {
  items: [
    { category: "custom_part", name: "Enclosure body", spec: "6061-T6 aluminum, 122 × 66 × 39.5 mm", quantityPerProduct: 1, unit: "pc", process: "sheet_metal", costLowUsd: 9, costHighUsd: 14, notes: "" },
    { category: "hardware", name: "Lid screw", spec: "ISO 7380 M3 × 8, A2 stainless", quantityPerProduct: 4, unit: "pc", process: null, costLowUsd: 0.08, costHighUsd: 0.2, notes: "" },
    { category: "packaging", name: "Retail box", spec: "Kraft mailer box", quantityPerProduct: 1, unit: "pc", process: null, costLowUsd: null, costHighUsd: null, notes: "" },
  ],
  assumptions: ["Assumed a screwed-on bottom plate."],
};

describe("buildBomBrief", () => {
  test("carries the part's size, the chosen process and its cost estimate", () => {
    const brief = buildBomBrief(pedal, v1, "sheet_metal", 2);
    expect(brief).toContain("CAD part size: 122 × 66 × 39.5 mm");
    expect(brief).toContain("Process for this BOM: Sheet metal");
    expect(brief).toMatch(/CAD part estimate at the target quantity: \$[\d.]+–\$[\d.]+ per part/);
    expect(brief).toContain("Other processes considered: CNC milling");
    expect(brief).toContain("Photos attached: 2");
    expect(brief).toContain("Target quantity: 250 units");
  });

  test("honors withheld notes", () => {
    const brief = buildBomBrief(pedal, { ...v1, aiInputs: { includePhotos: true, includeNotes: false } }, "cnc_milling", 0);
    expect(brief).toContain(WITHHELD);
    expect(brief).not.toContain(v1.notes.trim().slice(0, 30));
    expect(brief).toContain("Photos: none sent.");
  });

  test("the prompt keeps product names out of specs and forbids invented part numbers", () => {
    expect(BOM_SYSTEM_PROMPT).toMatch(/Never put the product's name in a spec/);
    expect(BOM_SYSTEM_PROMPT).toMatch(/Never invent brand names or part numbers/);
  });
});

describe("runBomGeneration", () => {
  const turn = (output: unknown) => ({ output, stopReason: "end_turn" as const });

  test("returns a valid draft on the first try", async () => {
    const call = vi.fn<CallTextModel>().mockResolvedValue(turn(good));
    await expect(runBomGeneration(call, "brief", "sheet_metal")).resolves.toEqual(good);
    expect(call).toHaveBeenCalledTimes(1);
  });

  test("retries once, naming the missing CAD part, then succeeds", async () => {
    const call = vi.fn<CallTextModel>().mockResolvedValueOnce(turn(good)).mockResolvedValueOnce(turn({ ...good, items: good.items.map((i) => (i.process ? { ...i, process: "cnc_milling" } : i)) }));
    await expect(runBomGeneration(call, "brief", "cnc_milling")).resolves.toBeTruthy();
    expect(call.mock.calls[1][0]).toContain("include the CAD part as a custom_part made by cnc_milling");
  });

  test("gives up with a friendly error after two bad answers", async () => {
    const call = vi.fn<CallTextModel>().mockResolvedValue(turn({ items: [], assumptions: [] }));
    await expect(runBomGeneration(call, "brief", "cnc_milling")).rejects.toThrow(AnalysisError);
  });
});
