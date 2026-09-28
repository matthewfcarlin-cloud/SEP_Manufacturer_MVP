"use client";

import { useMemo, useState } from "react";
import { ShopCard } from "@/components/ShopCard";
import { PROCESS_LABELS, PROCESSES } from "@/lib/processes";
import { DEFAULT_SHOP_FILTER, filterShops, type ShopFilter } from "@/lib/shopFilter";
import type { Process, Shop } from "@/lib/types";
import { controlClasses } from "@/components/ui/Field";

const chipBase = "shrink-0 whitespace-nowrap rounded-pill border px-3 py-1.5 text-sm transition-colors";
const chipOn = "border-accent bg-accent-soft text-accent-ink";
const chipOff = "border-border bg-surface text-ink-2 hover:text-ink";

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
            placeholder="Search by name, place or what they make"
            aria-label="Search manufacturers"
            className={controlClasses("sm:max-w-md")}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filter.idleOnly}
              onChange={(e) => update({ idleOnly: e.target.checked })}
              className="h-4 w-4 accent-[var(--green)]"
            />
            Can start this week
          </label>
        </div>
        <div
          className="-mx-4 flex flex-nowrap gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
          role="group"
          aria-label="Filter by process. Scroll horizontally on small screens."
          tabIndex={0}
        >
          {processOptions.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={filter.process === p}
              onClick={() => update({ process: p })}
              className={`${chipBase} ${filter.process === p ? chipOn : chipOff}`}
            >
              {p === "all" ? "Everything" : PROCESS_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-ink-2" aria-live="polite">
        Showing {visible.length} of {shops.length} manufacturers
      </p>

      {visible.length === 0 ? (
        <div className="rounded-card bg-bg p-10 text-center text-sm text-ink-2">
          No manufacturers match these filters.{" "}
          <button type="button" className="font-medium text-blue-ink hover:underline" onClick={() => setFilter(DEFAULT_SHOP_FILTER)}>
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
