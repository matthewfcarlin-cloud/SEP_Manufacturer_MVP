import type { Process, Shop } from "./types";

export type ShopFilter = {
  process: Process | "all";
  idleOnly: boolean;
  query: string;
};

export const DEFAULT_SHOP_FILTER: ShopFilter = { process: "all", idleOnly: false, query: "" };

function matchesQuery(shop: Shop, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    shop.name,
    shop.neighborhood,
    shop.description,
    ...shop.specialties,
    ...shop.machines.flatMap((m) => [m.model, ...m.materials]),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/**
 * A shop passes when at least one machine satisfies the process and idle
 * filters together, so "CNC turning + idle only" doesn't match a shop whose
 * only idle machine is a mill.
 */
export function filterShops(shops: readonly Shop[], filter: ShopFilter): Shop[] {
  return shops.filter((shop) => {
    const hasMachine = shop.machines.some(
      (m) =>
        (filter.process === "all" || m.type === filter.process) &&
        (!filter.idleOnly || m.idleThisMonth),
    );
    return hasMachine && matchesQuery(shop, filter.query);
  });
}
