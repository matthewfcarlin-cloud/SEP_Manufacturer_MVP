import { describe, expect, test } from "vitest";
import bracketRaw from "@/demo/bracket-project.json";
import sample from "@/demo/sample-project.json";
import { buildAssemblerBrief, buildSupplierOrderBrief } from "../analysis/orders";
import { projectSchema } from "../schemas";
import type { OrderLine, Project, ProjectVersion, Supplier } from "../types";
import { assemblyMinutes, getAssemblerById, getAssemblers, matchAssemblers, requiredCapabilities } from "./assemblers";
import { MAIN_PART_LINE_ID, orderLinesFor } from "./lines";
import { applyOrderOp, planWith, recipientProblem, type OrderOpContext } from "./ops";
import { planOrder, pricingGaps, SHIPPING, SPARES_SHARE } from "./plan";
import { orderView } from "./view";
import { orderDraftAnswerSchema, type OrderOp } from "./schemas";

const pedal = (sample as Project).versions[0];
const bracket = bracketRaw as Project;
/** The bracket's v2 as one part: its seeded BOM removed, so the main-part fallback applies. */
const bracketV2: ProjectVersion = { ...bracket.versions[1], bom: undefined };
const bracketWithBom = bracket.versions[1];
const NOW = "2026-09-27T12:00:00.000Z";

let ids = 0;
const ctxFor = (lines: readonly OrderLine[]): OrderOpContext => ({ now: NOW, newId: () => `msg${String(++ids).padStart(6, "0")}`, lines });

/** Applies ops in order, failing the test on the first error. */
function apply(version: ProjectVersion, lines: readonly OrderLine[], ...ops: OrderOp[]): ProjectVersion {
  return ops.reduce((v, op) => {
    const r = applyOrderOp(v, op, ctxFor(lines));
    if (!r.ok) throw new Error(`${op.op}: ${r.error}`);
    return { ...v, order: r.order };
  }, version);
}

const BOM: OrderLine[] = [
  { id: "body", name: "Enclosure body", kind: "custom_part", quantityPerUnit: 1, unit: "pc", process: "cnc_milling", material: "6061 aluminum" },
  { id: "screws", name: "Lid screws", kind: "hardware", quantityPerUnit: 4, unit: "pc", spec: "M3x6 button head, stainless" },
  { id: "jack", name: "Audio jack", kind: "electronics", quantityPerUnit: 2, unit: "pc", spec: '1/4" mono, panel mount' },
  { id: "box", name: "Retail box", kind: "packaging", quantityPerUnit: 1, unit: "pc", spec: "Printed tuck box" },
];

const catalog = (vendor: string, unitUsd: number, leadDays: number, moq?: number) => ({ kind: "catalog" as const, vendor, unitUsd, leadDays, overseas: false, ...(moq && { moq }) });

const bomAssigned = (v: ProjectVersion) =>
  apply(
    v,
    BOM,
    { op: "assign", lineId: "screws", source: catalog("Fastener distributor", 0.06, 3, 2000) },
    { op: "assign", lineId: "jack", source: catalog("Parts distributor", 1.1, 5) },
    { op: "assign", lineId: "box", source: catalog("Box printer", 0.9, 10, 500) },
  );

describe("order lines", () => {
  test("without a BOM the product is one custom part, on the chosen quote's process", () => {
    const [line] = orderLinesFor(bracketV2);
    expect(line).toMatchObject({ id: MAIN_PART_LINE_ID, kind: "custom_part", quantityPerUnit: 1, process: "sheet_metal" });
    expect(orderLinesFor(pedal)[0].process).toBe(pedal.analysis!.paths[0].process);
  });
});

