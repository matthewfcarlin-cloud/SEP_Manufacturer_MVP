import rawShops from "@/data/shops.json";
import { shopsSchema } from "./schemas";
import type { Shop } from "./types";

// Parsed once per server process. A malformed seed file fails loudly here
// rather than rendering half a shop list.
const shops: readonly Shop[] = Object.freeze(parseShops(rawShops));

function parseShops(input: unknown): Shop[] {
  const result = shopsSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`data/shops.json is invalid: ${result.error.message}`);
  }
  return result.data;
}

export function getShops(): readonly Shop[] {
  return shops;
}

export function getShopById(id: string): Shop | undefined {
  return shops.find((s) => s.id === id);
}

export type ShopStats = { shops: number; machines: number; idleMachines: number };

export function summarizeShops(list: readonly Shop[]): ShopStats {
  const machines = list.flatMap((s) => s.machines);
  return {
    shops: list.length,
    machines: machines.length,
    idleMachines: machines.filter((m) => m.idleThisMonth).length,
  };
}
