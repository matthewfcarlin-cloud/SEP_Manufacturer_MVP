import { z } from "zod";
import { BOM_CATEGORIES, BOM_ITEM_ID, BOM_UNITS, MAX_BOM_ITEMS, costRangeSchema, processSchema } from "../schemas";
import type { Process } from "../types";

// AI output schemas (structural for the model, plus rules that trigger one
// retry) and what the BOM editor may save.

export const BOM_ITEMS = { min: 3, max: 25 } as const;
export const BOM_ASSUMPTIONS = { min: 1, max: 5 } as const;
export const SPEC_WORD_LIMIT = 40;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export const bomOutputSchema = z.object({
  items: z
    .array(
      z.object({
        category: z
          .enum(BOM_CATEGORIES)
          .describe("custom_part: made to the inventor's drawing (the CAD part and any sibling parts). hardware: fasteners, inserts, springs, magnets, feet, gaskets. electronics: only if the product clearly contains them. material: stock, adhesive or foam bought separately. finish: a separate finishing operation (anodize, powder coat, pad print). packaging: what it ships and sells in."),
        name: z.string().describe("Short name, 1-6 words, e.g. 'Enclosure body', 'Button-head screw'."),
        spec: z
          .string()
          .describe(`What a supplier needs to quote or pick it, under ${SPEC_WORD_LIMIT} words: material and grade, size, standard (e.g. ISO 7380 M3 × 8, A2 stainless), finish, tolerance if it matters. Spec-level facts only, no product name.`),
        quantityPerProduct: z.number().describe("How many (or how much, in `unit`) go into ONE finished product."),
        unit: z.enum(BOM_UNITS),
        process: processSchema.nullable().describe("How a custom_part is made. null for every other category."),
        costLowUsd: z.number().nullable().describe("Low estimate of this line's cost for ONE finished product at the target quantity (quantity × unit price), USD. null if there's no basis to estimate."),
        costHighUsd: z.number().nullable().describe("High estimate, same basis. null exactly when costLowUsd is null."),
        notes: z.string().describe("One short sentence for the inventor (e.g. 'Confirm the thread size against the boss diameter'), or an empty string."),
      }),
    )
    .describe(`${BOM_ITEMS.min}-${BOM_ITEMS.max} lines, custom parts first, then hardware, electronics, material, finish, packaging.`),
  assumptions: z.array(z.string()).describe(`${BOM_ASSUMPTIONS.min}-${BOM_ASSUMPTIONS.max} short sentences: what you assumed where the brief was silent.`),
});

export type BomAnswer = z.infer<typeof bomOutputSchema>;

/** The model's answer plus the rules a draft must meet. `process` is the path the BOM is for. */
export function bomAnswerSchema(process: Process) {
  return bomOutputSchema.superRefine((b, ctx) => {
    if (b.items.length < BOM_ITEMS.min || b.items.length > BOM_ITEMS.max) {
      ctx.addIssue({ code: "custom", path: ["items"], message: `need ${BOM_ITEMS.min}-${BOM_ITEMS.max} lines, got ${b.items.length}` });
    }
    if (!b.items.some((i) => i.category === "custom_part" && i.process === process)) {
      ctx.addIssue({ code: "custom", path: ["items"], message: `include the CAD part as a custom_part made by ${process}` });
    }
    b.items.forEach((item, i) => {
      if (!item.name.trim() || words(item.name) > 8) ctx.addIssue({ code: "custom", path: ["items", i, "name"], message: "name it in 1-6 words" });
      if (words(item.spec) < 2) ctx.addIssue({ code: "custom", path: ["items", i, "spec"], message: "give a real spec" });
      if (words(item.spec) > SPEC_WORD_LIMIT * 1.25) ctx.addIssue({ code: "custom", path: ["items", i, "spec"], message: `keep the spec under ${SPEC_WORD_LIMIT} words` });
      if (!(item.quantityPerProduct > 0)) ctx.addIssue({ code: "custom", path: ["items", i, "quantityPerProduct"], message: "must be more than 0" });
      if (item.category === "custom_part" && item.process === null) {
        ctx.addIssue({ code: "custom", path: ["items", i, "process"], message: "a custom_part needs its process" });
      }
      const { costLowUsd: low, costHighUsd: high } = item;
      if ((low === null) !== (high === null)) {
        ctx.addIssue({ code: "custom", path: ["items", i, "costHighUsd"], message: "give both costs or neither" });
      } else if (low !== null && high !== null && (low < 0 || high < low)) {
        ctx.addIssue({ code: "custom", path: ["items", i, "costLowUsd"], message: "costs must be 0 or more, low ≤ high" });
      }
    });
    if (b.assumptions.length < BOM_ASSUMPTIONS.min || b.assumptions.length > BOM_ASSUMPTIONS.max) {
      ctx.addIssue({ code: "custom", path: ["assumptions"], message: `need ${BOM_ASSUMPTIONS.min}-${BOM_ASSUMPTIONS.max} assumptions` });
    }
  });
}

/** One line as the editor saves it. A line without a known id is new. */
export const bomItemEditSchema = z
  .object({
    id: z.string().regex(BOM_ITEM_ID).optional(),
    category: z.enum(BOM_CATEGORIES),
    name: z.string().trim().min(1, "Every line needs a name.").max(80, "Keep names under 80 characters."),
    spec: z.string().trim().max(400, "Keep specs under 400 characters."),
    quantityPerProduct: z.number().positive("Quantities must be more than 0.").max(10_000, "That quantity is too large."),
    unit: z.enum(BOM_UNITS),
    process: processSchema.optional(),
    costPerProductUsd: costRangeSchema.optional(),
    notes: z.string().trim().max(300, "Keep notes under 300 characters.").optional(),
  })
  .refine((i) => i.category !== "custom_part" || i.process, { message: "Pick how each custom part is made.", path: ["process"] });

export type BomItemEdit = z.infer<typeof bomItemEditSchema>;

const target = { projectId: z.string(), version: z.number().int().positive() };

export const bomGenerateSchema = z.object({ ...target, process: processSchema.optional() });
export const bomEditSchema = z.object({
  ...target,
  items: z.array(bomItemEditSchema).min(1, "Keep at least one line.").max(MAX_BOM_ITEMS, `A BOM can have up to ${MAX_BOM_ITEMS} lines.`),
});