describe("order lines from the BOM", () => {
  test("each BOM line becomes an order line with its id, kind, quantity, unit, spec and process", () => {
    const lines = orderLinesFor(bracketWithBom);
    const bom = bracketWithBom.bom!;
    expect(lines.map((l) => l.id)).toEqual(bom.items.map((i) => i.id));
    const body = bom.items.find((i) => i.category === "custom_part")!;
    expect(lines.find((l) => l.id === body.id)).toMatchObject({ name: body.name, kind: "custom_part", quantityPerUnit: body.quantityPerProduct, unit: body.unit, spec: body.spec, process: body.process });
    expect(lines.some((l) => l.id === MAIN_PART_LINE_ID)).toBe(false);
  });

  test("never carries the BOM's costs or private notes", () => {
    const text = JSON.stringify(orderLinesFor(bracketWithBom));
    for (const item of bracketWithBom.bom!.items) if (item.notes) expect(text).not.toContain(item.notes);
    expect(text).not.toContain("costPerProductUsd");
  });

  test("the custom part is suggested the chosen local quote; bought lines wait for a source", () => {
    const plan = planOrder(bracketWithBom, orderLinesFor(bracketWithBom));
    const body = bracketWithBom.bom!.items.find((i) => i.category === "custom_part")!;
    expect(plan.lines.find((l) => l.line.id === body.id)?.source).toEqual({ kind: "local_quote", quoteId: "q2-oxbow-metalcraft" });
    expect(plan.lines.filter((l) => l.line.kind === "hardware").every((l) => !l.source)).toBe(true);
  });
});

describe("pricingGaps", () => {
  test("a BOM with unsourced lines and no assembler is a partial total", () => {
    const gaps = pricingGaps(planOrder(bracketWithBom, orderLinesFor(bracketWithBom)));
    expect(gaps).toEqual({ unpricedLines: 9, totalLines: 10, missingAssembly: true, isComplete: false });
  });

  test("one priced part with no assembly needed is complete", () => {
    expect(pricingGaps(planOrder(bracketV2, orderLinesFor(bracketV2))).isComplete).toBe(true);
  });
});

