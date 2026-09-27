import { describe, expect, test } from "vitest";
import type { Supplier, SupplierQuote } from "../types";
import { rankSuppliers } from "./compare";
import type { NegotiationTargets } from "./targets";

const targets: NegotiationTargets = {
  process: "cnc_milling", quantity: 250,
  estimate: { low: 8, high: 12, basis: "curve" },
  openingAsk: 6.8, target: 8, walkAway: 12, walkAwayReason: "estimate", tooling: { low: 300, high: 900 },
};

let n = 0;
const supplier = (name: string, quote?: SupplierQuote, status: Supplier["status"] = "negotiating"): Supplier => ({
  id: `s${++n}`, name, status, quote, createdAt: "2026-09-27T00:00:00.000Z", messages: [],
});

describe("rankSuppliers", () => {
  test("ranks by all-in cost per needed part, counting tooling and MOQ overbuy", () => {
    const cheapUnitBigMoq = supplier("Big MOQ", { unitUsd: 7, moq: 1000, toolingUsd: 0, leadDays: 20 }); // 7000 / 250 = 28
    const withTooling = supplier("Tooling", { unitUsd: 8, moq: 100, toolingUsd: 500, leadDays: 20 }); // 2500 / 250 = 10
    const plain = supplier("Plain", { unitUsd: 9.5, moq: 100, toolingUsd: 0, leadDays: 20 }); // 9.5
    const r = rankSuppliers([cheapUnitBigMoq, withTooling, plain], 250, targets);
    expect(r.rows.map((x) => x.name)).toEqual(["Plain", "Tooling", "Big MOQ"]);
    expect(r.rows[2].orderQuantity).toBe(1000);
    expect(r.rows[2].allInPerPartUsd).toBeCloseTo(28);
    expect(r.rows[2].flags).toContain("MOQ 1,000 means buying 750 extra parts");
    expect(r.best?.name).toBe("Plain");
    expect(r.verdict).toContain("Plain is the best pick: $9.50 per part all-in for 250 units (est.)");
    expect(r.verdict).toContain("$0.50 per part less than Tooling");
  });

  test("at about the same price, the faster lead time wins", () => {
    const slow = supplier("Slow", { unitUsd: 9, toolingUsd: 0, leadDays: 40 });
    const fast = supplier("Fast", { unitUsd: 9.3, toolingUsd: 0, leadDays: 25 });
    const r = rankSuppliers([slow, fast], 250, targets);
    expect(r.rows[0].name).toBe("Slow");
    expect(r.best?.name).toBe("Fast");
    expect(r.verdict).toContain("About the same price as Slow, with 15 days faster");
  });

  test("never picks a quote over the walk-away, and says so when all are", () => {
    const over = supplier("Over", { unitUsd: 13, toolingUsd: 0 });
    const ok = supplier("Ok", { unitUsd: 11, toolingUsd: 200 });
    expect(rankSuppliers([over, ok], 250, targets).best?.name).toBe("Ok");
    const r = rankSuppliers([over], 250, targets);
    expect(r.best).toBeNull();
    expect(r.rows[0].flags).toContain("Over your walk-away price");
    expect(r.verdict).toContain("Every quote is over your walk-away");
  });

  test("dropped suppliers are left out and unquoted ones are listed apart", () => {
    const r = rankSuppliers([supplier("Dropped", { unitUsd: 1 }, "dropped"), supplier("No price"), supplier("Quoted", { unitUsd: 9 })], 250, targets);
    expect(r.rows.map((x) => x.name)).toEqual(["Quoted"]);
    expect(r.unquoted.map((x) => x.name)).toEqual(["No price"]);
    expect(r.rows[0].flags).toEqual(["Tooling not quoted yet", "Lead time not quoted yet"]);
    expect(rankSuppliers([], 250, targets).verdict).toBe("Add quoted prices to your suppliers to compare them.");
  });

  test("works without negotiation targets", () => {
    const r = rankSuppliers([supplier("A", { unitUsd: 20 }), supplier("B", { unitUsd: 10 })], 100, null);
    expect(r.best?.name).toBe("B");
    expect(r.rows[0].standing).toBeNull();
  });
});
