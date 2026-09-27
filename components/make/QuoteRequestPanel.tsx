"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DemoBadge, IdleBadge } from "@/components/Badges";
import { FormError } from "@/components/upload/UploadPickers";
import type { ApiResponse } from "@/lib/api";
import type { Outreach, ShareLevel, SpecSheet } from "@/lib/types";
import { SpecSheetCard } from "./SpecSheetCard";

export type MatchSummary = { shopId: string; name: string; neighborhood: string; machine: string; idle: boolean; idleHours?: number };

type Props = {
  projectId: string;
  version: number;
  shops: MatchSummary[];
  sheets: Record<ShareLevel, SpecSheet>;
  requestedAt?: string;
};

const LEVELS: { value: ShareLevel; label: string; detail: string }[] = [
  { value: "summary", label: "Spec summary only", detail: "Size, material, finish, quantities, target price. Private by default." },
  { value: "full", label: "Share more", detail: "Also the studio renders, and your notes if the AI may see them." },
];

/** One click sends the spec sheet to the top matched shops (demo: their quotes are simulated). */
export function QuoteRequestPanel({ projectId, version, shops, sheets, requestedAt }: Props) {
  const router = useRouter();
  const [level, setLevel] = useState<ShareLevel>("summary");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (requestedAt && !window.confirm("Request new quotes? This replaces the current demo quotes and your choice.")) return;
    setIsSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions/${version}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareLevel: level }),
      });
      const json = (await res.json()) as ApiResponse<Outreach>;
      if (!json.success) throw new Error(json.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't request quotes.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section aria-labelledby="request-heading" className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col gap-5">
        <div>
          <h2 id="request-heading" className="display-type text-[clamp(1.8rem,3.5vw,2.6rem)]">
            Request quotes
          </h2>
          <p className="mt-1 text-sm text-muted">
            Sends v{version}&apos;s spec sheet to your top {shops.length} matches. They&apos;re demo shops, so the quotes that come back are
            simulated inside your analysis cost range.
          </p>
        </div>
        <ol className="flex flex-col border border-line bg-surface">
          {shops.map((s, i) => (
            <li key={s.shopId} className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 last:border-0">
              <span className="min-w-0">
                <span className="eyebrow mr-2 text-[10px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-medium">{s.name}</span>
                <span className="block text-xs text-muted">
                  {s.neighborhood} · {s.machine}
                </span>
              </span>
              <span className="flex flex-wrap gap-1.5">
                {s.idle && <IdleBadge hoursPerWeek={s.idleHours} />}
                <DemoBadge />
              </span>
            </li>
          ))}
        </ol>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">What the shops receive</legend>
          {LEVELS.map((l) => (
            <label key={l.value} className="flex gap-3 border border-line bg-surface px-3 py-2.5 text-sm has-[:checked]:border-accent">
              <input type="radio" name="share-level" value={l.value} checked={level === l.value} onChange={() => setLevel(l.value)} className="mt-1" />
              <span>
                <span className="font-medium">{l.label}</span>
                <span className="block text-xs text-muted">{l.detail}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={send}
            disabled={isSending}
            className="bg-accent px-5 py-3 font-medium text-accent-ink hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {isSending ? "Sending…" : requestedAt ? "Request new quotes" : `Request quotes from ${shops.length} shops`}
          </button>
          {requestedAt && <span className="text-xs text-muted">Last requested {new Date(requestedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
        </div>
        <FormError message={error} />
      </div>
      <SpecSheetCard sheet={sheets[level]} title="Spec sheet preview" />
    </section>
  );
}
