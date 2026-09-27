import { PROCESS_LABELS } from "../processes";
import type { Bom, BomCategory, BomItem, Process } from "../types";
import type { BomAnswer, BomItemEdit } from "./schemas";

// Pure BOM helpers: turn an AI answer into a stored BOM, merge the user's
// edits, total the costs and export CSV. Client-safe.

export type BomContext = { now: string; newId: () => string };

export const CATEGORY_ORDER: BomCategory[] = ["custom_part", "hardware", "electronics", "material", "finish", "packaging"];

export const CATEGORY_LABELS: Record<BomCategory, string> = {
  custom_part: "Custom part",
  hardware: "Hardware",
  electronics: "Electronics",
  material: "Material",
  finish: "Finish",
  packaging: "Packaging",
};

const byCategory = (a: { category: BomCategory }, b: { category: BomCategory }) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);

const clean = (s: string) => s.trim().replace(/\s+/g, " ");

/** A validated AI answer as a stored BOM. Every line is marked "ai". */
export function bomFromAnswer(answer: BomAnswer, process: Process, ctx: BomContext): Bom {
  const items: BomItem[] = answer.items
    .map((a) => {
      const item: BomItem = {
        id: ctx.newId(),
        category: a.category,
        name: clean(a.name),
        spec: clean(a.spec),
        quantityPerProduct: a.quantityPerProduct,
        unit: a.unit,
        source: "ai",
      };
      if (a.category === "custom_part" && a.process) item.process = a.process;
      if (a.costLowUsd !== null && a.costHighUsd !== null) item.costPerProductUsd = { low: a.costLowUsd, high: a.costHighUsd };
      if (a.notes.trim()) item.notes = clean(a.notes);
      return item;
    })
    .sort(byCategory);
  return { process, generatedAt: ctx.now, items, assumptions: answer.assumptions.map(clean).filter(Boolean), editedByUser: false };
}

const sameCost = (a?: BomItem["costPerProductUsd"], b?: BomItem["costPerProductUsd"]) => a?.low === b?.low && a?.high === b?.high;

function unchanged(stored: BomItem, edit: BomItem): boolean {
  return (
    stored.category === edit.category &&
    stored.name === edit.name &&
    stored.spec === edit.spec &&
    stored.quantityPerProduct === edit.quantityPerProduct &&
    stored.unit === edit.unit &&
    stored.process === edit.process &&
    sameCost(stored.costPerProductUsd, edit.costPerProductUsd) &&
    (stored.notes ?? "") === (edit.notes ?? "")
  );
}

/**
 * Applies the editor's full list of lines to the stored BOM. Lines keep their
 * id and stay "ai" only while untouched; new or unknown ids become user lines.
 * With no stored BOM (the user builds one by hand), `process` is the path it's for.
 */
export function applyBomEdit(stored: Bom | undefined, edits: BomItemEdit[], process: Process, ctx: BomContext): Bom {
  const byId = new Map((stored?.items ?? []).map((i) => [i.id, i]));
  const items = edits.map((e): BomItem => {
    const prior = e.id ? byId.get(e.id) : undefined;
    const item: BomItem = {
      id: prior?.id ?? ctx.newId(),
      category: e.category,
      name: clean(e.name),
      spec: clean(e.spec),
      quantityPerProduct: e.quantityPerProduct,
      unit: e.unit,
      source: "user",
    };
    if (e.category === "custom_part" && e.process) item.process = e.process;
    if (e.costPerProductUsd) item.costPerProductUsd = e.costPerProductUsd;
    if (e.notes?.trim()) item.notes = clean(e.notes);
    if (prior && prior.source === "ai" && unchanged(prior, { ...item, source: "ai" })) item.source = "ai";
    return item;
  });
  return {
    process: stored?.process ?? process,
    generatedAt: stored?.generatedAt ?? ctx.now,
    updatedAt: ctx.now,
    items,
    assumptions: stored?.assumptions ?? [],
    editedByUser: true,
  };
}

export type BomTotals = {
  /** Sum of the costed lines, per finished product. Null when no line has a cost. */
  perProduct: { low: number; high: number } | null;
  costedLines: number;
  uncostedLines: number;
  customParts: number;
  boughtLines: number;
};

export function bomTotals(bom: Bom): BomTotals {
  const costed = bom.items.filter((i) => i.costPerProductUsd);
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    perProduct: costed.length
      ? {
          low: round(costed.reduce((s, i) => s + i.costPerProductUsd!.low, 0)),
          high: round(costed.reduce((s, i) => s + i.costPerProductUsd!.high, 0)),
        }
      : null,
    costedLines: costed.length,
    uncostedLines: bom.items.length - costed.length,
    customParts: bom.items.filter((i) => i.category === "custom_part").length,
    boughtLines: bom.items.filter((i) => i.category !== "custom_part").length,
  };
}

/** How much of a line a production run needs. Whole units, rounded up. */
export function runQuantity(item: Pick<BomItem, "quantityPerProduct">, productQuantity: number): number {
  return Math.ceil(item.quantityPerProduct * productQuantity - 1e-9);
}

/** Quotes a cell, and defuses anything a spreadsheet would read as a formula. */
function csvCell(value: string | number | undefined): string {
  if (value === undefined) return "";
  let s = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/**
 * The BOM as CSV, with a byte-order mark so Excel reads "×" and "µ" right.
 * The owner's copy includes estimated costs and notes; the
 * supplier copy (`forSupplier`) carries spec-level columns only.
 */
export function bomToCsv(bom: Bom, productQuantity: number, { forSupplier = false } = {}): string {
  const header = ["Line", "Item", "Type", "Spec", "Process", "Qty per product", "Unit", `Qty for ${productQuantity} units`];
  if (!forSupplier) header.push("Est. cost per product low (USD)", "Est. cost per product high (USD)", "Source", "Notes");
  const rows = bom.items.map((item, i) => {
    const row: (string | number | undefined)[] = [
      i + 1,
      item.name,
      CATEGORY_LABELS[item.category],
      item.spec,
      item.process && PROCESS_LABELS[item.process],
      item.quantityPerProduct,
      item.unit,
      runQuantity(item, productQuantity),
    ];
    if (!forSupplier) row.push(item.costPerProductUsd?.low, item.costPerProductUsd?.high, item.source === "ai" ? "AI draft" : "Edited", item.notes);
    return row;
  });
  return "\uFEFF" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
