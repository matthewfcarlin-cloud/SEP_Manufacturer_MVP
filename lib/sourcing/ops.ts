import { MAX_MESSAGES_PER_SUPPLIER, MAX_SUPPLIERS } from "../schemas";
import type { Sourcing, Supplier, SupplierMessage } from "../types";
import type { SourcingOp } from "./schemas";

// Pure edits to a version's sourcing record. Invariant: a supplier has at
// most one unsent draft, and it is always the last message. Nothing here
// sends anything; "markSent" records that the user sent it themselves.

export const EMPTY_SOURCING: Sourcing = { suppliers: [] };

export type OpContext = { now: string; newId: () => string };
export type OpResult = { ok: true; sourcing: Sourcing } | { ok: false; error: string; status: number };

const failure = (error: string, status = 400): OpResult => ({ ok: false, error, status });

export function draftOf(supplier: Supplier): SupplierMessage | undefined {
  const last = supplier.messages.at(-1);
  return last?.state === "draft" ? last : undefined;
}

const sentMessages = (supplier: Supplier) => supplier.messages.filter((m) => m.state === "sent");

/** Sets the supplier's draft (replacing any unsent one). */
export function withDraft(supplier: Supplier, text: string, aiDrafted: boolean, ctx: OpContext): Supplier {
  const existing = draftOf(supplier);
  const draft: SupplierMessage = { id: existing?.id ?? ctx.newId(), from: "me", text, state: "draft", at: ctx.now, aiDrafted };
  return { ...supplier, messages: [...sentMessages(supplier), draft] };
}

function updateSupplier(sourcing: Sourcing, id: string, change: (s: Supplier) => Supplier | string): OpResult {
  const supplier = sourcing.suppliers.find((s) => s.id === id);
  if (!supplier) return failure("That supplier isn't on this version's list anymore.", 404);
  const next = change(supplier);
  if (typeof next === "string") return failure(next);
  if (next.messages.length > MAX_MESSAGES_PER_SUPPLIER) return failure(`A supplier can have at most ${MAX_MESSAGES_PER_SUPPLIER} messages here.`);
  return { ok: true, sourcing: { ...sourcing, suppliers: sourcing.suppliers.map((s) => (s.id === id ? next : s)) } };
}

export function applySourcingOp(current: Sourcing | undefined, op: SourcingOp, ctx: OpContext): OpResult {
  const sourcing = current ?? EMPTY_SOURCING;
  switch (op.op) {
    case "addSupplier": {
      if (sourcing.suppliers.length >= MAX_SUPPLIERS) return failure(`Keep the shortlist to ${MAX_SUPPLIERS} suppliers or fewer.`);
      const supplier: Supplier = { id: ctx.newId(), ...op.supplier, status: "shortlisted", createdAt: ctx.now, messages: [] };
      return { ok: true, sourcing: { ...sourcing, suppliers: [...sourcing.suppliers, supplier] } };
    }
    case "updateSupplier":
      return updateSupplier(sourcing, op.supplierId, (s) => {
        const base = op.supplier ? { id: s.id, status: s.status, createdAt: s.createdAt, messages: s.messages, ...op.supplier } : s;
        return { ...base, status: op.status ?? base.status };
      });
    case "removeSupplier":
      if (!sourcing.suppliers.some((s) => s.id === op.supplierId)) return failure("That supplier isn't on this version's list anymore.", 404);
      return { ok: true, sourcing: { ...sourcing, suppliers: sourcing.suppliers.filter((s) => s.id !== op.supplierId) } };
    case "addReply":
      return updateSupplier(sourcing, op.supplierId, (s) => {
        const reply: SupplierMessage = { id: ctx.newId(), from: "supplier", text: op.text, state: "sent", at: ctx.now };
        const draft = draftOf(s);
        // The draft stays last (and stays yours to edit or redraft).
        const messages = [...sentMessages(s), reply, ...(draft ? [draft] : [])];
        const status = s.status === "shortlisted" || s.status === "contacted" ? "negotiating" : s.status;
        return { ...s, messages, status };
      });
    case "saveDraft":
      return updateSupplier(sourcing, op.supplierId, (s) => withDraft(s, op.text, false, ctx));
    case "markSent":
      return updateSupplier(sourcing, op.supplierId, (s) => {
        const draft = draftOf(s);
        if (!draft || draft.id !== op.messageId) return "That draft changed. Reload and try again.";
        const status = s.status === "shortlisted" ? "contacted" : s.status;
        return { ...s, status, messages: [...sentMessages(s), { ...draft, state: "sent", at: ctx.now }] };
      });
    case "discardDraft":
      return updateSupplier(sourcing, op.supplierId, (s) => ({ ...s, messages: sentMessages(s) }));
  }
}
