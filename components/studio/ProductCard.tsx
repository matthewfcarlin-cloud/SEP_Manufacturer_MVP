"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { DemoBadge } from "@/components/Badges";
import type { ApiResponse } from "@/lib/api";
import type { StageStatus } from "@/lib/studio/stage";
import { StudioModel } from "./StudioModel";

/** What the grid needs about one product; built on the server. */
export type ProductSummary = {
  id: string;
  name: string;
  isExample: boolean;
  cadUrl?: string;
  still?: string;
  status: string;
  stageLabel: string;
  stageIndex: number;
  dots: { label: string; status: StageStatus }[];
  canSharePitch: boolean;
  updatedAt: string;
};

const DOT: Record<StageStatus, string> = { done: "bg-ink", current: "bg-accent", todo: "bg-line" };

async function send(url: string, method: "POST" | "PATCH" | "DELETE", body?: object): Promise<void> {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
  if (!json?.success) throw new Error(json?.error ?? "Something went wrong. Please try again.");
}

type Mode = "idle" | "menu" | "rename" | "delete";

/** One product in "My products": render, name, one status line, progress dots, and a ⋯ menu. */
export function ProductCard({ product }: { product: ProductSummary }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [name, setName] = useState(product.name);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const href = `/project/${product.id}`;

  useEffect(() => {
    if (mode !== "menu") return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMode("idle");
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [mode]);

  const run = async (action: () => Promise<void>) => {
    setIsBusy(true);
    setError(null);
    try {
      await action();
      setMode("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const rename = (e: FormEvent) => {
    e.preventDefault();
    void run(() => send(`/api/projects/${product.id}`, "PATCH", { name }));
  };

  const item = "block w-full px-3 py-2 text-left text-sm hover:bg-bg disabled:text-muted";

  return (
    <article className="group relative flex h-full flex-col border border-line bg-surface transition-colors hover:border-ink motion-reduce:transition-none">
      <StudioModel url={product.cadUrl} still={product.still} name={product.name} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="display-type line-clamp-2 min-w-0 break-words text-xl">
            {/* The link covers the whole card; the ⋯ menu sits above it. */}
            <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-accent">
              {product.name}
            </Link>
          </h2>
          <div ref={menuRef} className="relative z-10 shrink-0">
            <button
              type="button"
              onClick={() => setMode(mode === "menu" ? "idle" : "menu")}
              aria-label={`More actions for ${product.name}`}
              aria-haspopup="menu"
              aria-expanded={mode === "menu"}
              className="grid h-8 w-8 place-items-center border border-transparent text-lg leading-none text-muted hover:border-line hover:text-ink"
            >
              ⋯
            </button>
            {mode === "menu" && (
              <div role="menu" aria-label={`${product.name} actions`} className="absolute right-0 top-9 w-52 border border-line bg-surface py-1 shadow-lg">
                <Link role="menuitem" href={href} className={item}>Open</Link>
                {!product.isExample && (
                  <button role="menuitem" type="button" className={item} onClick={() => setMode("rename")}>Rename</button>
                )}
                <button role="menuitem" type="button" className={item} disabled={isBusy} onClick={() => run(() => send(`/api/projects/${product.id}/duplicate`, "POST"))}>
                  {product.isExample ? "Make my own copy" : "Duplicate"}
                </button>
                {!product.isExample &&
                  (product.canSharePitch ? (
                    <Link role="menuitem" href={`${href}/pitch#share`} className={item}>Share pitch</Link>
                  ) : (
                    <button role="menuitem" type="button" disabled className={item} title="See how it's made first">Share pitch</button>
                  ))}
                {!product.isExample && (
                  <button role="menuitem" type="button" className={`${item} text-accent`} onClick={() => setMode("delete")}>Delete…</button>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-sm font-medium">{product.status}</p>

        <div className="mt-auto flex items-center justify-between gap-3">
          <ol aria-label={`Stage ${product.stageIndex + 1} of ${product.dots.length}: ${product.stageLabel}`} className="flex gap-1.5">
            {product.dots.map((d) => (
              <li key={d.label} title={d.label} className={`h-2 w-2 ${DOT[d.status]}`} />
            ))}
          </ol>
          {product.isExample && <DemoBadge label="Example" title="A shared demo product anyone can open" />}
        </div>

        {isBusy && mode === "menu" && <p className="text-xs text-muted" aria-live="polite">Making a copy…</p>}

        {mode === "rename" && (
          <form onSubmit={rename} className="relative z-10 flex flex-col gap-2 border-t border-line pt-3">
            <label className="text-xs font-medium" htmlFor={`rename-${product.id}`}>New name</label>
            <input
              id={`rename-${product.id}`}
              autoFocus
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-ink"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={isBusy || !name.trim()} className="bg-ink px-3 py-1.5 text-sm font-medium text-bg disabled:opacity-50">
                {isBusy ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => { setName(product.name); setMode("idle"); setError(null); }} className="border border-line px-3 py-1.5 text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}

        {mode === "delete" && (
          <div role="alertdialog" aria-label={`Delete ${product.name}?`} className="relative z-10 flex flex-col gap-2 border-t border-accent/40 pt-3">
            <p className="text-sm">
              <span className="font-semibold">Delete {product.name}?</span> Its files and every version leave this server for good.
            </p>
            <div className="flex gap-2">
              <button type="button" disabled={isBusy} onClick={() => run(() => send(`/api/projects/${product.id}`, "DELETE"))} className="bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink disabled:opacity-50">
                {isBusy ? "Deleting…" : "Delete for good"}
              </button>
              <button type="button" onClick={() => setMode("idle")} className="border border-line px-3 py-1.5 text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="relative z-10 text-sm text-accent">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