describe("planOrder", () => {
  test("a single part: suggests the chosen quote, no assembler, costs and dates add up", () => {
    const plan = planOrder(bracketV2, orderLinesFor(bracketV2));
    const [line] = plan.lines;
    expect(line.source).toEqual({ kind: "local_quote", quoteId: "q2-oxbow-metalcraft" });
    expect(line.suggested).toBe(true);
    expect(plan.needsAssembly).toBe(false);
    expect(plan.shipTo).toBe("you");
    // No spares without assembly; MOQ 50 < 500.
    expect(line.orderQty).toBe(500);
    expect(line.goodsUsd).toBeCloseTo(4.6 * 500);
    expect(plan.totals.shippingUsd.low).toBeCloseTo(2300 * SHIPPING.local.costShare.low);
    expect(plan.totals.landedUsd.low).toBeCloseTo(2300 + 10 + 2300 * SHIPPING.local.costShare.low);
    expect(plan.timeline.readyInDays).toEqual({ low: 9 + SHIPPING.local.days.low, high: 9 + SHIPPING.local.days.high });
    expect(plan.blockers).toEqual([]);
    expect(plan.usesDemoQuotes).toBe(true);
    expect(plan.warnings.some((w) => /demo quotes/.test(w.message))).toBe(true);
  });

  test("without a chosen quote, the best-value local quote is suggested", () => {
    const plan = planOrder(pedal, orderLinesFor(pedal));
    // $28.53 + $320 / 250 beats every other CNC quote all-in.
    expect(plan.lines[0].source).toEqual({ kind: "local_quote", quoteId: "q4-tailwind-rapid-tooling" });
  });

  test("a multi-line BOM needs an assembler, adds spares, and flags MOQ overbuys", () => {
    const v = bomAssigned(pedal);
    const plan = planOrder(v, BOM);
    expect(plan.needsAssembly).toBe(true);
    expect(plan.blockers.map((b) => b.message)).toEqual(["Pick an assembly partner to put the product together."]);
    const screws = plan.lines.find((p) => p.line.id === "screws")!;
    expect(screws.neededQty).toBe(Math.ceil(4 * 250 * (1 + SPARES_SHARE)));
    expect(screws.orderQty).toBe(2000);
    expect(plan.warnings.some((w) => w.lineId === "screws" && /minimum order/.test(w.message))).toBe(true);
    // The critical path is the slowest line to arrive.
    expect(plan.timeline.criticalLineId).toBe("body");
  });

  test("an Alibaba supplier without a recorded price blocks sign-off", () => {
    const supplier: Supplier = { id: "sup0000001", name: "Ningbo Example Metal", status: "negotiating", createdAt: NOW, messages: [] };
    const v = apply({ ...pedal, sourcing: { suppliers: [supplier] } }, orderLinesFor(pedal), { op: "assign", lineId: MAIN_PART_LINE_ID, source: { kind: "alibaba", supplierId: supplier.id } });
    const plan = planOrder(v, orderLinesFor(v));
    expect(plan.blockers[0].message).toMatch(/No unit price recorded/);
    const priced = { ...v, sourcing: { suppliers: [{ ...supplier, quote: { unitUsd: 14, moq: 300, toolingUsd: 200, leadDays: 25 } }] } };
    const ok = planOrder(priced, orderLinesFor(priced));
    expect(ok.blockers).toEqual([]);
    expect(ok.lines[0]).toMatchObject({ orderQty: 300, overbuy: 50 });
    expect(ok.lines[0].arrivesInDays).toEqual({ low: 25 + SHIPPING.overseas.days.low, high: 25 + SHIPPING.overseas.days.high });
    expect(ok.lines[0].shippingUsd!.high).toBeCloseTo(14 * 300 * SHIPPING.overseas.costShare.high);
  });

  test("a purchase order to an Alibaba supplier is addressed to its saved email", () => {
    const supplier: Supplier = {
      id: "sup0000002", name: "Ningbo Example Metal", status: "agreed", createdAt: NOW, messages: [],
      email: "sales@example-metal.test", quote: { unitUsd: 14, moq: 300, toolingUsd: 200, leadDays: 25 },
    };
    const v = apply({ ...pedal, sourcing: { suppliers: [supplier] } }, orderLinesFor(pedal), { op: "assign", lineId: MAIN_PART_LINE_ID, source: { kind: "alibaba", supplierId: supplier.id } });
    const po = orderView(v).poRecipients.find((r) => r.to.kind === "alibaba");
    expect(po?.email).toBe("sales@example-metal.test");
    const noEmail = { ...v, sourcing: { suppliers: [{ ...supplier, email: undefined }] } };
    expect(orderView(noEmail).poRecipients.find((r) => r.to.kind === "alibaba")?.email).toBeUndefined();
  });

  test("warns when the run is over the version's budget", () => {
    const plan = planOrder({ ...bracketV2, budgetUsd: 100 }, orderLinesFor(bracketV2));
    expect(plan.warnings.some((w) => /budget/.test(w.message))).toBe(true);
  });
});

describe("assembly partners", () => {
  test("the seed file is valid, fictional demo data", () => {
    expect(getAssemblers().length).toBeGreaterThanOrEqual(6);
    expect(getAssemblers().every((a) => a.isDemoData)).toBe(true);
  });

  test("electronics rule out assemblers who can't solder", () => {
    expect(requiredCapabilities(BOM)).toEqual(["mechanical", "electronics", "packaging"]);
    const ids = matchAssemblers(BOM, 250).map((m) => m.assembler.id);
    expect(ids).not.toContain("vernon-kit-and-pack");
    expect(ids).toContain("burbank-signal-assembly");
    for (const id of ids) expect(getAssemblerById(id)!.capabilities).toEqual(expect.arrayContaining(["mechanical", "electronics", "packaging"]));
  });

  test("cost is setup plus labor over the estimated minutes, as a range", () => {
    const [top] = matchAssemblers(BOM, 250);
    const minutes = assemblyMinutes(BOM);
    expect(top.costUsd.low).toBeCloseTo(top.assembler.setupUsd + top.assembler.laborUsdPerMinute * minutes.low * 250, 1);
    expect(top.costUsd.high).toBeGreaterThan(top.costUsd.low);
  });

  test("a run below an assembler's minimum is flagged, not hidden", () => {
    const small = matchAssemblers(BOM, 20);
    const gardena = small.find((m) => m.assembler.id === "gardena-benchworks")!;
    expect(gardena.cautions[0]).toMatch(/minimum is 50/);
  });
});

