"use client";

import { useMemo, useState } from "react";
import { ShopCard } from "@/components/ShopCard";
import { PROCESS_LABELS, PROCESSES } from "@/lib/processes";
import { DEFAULT_SHOP_FILTER, filterShops, type ShopFilter } from "@/lib/shopFilter";
import type { Process, Shop } from "@/lib/types";

const chipBase = "rounded-full border px-3 py-1.5 text-sm transition-colors";
const chipOn = "border-ink bg-ink text-bg";
const chipOff = "border-line bg-surface text-muted hover:text-ink";

export function ShopBrowser({ shops }: { shops: readonly Shop[] }) {
  const [filter, setFilter] = useState<ShopFilter>(DEFAULT_SHOP_FILTER);
  const visible = useMemo(() => filterShops(shops, filter), [shops, filter]);

  const update = (patch: Partial<ShopFilter>) => setFilter((f) => ({ ...f, ...patch }));
  const processOptions: (Process | "all")[] = ["all", ...PROCESSES];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={filter.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Search shops, neighborhoods, machines, materials"
            aria-label="Search shops"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink sm:max-w-md"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filter.idleOnly}
              onChange={(e) => update({ idleOnly: e.target.checked })}
              className="h-4 w-4 accent-[var(--idle)]"
            />
            Idle machines only
          </label>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by process">
          {processOptions.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={filter.process === p}
              onClick={() => update({ process: p })}
              className={`${chipBase} ${filter.process === p ? chipOn : chipOff}`}
            >
              {p === "all" ? "All processes" : PROCESS_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        Showing {visible.length} of {shops.length} shops
      </p>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">
          No shops match these filters.{" "}
          <button type="button" className="underline" onClick={() => setFilter(DEFAULT_SHOP_FILTER)}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      )}
    </div>
  );
}
