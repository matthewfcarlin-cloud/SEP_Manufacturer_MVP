import { MAX_ORDER_MESSAGES } from "../schemas";
import type { OrderCoordination, OrderLine, OrderMessage, OrderMessagePurpose, OrderRecipient, ProjectVersion } from "../types";
import { getAssemblerById } from "./assemblers";
import { emptyOrder, planOrder, type OrderPlan } from "./plan";
import type { OrderOp } from "./schemas";
import { quoteFor, supplierFor } from "./sources";

// Pure edits to a version's order record. Nothing here orders, pays or
// sends anything. Sign-off is the user's explicit approval of the plan as it
// stands; purchase orders can only be drafted or marked sent while the
// sign-off still matches the plan. Invariant: at most one unsent draft per
// recipient and purpose.

export type OrderOpContext = { now: string; newId: () => string; lines: readonly OrderLine[] };
export type OrderOpResult = { ok: true; order: OrderCoordination } | { ok: false; error: string; status: number };

const failure = (error: string, status = 400): OrderOpResult => ({ ok: false, error, status });

export const sameRecipient = (a: OrderRecipient, b: OrderRecipient) => JSON.stringify(a) === JSON.stringify(b);

export function planWith(version: ProjectVersion, order: OrderCoordination, lines: readonly OrderLine[]): OrderPlan {
  return planOrder({ ...version, order }, lines);
}

/** Why a message can't go to this recipient, or null if it can. */
export function recipientProblem(version: ProjectVersion, plan: OrderPlan, to: OrderRecipient, purpose: OrderMessagePurpose): string | null {
  if (to.kind === "assembler") {
    if (purpose !== "assembly_rfq" && purpose !== "purchase_order") return "Unknown message type.";
    if (!getAssemblerById(to.assemblerId)) return "That assembler isn't listed.";
    if (purpose === "purchase_order" && plan.assembler?.id !== to.assemblerId) return "Orders go only to the assembler in the signed-off plan.";
    return null;
  }
  if (purpose === "assembly_rfq") return "Assembly quote requests go to assemblers.";
  if (to.kind === "local_quote" && !quoteFor(version, to.quoteId)) return "That quote is no longer on this version.";
  if (to.kind === "alibaba" && !supplierFor(version, to.supplierId)) return "That supplier was removed from the shortlist.";
  const inPlan = plan.lines.some((p) => p.source && p.source.kind === to.kind && JSON.stringify(p.source) === JSON.stringify(to));
  if (!inPlan) return "Orders go only to sources in the signed-off plan.";
  return null;
}

export function draftFor(order: OrderCoordination | undefined, to: OrderRecipient, purpose: OrderMessagePurpose): OrderMessage | undefined {
  return order?.messages.find((m) => m.state === "draft" && m.purpose === purpose && sameRecipient(m.to, to));
}

/** Sets the draft for a recipient and purpose, replacing any unsent one. */
export function withOrderDraft(order: OrderCoordination, msg: Omit<OrderMessage, "id" | "state" | "at">, ctx: Pick<OrderOpContext, "now" | "newId">): OrderCoordination {
  const existing = draftFor(order, msg.to, msg.purpose);
  const draft: OrderMessage = { ...msg, id: existing?.id ?? ctx.newId(), state: "draft", at: ctx.now };
  const others = order.messages.filter((m) => m !== existing);
  return { ...order, messages: [...others, draft] };
}

export function applyOrderOp(version: ProjectVersion, op: OrderOp, ctx: OrderOpContext): OrderOpResult {
  const order = version.order ?? emptyOrder(version);
  const lineIds = new Set(ctx.lines.map((l) => l.id));
  switch (op.op) {
    case "setRun":
      return { ok: true, order: { ...order, runQuantity: op.runQuantity } };
    case "assign": {
      if (!lineIds.has(op.lineId)) return failure("That line isn't in the bill of materials anymore.", 404);
      const s = op.source;
      if (s.kind === "local_quote" && !quoteFor(version, s.quoteId)) return failure("That quote is no longer on this version.", 404);
      if (s.kind === "alibaba" && !supplierFor(version, s.supplierId)) return failure("That supplier was removed from the shortlist.", 404);
      const assignments = [...order.assignments.filter((a) => a.lineId !== op.lineId), { lineId: op.lineId, source: s }];
      return { ok: true, order: { ...order, assignments } };
    }
    case "unassign":
      return { ok: true, order: { ...order, assignments: order.assignments.filter((a) => a.lineId !== op.lineId) } };
    case "chooseAssembler": {
      if (op.assemblerId && !getAssemblerById(op.assemblerId)) return failure("That assembler isn't listed.", 404);
      const next = { ...order, assemblerId: op.assemblerId ?? undefined };
      if (!op.assemblerId) delete next.assemblerId;
      return { ok: true, order: next };
    }
    case "saveDraft": {
      const plan = planWith(version, order, ctx.lines);
      if (op.purpose === "purchase_order" && !plan.signedOff) return failure("Sign off on the order plan before writing purchase orders.", 409);
      const problem = recipientProblem(version, plan, op.to, op.purpose);
      if (problem) return failure(problem);
      if (!draftFor(order, op.to, op.purpose) && order.messages.length >= MAX_ORDER_MESSAGES) return failure("This order has too many messages to add another.");
      return { ok: true, order: withOrderDraft(order, { to: op.to, purpose: op.purpose, subject: op.subject, text: op.text, aiDrafted: false }, ctx) };
    }
    case "discardDraft": {
      const msg = order.messages.find((m) => m.id === op.messageId && m.state === "draft");
      if (!msg) return failure("That draft isn't there anymore.", 404);
      return { ok: true, order: { ...order, messages: order.messages.filter((m) => m !== msg) } };
    }
    case "markSent": {
      const msg = order.messages.find((m) => m.id === op.messageId && m.state === "draft");
      if (!msg) return failure("That draft changed. Reload and try again.", 404);
      if (msg.purpose === "purchase_order" && !planWith(version, order, ctx.lines).signedOff) {
        return failure("The plan changed after you signed off. Review it and sign off again before sending orders.", 409);
      }
      return { ok: true, order: { ...order, messages: order.messages.map((m) => (m === msg ? { ...m, state: "sent", at: ctx.now } : m)) } };
    }
    case "signOff": {
      const plan = planWith(version, order, ctx.lines);
      if (plan.blockers.length) return failure(`Fix these first: ${plan.blockers.map((b) => b.message).join(" ")}`, 409);
      // Suggested sources become the user's own choices, so the plan they approved can't shift under them.
      const assignments = plan.lines.map((p) => ({ lineId: p.line.id, source: p.source! }));
      const confirmed = { ...order, assignments };
      const final = planWith(version, confirmed, ctx.lines);
      return { ok: true, order: { ...confirmed, signOff: { at: ctx.now, fingerprint: final.fingerprint, landedTotalUsd: final.totals.landedUsd } } };
    }
    case "withdrawSignOff": {
      const next = { ...order };
      delete next.signOff;
      return { ok: true, order: next };
    }
  }
}
