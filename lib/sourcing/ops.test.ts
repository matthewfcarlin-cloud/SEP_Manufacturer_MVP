import { describe, expect, test } from "vitest";
import { MAX_SUPPLIERS, projectVersionSchema } from "../schemas";
import type { Sourcing } from "../types";
import { applySourcingOp, draftOf, type OpContext } from "./ops";
import { sourcingOpSchema } from "./schemas";

let n = 0;
const ctx = (): OpContext => ({ now: new Date(Date.UTC(2026, 8, 27, 12, n)).toISOString(), newId: () => `id${String(++n).padStart(8, "0")}` });

function apply(s: Sourcing | undefined, op: unknown): Sourcing {
  const result = applySourcingOp(s, sourcingOpSchema.parse(op), ctx());
  if (!result.ok) throw new Error(result.error);
  return result.sourcing;
}

const withSupplier = () => apply(undefined, { op: "addSupplier", supplier: { name: "Ningbo Metal Co", listingUrl: "https://www.alibaba.com/x", quote: { unitUsd: 4.2, moq: 500 } } });

describe("applySourcingOp", () => {
  test("adds a shortlisted supplier with no messages", () => {
    const s = withSupplier();
    expect(s.suppliers).toHaveLength(1);
    expect(s.suppliers[0]).toMatchObject({ name: "Ningbo Metal Co", status: "shortlisted", messages: [] });
  });

  test("a draft only becomes sent when the user marks it, and that moves the status on", () => {
    let s = withSupplier();
    const id = s.suppliers[0].id;
    s = apply(s, { op: "saveDraft", supplierId: id, text: "Hello, please quote 250 pcs." });
    const draft = draftOf(s.suppliers[0])!;
    expect(draft.state).toBe("draft");
    expect(s.suppliers[0].status).toBe("shortlisted");
    s = apply(s, { op: "markSent", supplierId: id, messageId: draft.id });
    expect(s.suppliers[0].messages[0].state).toBe("sent");
    expect(s.suppliers[0].status).toBe("contacted");
    expect(draftOf(s.suppliers[0])).toBeUndefined();
  });

  test("saving again replaces the one draft instead of adding a second", () => {
    let s = withSupplier();
    const id = s.suppliers[0].id;
    s = apply(s, { op: "saveDraft", supplierId: id, text: "first" });
    s = apply(s, { op: "saveDraft", supplierId: id, text: "second" });
    expect(s.suppliers[0].messages).toHaveLength(1);
    expect(s.suppliers[0].messages[0].text).toBe("second");
  });

  test("a pasted reply goes before the draft and starts the negotiation", () => {
    let s = withSupplier();
    const id = s.suppliers[0].id;
    s = apply(s, { op: "saveDraft", supplierId: id, text: "my draft" });
    s = apply(s, { op: "addReply", supplierId: id, text: "Price is $5.10, MOQ 1000." });
    const msgs = s.suppliers[0].messages;
    expect(msgs.map((m) => [m.from, m.state])).toEqual([["supplier", "sent"], ["me", "draft"]]);
    expect(s.suppliers[0].status).toBe("negotiating");
  });

  test("marking a stale draft as sent is refused", () => {
    let s = withSupplier();
    const id = s.suppliers[0].id;
    s = apply(s, { op: "saveDraft", supplierId: id, text: "x" });
    const result = applySourcingOp(s, { op: "markSent", supplierId: id, messageId: "notTheDraft1" }, ctx());
    expect(result.ok).toBe(false);
  });

  test("editing a supplier replaces its fields and keeps its messages", () => {
    let s = withSupplier();
    const id = s.suppliers[0].id;
    s = apply(s, { op: "saveDraft", supplierId: id, text: "x" });
    s = apply(s, { op: "updateSupplier", supplierId: id, supplier: { name: "Renamed" }, status: "agreed" });
    expect(s.suppliers[0]).toMatchObject({ id, name: "Renamed", status: "agreed" });
    expect(s.suppliers[0].listingUrl).toBeUndefined();
    expect(s.suppliers[0].messages).toHaveLength(1);
  });

  test("discard and remove", () => {
    let s = withSupplier();
    const id = s.suppliers[0].id;
    s = apply(s, { op: "saveDraft", supplierId: id, text: "x" });
    s = apply(s, { op: "discardDraft", supplierId: id });
    expect(s.suppliers[0].messages).toEqual([]);
    s = apply(s, { op: "removeSupplier", supplierId: id });
    expect(s.suppliers).toEqual([]);
  });

  test("caps the shortlist", () => {
    let s: Sourcing | undefined;
    for (let i = 0; i < MAX_SUPPLIERS; i++) s = apply(s, { op: "addSupplier", supplier: { name: `S${i}` } });
    expect(applySourcingOp(s, { op: "addSupplier", supplier: { name: "one too many" } }, ctx()).ok).toBe(false);
  });

  test("the result is valid stored data", () => {
    let s = withSupplier();
    s = apply(s, { op: "addReply", supplierId: s.suppliers[0].id, text: "hi" });
    const version = { number: 1, createdAt: new Date().toISOString(), notes: "", targetQuantity: 10, imageUrls: [], sourcing: s };
    expect(projectVersionSchema.safeParse(version).success).toBe(true);
  });
});

describe("sourcingOpSchema", () => {
  test("only stores http(s) listing links", () => {
    const op = (listingUrl: string) => sourcingOpSchema.safeParse({ op: "addSupplier", supplier: { name: "x", listingUrl } }).success;
    expect(op("https://www.alibaba.com/product-detail/x.html")).toBe(true);
    expect(op("javascript:alert(1)")).toBe(false);
    expect(op("alibaba.com/x")).toBe(false);
  });
});
