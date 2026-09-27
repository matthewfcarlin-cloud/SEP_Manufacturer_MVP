import { PROCESS_LABELS } from "../processes";
import { CAPABILITY_LABELS, assemblyMinutes, requiredCapabilities } from "../orders/assemblers";
import type { OrderPlan, PlannedLine } from "../orders/plan";
import { orderDraftAnswerSchema, type OrderDraft } from "../orders/schemas";
import { sameSource } from "../orders/sources";
import type { AssemblyPartner, OrderLine, OrderMessagePurpose, OrderSource } from "../types";
import { runStructured, type CallTextModel } from "./structured";

// Order coordination drafts: a purchase order to one supplier (only after
// the user signs off on the plan) or an assembly quote request to one
// assembler. One small text call each. The app never sends them: the user
// reviews each draft and sends it from their own email.

const CONFIDENTIALITY = `Confidentiality: write spec-level facts only. Never include the product's name, the inventor's name or private notes, their budget, their retail price, their margin, or any cost estimate. A supplier's own quoted price may be restated to that supplier.`;

export const ORDER_DRAFT_SYSTEM_PROMPT = `You are an experienced operations manager who places production orders and books contract assembly for small hardware brands. You write one email at a time for an independent inventor, who reviews it and sends it themselves.

Two kinds of email:
- PURCHASE ORDER to a parts supplier. The inventor has signed off on the order plan. Confirm exactly what the brief lists for this supplier: each part and its spec, the order quantity, the quoted unit price and tooling, and the total. Ask the supplier to confirm by return with a proforma invoice, their production lead time and ship date. Say where the parts ship to (the assembly partner) using the [Ship-to address] placeholder, ask them to label each carton with the part name and quantity, and ask for photos or a short inspection report before shipping. For an overseas supplier, state FOB terms and payment through Trade Assurance with a deposit and balance before shipment; for a local shop, ask for their usual terms. If tooling is listed, confirm the inventor owns the tooling. Commit only to what the brief lists; never invent quantities, prices, dates or terms.
- ASSEMBLY QUOTE REQUEST to a contract assembler. Describe the product at spec level as a list of incoming parts with quantity per unit, the run size, what the assembly involves, where the parts ship in from (overseas or local) and when they're expected. Ask for: setup fee, per-unit assembly price at the run size and one larger run, lead time once parts arrive, incoming inspection, how they handle shortages or rejects, packaging, and whether they can ship finished units to buyers. Ask any assembly-specific questions a real assembler would.
- A PURCHASE ORDER to an assembler books the run: confirm the run size, the parts arriving and the expected arrival window, and ask them to confirm their price and schedule in writing before work starts.

Style: courteous, direct, plain English that reads well for a non-native reader. Short paragraphs, a short list where it helps. Sign off with [Your name]. No other placeholders.

${CONFIDENTIALITY}`;

const n = (x: number) => x.toLocaleString("en-US");
const money = (x: number) => `$${x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function lineSpec(l: OrderLine): string {
  const parts = [l.spec, l.material && !l.spec?.includes(l.material) ? l.material : undefined, l.process ? PROCESS_LABELS[l.process] : undefined].filter(Boolean);
  return parts.length ? parts.join(", ") : "spec to follow";
}

const unitWord = (l: OrderLine, qty: number) => (l.unit === "pc" ? (qty === 1 ? "pc" : "pcs") : l.unit);

function linesFrom(plan: OrderPlan, source: OrderSource): PlannedLine[] {
  return plan.lines.filter((p) => p.source && sameSource(p.source, source));
}

/** Brief for a purchase order to one parts supplier. */
export function buildSupplierOrderBrief(plan: OrderPlan, to: OrderSource): string {
  const mine = linesFrom(plan, to);
  const terms = mine[0]?.terms;
  const lines = [
    "Email type: PURCHASE ORDER to a parts supplier (the inventor has signed off on this plan).",
    `Supplier: ${terms?.vendor ?? "the supplier"} (${terms?.overseas ? "overseas, Alibaba" : "local shop"})`,
    "",
    "What this order covers:",
  ];
  let total = 0;
  for (const p of mine) {
    const unit = p.terms?.unitUsd ?? 0;
    const lineTotal = unit * p.orderQty;
    total += lineTotal + p.toolingUsd;
    lines.push(
      `- ${p.line.name} (${lineSpec(p.line)}): ${n(p.orderQty)} ${unitWord(p.line, p.orderQty)} at ${money(unit)} = ${money(lineTotal)}` +
        (p.toolingUsd ? `; tooling ${money(p.toolingUsd)} (inventor owns the tooling)` : "") +
        (p.overbuy ? ` (quantity set by their minimum order)` : ""),
    );
  }
  lines.push(`Order total: ${money(total)}`);
  if (terms?.leadDays != null) lines.push(`Their quoted lead time: ${terms.leadDays} days.`);
  lines.push(
    "",
    plan.needsAssembly ? `Ship to: the assembly partner, ${plan.assembler?.name ?? "to be confirmed"}, address as [Ship-to address].` : "Ship to: the inventor, address as [Ship-to address].",
    "",
    "Write the purchase order email.",
  );
  return lines.join("\n");
}

/** Brief for a quote request (or booking) to one assembler. */
export function buildAssemblerBrief(plan: OrderPlan, assembler: AssemblyPartner, purpose: OrderMessagePurpose): string {
  const lines = [
    purpose === "purchase_order"
      ? "Email type: PURCHASE ORDER to the contract assembler (books the run; the inventor has signed off on this plan)."
      : "Email type: ASSEMBLY QUOTE REQUEST to a contract assembler.",
    `Assembler: ${assembler.name}, ${assembler.neighborhood} (they list: ${assembler.capabilities.map((c) => CAPABILITY_LABELS[c]).join(", ")})`,
    `Run size: ${n(plan.runQuantity)} finished units`,
    "",
    "Incoming parts per finished unit:",
    ...plan.lines.map((p) => {
      const from = p.terms ? (p.terms.overseas ? "ships from overseas" : "ships from a local supplier") : "supplier to be confirmed";
      return `- ${p.line.name} (${lineSpec(p.line)}): ${p.line.quantityPerUnit} ${unitWord(p.line, p.line.quantityPerUnit)} per unit, ${n(p.orderQty)} arriving; ${from}`;
    }),
  ];
  const needs = requiredCapabilities(plan.lines.map((p) => p.line));
  if (needs.length) lines.push(`The build needs: ${needs.map((c) => CAPABILITY_LABELS[c]).join(", ")}.`);
  const minutes = assemblyMinutes(plan.lines.map((p) => p.line));
  lines.push(`Rough hands-on time (our estimate, don't state it as a requirement): ${minutes.low}–${minutes.high} minutes per unit.`);
  const { partsInDays } = plan.timeline;
  if (partsInDays.high > 0) lines.push(`Parts expected at their door ${partsInDays.low}–${partsInDays.high} days after the orders are placed.`);
  lines.push("", purpose === "purchase_order" ? "Write the email booking this run." : "Write the quote request email.");
  return lines.join("\n");
}

export function runOrderDraft(callModel: CallTextModel, brief: string): Promise<OrderDraft> {
  return runStructured(callModel, brief, {
    schema: orderDraftAnswerSchema,
    logTag: "order-draft",
    refusalMessage: "The AI declined to draft this email.",
    failMessage: "The AI's draft didn't pass our checks. Please try again.",
    normalize: (d) => ({ ...d, subject: d.subject.trim().replace(/^subject:\s*/i, "") }),
  });
}