describe("sign-off and orders", () => {
  const lines1 = orderLinesFor(bracketV2);

  test("sign-off is refused while anything blocks the plan", () => {
    const r = applyOrderOp(bomAssigned(pedal), { op: "signOff" }, ctxFor(BOM));
    expect(r).toMatchObject({ ok: false, status: 409 });
  });

  test("signing off confirms suggested sources and snapshots the landed total", () => {
    const v = apply(bracketV2, lines1, { op: "signOff" });
    expect(v.order!.assignments).toEqual([{ lineId: MAIN_PART_LINE_ID, source: { kind: "local_quote", quoteId: "q2-oxbow-metalcraft" } }]);
    const plan = planOrder(v, lines1);
    expect(plan.signedOff).toBe(true);
    expect(v.order!.signOff!.landedTotalUsd).toEqual(plan.totals.landedUsd);
  });

  test("any change to the plan voids the sign-off", () => {
    const v = apply(bracketV2, lines1, { op: "signOff" }, { op: "setRun", runQuantity: 600 });
    const plan = planOrder(v, lines1);
    expect(plan.signedOff).toBe(false);
    expect(plan.signOffStale).toBe(true);
    // A supplier re-quoting after sign-off also voids it.
    const signed = apply(bracketV2, lines1, { op: "signOff" });
    const requoted = { ...signed, outreach: { ...signed.outreach!, quotes: signed.outreach!.quotes.map((q) => (q.id === "q2-oxbow-metalcraft" ? { ...q, unitPriceUsd: 5.1 } : q)) } };
    expect(planOrder(requoted, lines1).signedOff).toBe(false);
  });

  const po = (quoteId: string): OrderOp => ({ op: "saveDraft", to: { kind: "local_quote", quoteId }, purpose: "purchase_order", subject: "PO: 500 brackets", text: "Please confirm." });

  test("purchase orders need a current sign-off, and only go to sources in the plan", () => {
    expect(applyOrderOp(bracketV2, po("q2-oxbow-metalcraft"), ctxFor(lines1))).toMatchObject({ ok: false, status: 409 });
    const signed = apply(bracketV2, lines1, { op: "signOff" });
    expect(applyOrderOp(signed, po("q1-bitterroot-sheetworks"), ctxFor(lines1))).toMatchObject({ ok: false, error: expect.stringMatching(/signed-off plan/) });
    const drafted = apply(signed, lines1, po("q2-oxbow-metalcraft"));
    const draft = drafted.order!.messages[0];
    expect(draft).toMatchObject({ state: "draft", purpose: "purchase_order", aiDrafted: false });

    // Plan changes after the draft: it can't be marked sent until the user signs off again.
    const changed = apply(drafted, lines1, { op: "setRun", runQuantity: 450 });
    expect(applyOrderOp(changed, { op: "markSent", messageId: draft.id }, ctxFor(lines1))).toMatchObject({ ok: false, status: 409 });
    const sent = apply(drafted, lines1, { op: "markSent", messageId: draft.id });
    expect(sent.order!.messages[0].state).toBe("sent");
  });

  test("assembly quote requests can go out before sign-off; one draft per recipient", () => {
    const rfq: OrderOp = { op: "saveDraft", to: { kind: "assembler", assemblerId: "gardena-benchworks" }, purpose: "assembly_rfq", subject: "Assembly quote", text: "v1" };
    const v = apply(pedal, BOM, rfq, { ...rfq, text: "v2" } as OrderOp);
    expect(v.order!.messages).toHaveLength(1);
    expect(v.order!.messages[0].text).toBe("v2");
    const plan = planWith(v, v.order!, BOM);
    expect(recipientProblem(v, plan, { kind: "local_quote", quoteId: "q1-breakwater-machine" }, "assembly_rfq")).toMatch(/go to assemblers/);
  });

  test("the saved order is valid project data", () => {
    const v = apply(bomAssigned(pedal), BOM, { op: "chooseAssembler", assemblerId: "burbank-signal-assembly" }, { op: "signOff" });
    const project = { ...(sample as Project), versions: [v] };
    expect(projectSchema.safeParse(project).success).toBe(true);
    expect(planOrder(v, BOM).signedOff).toBe(true);
  });

  test("unknown sources and assemblers are refused", () => {
    expect(applyOrderOp(pedal, { op: "assign", lineId: MAIN_PART_LINE_ID, source: { kind: "local_quote", quoteId: "nope" } }, ctxFor(orderLinesFor(pedal)))).toMatchObject({ ok: false, status: 404 });
    expect(applyOrderOp(pedal, { op: "assign", lineId: "ghost", source: catalog("X", 1, 1) }, ctxFor(orderLinesFor(pedal)))).toMatchObject({ ok: false, status: 404 });
    expect(applyOrderOp(pedal, { op: "chooseAssembler", assemblerId: "no-such-shop" }, ctxFor(BOM))).toMatchObject({ ok: false, status: 404 });
  });
});

