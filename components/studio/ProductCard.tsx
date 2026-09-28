"use client";

import { Copy, FolderOpen, Pencil, Share2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DemoBadge } from "@/components/Badges";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import type { ApiResponse } from "@/lib/api";
import type { StageStatus } from "@/lib/studio/stage";
import { statusTone } from "@/lib/studio/statusLine";
import type { Stage } from "@/lib/types";
import { StepBar } from "./StepBar";
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
  statuses: Record<Stage, StageStatus>;
  canSharePitch: boolean;
  updatedAt: string;
  /** "Edited 2h ago", worked out on the server when the page is built. */
  edited: string;
};

async function send(url: string, method: "POST" | "PATCH" | "DELETE", body?: object): Promise<void> {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
  if (!json?.success) throw new Error(json?.error ?? "Something went wrong. Please try again.");
}

type Mode = "idle" | "rename" | "delete";

/** One product in "My products": render, name, one status line, progress dots, and a ⋯ menu. */
export function ProductCard({ product }: { product: ProductSummary }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [name, setName] = useState(product.name);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const href = `/project/${product.id}`;

  const run = async (action: () => Promise<void>, done?: string) => {
    setIsBusy(true);
    setError(null);
    try {
      await action();
      setMode("idle");
      if (done) toast({ message: done });
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

  const menuItems: MenuItem[] = [
    { label: "Open", icon: FolderOpen, onSelect: () => router.push(href) },
    ...(product.isExample ? [] : [{ label: "Rename", icon: Pencil, onSelect: () => setMode("rename") }]),
    { label: product.isExample ? "Make my own copy" : "Duplicate", icon: Copy, isDisabled: isBusy, onSelect: () => void run(() => send(`/api/projects/${product.id}/duplicate`, "POST"), "Copy made") },
    ...(product.isExample ? [] : [{ label: "Share pitch", icon: Share2, isDisabled: !product.canSharePitch, onSelect: () => router.push(`${href}/pitch#share`) }]),
    ...(product.isExample ? [] : [{ label: "Delete…", icon: Trash2, isDanger: true, onSelect: () => setMode("delete") }]),
  ];

  return (
    <article className="card lift group relative flex h-full flex-col overflow-hidden">
      {/* Render area: 200px on the warm sidebar color, the model centered. */}
      <div className="bg-sidebar">
        <StudioModel url={product.cadUrl} still={product.still} name={product.name} className="h-[200px]" />
      </div>
      <div className="absolute right-3 top-3 z-10">
        <Menu label={`More actions for ${product.name}`} items={menuItems} className="rounded-control bg-surface/90 shadow-card" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h2 className="type-h3 line-clamp-2 min-w-0 break-words">
          {/* The link covers the whole card; the ⋯ menu sits above it. */}
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-card focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-accent">
            {product.name}
          </Link>
        </h2>

        <p className="flex flex-wrap gap-1.5">
          <StatusPill tone={statusTone(product.status)}>{product.status}</StatusPill>
          {product.isExample && <DemoBadge label="Example" title="A shared demo product anyone can open" />}
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <StepBar statuses={product.statuses} stageIndex={product.stageIndex} showStage={false} className="" />
          <p className="type-small text-muted">{product.edited}</p>
        </div>

        {isBusy && mode === "idle" && <p className="type-small text-muted" aria-live="polite">Making a copy…</p>}

        {mode === "rename" && (
          <form onSubmit={rename} className="relative z-10 flex flex-col gap-2 border-t border-border pt-3">
            <label className="text-[14px] font-medium" htmlFor={`rename-${product.id}`}>New name</label>
            <Input id={`rename-${product.id}`} autoFocus maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isBusy || !name.trim()}>
                {isBusy ? "Saving…" : "Save"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setName(product.name); setMode("idle"); setError(null); }}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {mode === "delete" && (
          <div role="alertdialog" aria-label={`Delete ${product.name}?`} className="relative z-10 flex flex-col gap-2 rounded-control bg-red-soft p-3">
            <p className="text-[14px]">
              <span className="font-semibold">Delete {product.name}?</span> Its files and every version leave this server for good.
            </p>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" icon={Trash2} disabled={isBusy} onClick={() => run(() => send(`/api/projects/${product.id}`, "DELETE"), "Product deleted")}>
                {isBusy ? "Deleting…" : "Delete for good"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMode("idle")}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="relative z-10 text-[14px] text-red-ink">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
