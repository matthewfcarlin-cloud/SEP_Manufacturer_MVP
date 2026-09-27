import { describe, expect, test } from "vitest";
import sample from "@/demo/sample-project.json";
import { bomSchema } from "../schemas";
import type { Bom, Project } from "../types";
import { applyBomEdit, bomFromAnswer, bomToCsv, bomTotals, runQuantity } from "./build";
import { bomAnswerSchema, bomEditSchema, type BomAnswer, type BomItemEdit } from "./schemas";
import { bomSourcingLines, bomSpecText } from "./sourcing";

const pedal = sample as Project;
const v1 = pedal.versions[0];

let n = 0;
const ctx = () => ({ now: "2026-09-27T20:00:00.000Z", newId: () => `item-${String(++n).padStart(6, "0")}` });

const answer: BomAnswer = {
  items: [
    { category: "packaging", name: "Retail box", spec: "Kraft mailer box 150 × 90 × 60 mm", quantityPerProduct: 1, unit: "pc", process: null, costLowUsd: 0.6, costHighUsd: 1.2, notes: "" },
    { category: "custom_part", name: "Enclosure body", spec: "6061-T6 aluminum, 122 × 66 × 39.5 mm, 2 mm walls", quantityPerProduct: 1, unit: "pc", process: "cnc_milling", costLowUsd: 18, costHighUsd: 26, notes: "  From the CAD file. " },
    { category: "hardware", name: "Lid screw", spec: "ISO 7380 button head M3 × 8, A2 stainless", quantityPerProduct: 4, unit: "pc", process: "sheet_metal", costLowUsd: 0.08, costHighUsd: 0.2, notes: "Confirm thread depth" },
    { category: "finish", name: "Powder coat", spec: "Matte black, 60-80 µm", quantityPerProduct: 1, unit: "pc", process: null, costLowUsd: null, costHighUsd: null, notes: "" },
  ],
  assumptions: ["Assumed a separate bottom lid held by four screws."],
};

describe("bomAnswerSchema", () => {
  test("accepts a sound draft", () => {
    expect(bomAnswerSchema("cnc_milling").safeParse(answer).success).toBe(true);
  });

  test("requires the CAD part as a custom part made by the chosen process", () => {
    const result = bomAnswerSchema("sheet_metal").safeParse(answer);
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].message).toMatch(/custom_part made by sheet_metal/);
  });

  test("rejects half-given costs, inverted ranges and custom parts without a process", () => {
    const bad = {
      ...answer,
      items: [
        { ...answer.items[1] },
        { ...answer.items[2], costLowUsd: 0.2, costHighUsd: null },
        { ...answer.items[0], costLowUsd: 2, costHighUsd: 1 },
        { ...answer.items[1], name: "Lid", process: null },
      ],
    };
    const messages = bomAnswerSchema("cnc_milling").safeParse(bad).error!.issues.map((i) => i.message);
    expect(messages).toEqual(expect.arrayContaining(["give both costs or neither", "costs must be 0 or more, low ≤ high", "a custom_part needs its process"]));
  });
});

describe("bomFromAnswer", () => {
  const bom = bomFromAnswer(answer, "cnc_milling", ctx());

  test("sorts custom parts first, marks every line as AI and trims text", () => {
    expect(bom.items.map((i) => i.category)).toEqual(["custom_part", "hardware", "finish", "packaging"]);
    expect(bom.items.every((i) => i.source === "ai")).toBe(true);
    expect(bom.items[0].notes).toBe("From the CAD file.");
    expect(bom.editedByUser).toBe(false);
  });

  test("keeps a process only on custom parts, and drops null costs and empty notes", () => {
    expect(bom.items[0].process).toBe("cnc_milling");
    expect(bom.items[1].process).toBeUndefined();
    expect(bom.items[2].costPerProductUsd).toBeUndefined();
    expect(bom.items[3].notes).toBeUndefined();
  });

  test("produces a BOM the stored schema accepts", () => {
    expect(bomSchema.safeParse(bom).success).toBe(true);
  });
});

