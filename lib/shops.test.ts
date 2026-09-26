import { describe, expect, test } from "vitest";
import rawShops from "@/data/shops.json";
import { shopsSchema } from "./schemas";
import { PROCESSES } from "./processes";
import { getShopById, getShops, summarizeShops } from "./shops";

describe("seed shops", () => {
  test("data/shops.json matches the Shop schema", () => {
    expect(shopsSchema.safeParse(rawShops).success).toBe(true);
  });

  test("has 25 shops, all flagged as demo data", () => {
    const shops = getShops();
    expect(shops).toHaveLength(25);
    expect(shops.every((s) => s.isDemoData === true)).toBe(true);
  });

  test("roughly 40% of machines are idle this month", () => {
    const { machines, idleMachines } = summarizeShops(getShops());
    const ratio = idleMachines / machines;
    expect(ratio).toBeGreaterThanOrEqual(0.35);
    expect(ratio).toBeLessThanOrEqual(0.45);
  });

  test("every process is offered by at least two shops", () => {
    const shops = getShops();
    for (const process of PROCESSES) {
      const offering = shops.filter((s) => s.machines.some((m) => m.type === process));
      expect(offering.length, process).toBeGreaterThanOrEqual(2);
    }
  });

  test("idle hours are only reported on idle machines", () => {
    const machines = getShops().flatMap((s) => s.machines);
    const busyWithHours = machines.filter((m) => !m.idleThisMonth && m.idleHoursPerWeek);
    expect(busyWithHours).toEqual([]);
  });
});

describe("shopsSchema", () => {
  const validShop = getShops()[0];

  test("rejects a shop not flagged as demo data", () => {
    const bad = [{ ...validShop, isDemoData: false }];
    expect(shopsSchema.safeParse(bad).success).toBe(false);
  });

  test("rejects an unknown process type", () => {
    const bad = [{ ...validShop, machines: [{ ...validShop.machines[0], type: "welding" }] }];
    expect(shopsSchema.safeParse(bad).success).toBe(false);
  });

  test("rejects minOrderQty above maxOrderQty", () => {
    const bad = [{ ...validShop, minOrderQty: 500, maxOrderQty: 10 }];
    expect(shopsSchema.safeParse(bad).success).toBe(false);
  });

  test("rejects duplicate shop ids", () => {
    expect(shopsSchema.safeParse([validShop, validShop]).success).toBe(false);
  });
});

describe("getShopById", () => {
  test("returns the shop for a known id and undefined otherwise", () => {
    const first = getShops()[0];
    expect(getShopById(first.id)).toBe(first);
    expect(getShopById("no-such-shop")).toBeUndefined();
  });
});
