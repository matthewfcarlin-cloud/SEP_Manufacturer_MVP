import { describe, expect, test } from "vitest";
import { DEFAULT_SHOP_FILTER, filterShops } from "./shopFilter";
import type { Machine, Shop } from "./types";

function machine(overrides: Partial<Machine>): Machine {
  return {
    type: "cnc_milling",
    model: "Test Mill",
    envelopeMm: { x: 100, y: 100, z: 100 },
    materials: ["Aluminum 6061"],
    idleThisMonth: false,
    ...overrides,
  };
}

function shop(id: string, machines: Machine[], overrides: Partial<Shop> = {}): Shop {
  return {
    id,
    name: id,
    neighborhood: "Vernon",
    description: "",
    machines,
    minOrderQty: 1,
    maxOrderQty: 100,
    typicalLeadDays: 7,
    specialties: [],
    isDemoData: true,
    ...overrides,
  };
}

const idleMillBusyLathe = shop("mill-shop", [
  machine({ type: "cnc_milling", idleThisMonth: true }),
  machine({ type: "cnc_turning", model: "Test Lathe" }),
]);
const idleLathe = shop("lathe-shop", [machine({ type: "cnc_turning", idleThisMonth: true })], {
  neighborhood: "Burbank",
});
const busyPrinter = shop("print-shop", [machine({ type: "fdm_print", materials: ["PETG"] })]);
const all = [idleMillBusyLathe, idleLathe, busyPrinter];

describe("filterShops", () => {
  test("default filter returns every shop", () => {
    expect(filterShops(all, DEFAULT_SHOP_FILTER)).toEqual(all);
  });

  test("filters by process", () => {
    const result = filterShops(all, { ...DEFAULT_SHOP_FILTER, process: "cnc_turning" });
    expect(result.map((s) => s.id)).toEqual(["mill-shop", "lathe-shop"]);
  });

  test("idle-only keeps shops with any idle machine", () => {
    const result = filterShops(all, { ...DEFAULT_SHOP_FILTER, idleOnly: true });
    expect(result.map((s) => s.id)).toEqual(["mill-shop", "lathe-shop"]);
  });

  test("process and idle apply to the same machine", () => {
    const result = filterShops(all, {
      ...DEFAULT_SHOP_FILTER,
      process: "cnc_turning",
      idleOnly: true,
    });
    expect(result.map((s) => s.id)).toEqual(["lathe-shop"]);
  });

  test("query matches neighborhood and materials, case-insensitively", () => {
    expect(filterShops(all, { ...DEFAULT_SHOP_FILTER, query: "burbank" }).map((s) => s.id)).toEqual([
      "lathe-shop",
    ]);
    expect(filterShops(all, { ...DEFAULT_SHOP_FILTER, query: " PETG " }).map((s) => s.id)).toEqual([
      "print-shop",
    ]);
  });

  test("does not mutate the input array", () => {
    const input = [...all];
    filterShops(input, { ...DEFAULT_SHOP_FILTER, idleOnly: true });
    expect(input).toEqual(all);
  });
});