describe("applyBomEdit", () => {
  const stored = bomFromAnswer(answer, "cnc_milling", ctx());
  const asEdits = (bom: Bom): BomItemEdit[] => bom.items.map((item) => ({ ...item, source: undefined }));

  test("untouched AI lines stay AI; changed and new lines become the user's", () => {
    const edits = asEdits(stored);
    edits[1] = { ...edits[1], quantityPerProduct: 6 };
    edits.push({ category: "hardware", name: "Rubber foot", spec: "10 mm dia. adhesive bumper", quantityPerProduct: 4, unit: "pc" });
    const next = applyBomEdit(stored, edits, "cnc_milling", ctx());
    expect(next.items.map((i) => i.source)).toEqual(["ai", "user", "ai", "ai", "user"]);
    expect(next.items[1].id).toBe(stored.items[1].id);
    expect(next.items[4].id).toMatch(/^item-/);
    expect(next).toMatchObject({ editedByUser: true, generatedAt: stored.generatedAt, assumptions: stored.assumptions, process: "cnc_milling" });
  });

  test("an unknown id is treated as a new line, never as a stored one", () => {
    const next = applyBomEdit(stored, [{ ...asEdits(stored)[0], id: "not-a-real-id" }], "cnc_milling", ctx());
    expect(next.items[0].id).not.toBe("not-a-real-id");
    expect(next.items[0].source).toBe("user");
  });

  test("starts a hand-built BOM for the given process", () => {
    const next = applyBomEdit(undefined, [{ category: "custom_part", name: "Body", spec: "", quantityPerProduct: 1, unit: "pc", process: "sheet_metal" }], "sheet_metal", ctx());
    expect(next).toMatchObject({ process: "sheet_metal", editedByUser: true, assumptions: [] });
    expect(bomSchema.safeParse(next).success).toBe(true);
  });

  test("the edit schema requires a process on custom parts and at least one line", () => {
    const base = { projectId: "x", version: 1 };
    expect(bomEditSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    const noProcess = bomEditSchema.safeParse({ ...base, items: [{ category: "custom_part", name: "Body", spec: "", quantityPerProduct: 1, unit: "pc" }] });
    expect(noProcess.error!.issues[0].message).toBe("Pick how each custom part is made.");
  });
});

describe("bomTotals and runQuantity", () => {
  const bom = bomFromAnswer(answer, "cnc_milling", ctx());

  test("sums costed lines per product and counts the uncosted ones", () => {
    expect(bomTotals(bom)).toEqual({ perProduct: { low: 18.68, high: 27.4 }, costedLines: 3, uncostedLines: 1, customParts: 1, boughtLines: 3 });
    expect(bomTotals({ ...bom, items: [bom.items[2]] }).perProduct).toBeNull();
  });

  test("rounds run quantities up to whole units", () => {
    expect(runQuantity({ quantityPerProduct: 4 }, 250)).toBe(1000);
    expect(runQuantity({ quantityPerProduct: 0.3 }, 250)).toBe(75);
    expect(runQuantity({ quantityPerProduct: 0.33 }, 10)).toBe(4);
  });
});

describe("bomToCsv", () => {
  const bom = bomFromAnswer(answer, "cnc_milling", ctx());

  test("the owner's copy has costs and notes; the supplier copy has neither", () => {
    const [ownerHeader, firstRow] = bomToCsv(bom, 250).split("\r\n");
    expect(ownerHeader.startsWith("\uFEFFLine,Item")).toBe(true);
    expect(ownerHeader).toContain("Est. cost per product low (USD)");
    expect(firstRow).toBe('1,Enclosure body,Custom part,"6061-T6 aluminum, 122 × 66 × 39.5 mm, 2 mm walls",CNC milling,1,pc,250,18,26,AI draft,From the CAD file.');
    const supplier = bomToCsv(bom, 250, { forSupplier: true });
    expect(supplier).not.toMatch(/cost|AI draft|Confirm thread depth|From the CAD file/i);
  });

  test("quotes quotes, and defuses cells a spreadsheet would run as a formula", () => {
    const risky = { ...bom, items: [{ ...bom.items[0], name: '=HYPERLINK("x")', spec: 'say "hi"' }] };
    const row = bomToCsv(risky, 1).split("\r\n")[1];
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
    expect(row).toContain('"say ""hi"""');
  });
});

describe("sourcing interface", () => {
  const bom = bomFromAnswer(answer, "cnc_milling", ctx());
  const version = { ...v1, bom };

  test("lines carry spec-level facts and run quantities, never costs or notes", () => {
    const lines = bomSourcingLines(version);
    expect(lines).toHaveLength(4);
    expect(lines[1]).toEqual({ name: "Lid screw", spec: "ISO 7380 button head M3 × 8, A2 stainless", category: "hardware", quantityPerProduct: 4, unit: "pc", runQuantity: 1000 });
    expect(JSON.stringify(lines)).not.toMatch(/cost|notes|Confirm/i);
  });

  test("filtering by process returns what one factory for that process would quote", () => {
    expect(bomSourcingLines(version, { process: "cnc_milling" }).map((l) => l.name)).toEqual(["Enclosure body"]);
    expect(bomSourcingLines(version, { process: "sheet_metal" })).toEqual([]);
  });

  test("the text block is ready for a brief or an RFQ, and empty without a BOM", () => {
    const text = bomSpecText(version);
    expect(text[0]).toBe("Bill of materials (spec-level, safe to share; quantities for 250 units):");
    expect(text[1]).toBe("- Enclosure body (custom part, CNC milling): 6061-T6 aluminum, 122 × 66 × 39.5 mm, 2 mm walls · 1 pc per unit, 250 pcs for the run");
    expect(text.join("\n")).not.toContain(pedal.name);
    expect(bomSpecText(v1)).toEqual([]);
  });
});
