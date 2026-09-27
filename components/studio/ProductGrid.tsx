"use client";

import Link from "next/link";
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
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products"
            className="w-full border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="eyebrow text-[11px] text-muted">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="border border-line bg-surface px-3 py-2.5 text-sm">
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="border border-dashed border-line p-8 text-center text-sm text-muted">No products match &ldquo;{query}&rdquo;.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
          {shown.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
          {!query && (
            <li>
              <Link
                href="/new"
                className="group flex h-full min-h-64 flex-col items-center justify-center gap-3 border border-dashed border-line p-6 text-center transition-colors hover:border-ink motion-reduce:transition-none"
              >
                <span aria-hidden className="grid h-12 w-12 place-items-center border border-line text-2xl text-muted group-hover:border-ink group-hover:text-ink">
                  +
                </span>
                <span className="display-type text-xl">Start a product</span>
                <span className="max-w-xs text-sm text-muted">Upload a 3D file (STL or STEP), plus any photos or sketches.</span>
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
