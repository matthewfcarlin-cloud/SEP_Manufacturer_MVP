"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { inputClasses, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMemo, useState } from "react";
import { ProductCard, type ProductSummary } from "./ProductCard";

const SORTS = {
  updated: { label: "Last updated", compare: (a: ProductSummary, b: ProductSummary) => b.updatedAt.localeCompare(a.updatedAt) },
  name: { label: "Name (A–Z)", compare: (a: ProductSummary, b: ProductSummary) => a.name.localeCompare(b.name) },
  stage: { label: "Furthest along", compare: (a: ProductSummary, b: ProductSummary) => b.stageIndex - a.stageIndex },
} as const;
type SortKey = keyof typeof SORTS;

/** Search, sort and the card grid. Your products come before the shared examples in every sort. */
export function ProductGrid({ products }: { products: readonly ProductSummary[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = products.filter((p) => !q || p.name.toLowerCase().includes(q));
    const sorted = [...matches].sort(SORTS[sort].compare);
    return [...sorted.filter((p) => !p.isExample), ...sorted.filter((p) => p.isExample)];
  }, [products, query, sort]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative flex-1 sm:max-w-sm">
          <span className="sr-only">Search products</span>
          <Search aria-hidden size={18} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" className={inputClasses("pl-10")} />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-ink-2">Sort</span>
          <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-auto">
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {shown.length === 0 ? (
        <EmptyState illustration="spark" title="Nothing matches that search" sentence={<>No products match &ldquo;{query}&rdquo;. Try a different word.</>} />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
          {shown.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
          {!query && (
            <li>
              <Link
                href="/new"
                className="group flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-card bg-bg p-6 text-center transition-colors hover:border-accent hover:bg-accent-soft"
              >
                <span aria-hidden className="grid h-12 w-12 place-items-center rounded-pill bg-accent-soft text-accent-ink">
                  <Plus size={22} strokeWidth={1.75} />
                </span>
                <span className="type-h3">Start a product</span>
                <span className="type-small max-w-xs text-ink-2">Upload a 3D file (STL or STEP), plus any photos or sketches.</span>
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