describe("order email briefs", () => {
  const signed = apply(bomAssigned(pedal), BOM, { op: "chooseAssembler", assemblerId: "burbank-signal-assembly" });
  const plan = planOrder({ ...signed, businessCase: pedal.businessCase }, BOM);

  test("never carry the product name, notes, budget or retail price", () => {
    const briefs = [
      buildSupplierOrderBrief(plan, { kind: "local_quote", quoteId: "q4-tailwind-rapid-tooling" }),
      buildAssemblerBrief(plan, getAssemblerById("burbank-signal-assembly")!, "assembly_rfq"),
    ];
    for (const b of briefs) {
      expect(b).not.toContain((sample as Project).name);
      expect(b).not.toContain(pedal.notes.slice(0, 40));
      expect(b).not.toContain("4,000");
      expect(b).not.toMatch(/\$32\b/);
    }
  });

  test("a supplier PO lists only that supplier's lines with their quoted price", () => {
    const brief = buildSupplierOrderBrief(plan, { kind: "catalog", vendor: "Fastener distributor", unitUsd: 0.06, leadDays: 3, overseas: false, moq: 2000 });
    expect(brief).toContain("Lid screws");
    expect(brief).toContain("2,000 pcs at $0.06");
    expect(brief).not.toContain("Audio jack");
    expect(brief).toContain("Burbank Signal Assembly");
  });

  test("the assembler brief lists every incoming part and the arrival window", () => {
    const brief = buildAssemblerBrief(plan, getAssemblerById("burbank-signal-assembly")!, "assembly_rfq");
    for (const l of BOM) expect(brief).toContain(l.name);
    expect(brief).toContain(`${plan.timeline.partsInDays.low}–${plan.timeline.partsInDays.high} days`);
  });

  test("drafts with made-up placeholders are sent back for a retry", () => {
    const base = { subject: "Purchase order: 250 enclosures", rationale: "Confirms the quoted price and asks for a proforma invoice.", message: "Hello, ".repeat(35) + "Ship to [Ship-to address]. Thanks, [Your name]" };
    expect(orderDraftAnswerSchema.safeParse(base).success).toBe(true);
    expect(orderDraftAnswerSchema.safeParse({ ...base, message: base.message + " Due [date]." }).success).toBe(false);
  });
});

describe("the bracket's real BOM", () => {
  const v2 = (bracketRaw as Project).versions[1];
  const lines = orderLinesFor(v2);

  test("every BOM line becomes an order line, keyed by its BOM id", () => {
    expect(lines.map((l) => l.id)).toEqual(v2.bom!.items.map((i) => i.id));
    expect(lines[0]).toMatchObject({ kind: "custom_part", process: "sheet_metal" });
  });

  test("a finish like powder coat doesn't narrow the assemblers to finishing shops", () => {
    expect(requiredCapabilities(lines)).not.toContain("finishing");
    expect(matchAssemblers(lines, v2.targetQuantity).length).toBeGreaterThan(1);
  });

  test("the custom part gets the chosen quote; bought parts wait for a vendor", () => {
    const plan = planOrder(v2, lines);
    expect(plan.lines[0].source).toEqual({ kind: "local_quote", quoteId: "q2-oxbow-metalcraft" });
    expect(plan.blockers.some((b) => b.lineId === lines[1].id)).toBe(true);
  });
});
