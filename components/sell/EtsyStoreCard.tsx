"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ApiResponse } from "@/lib/api";
import { WHEN_MADE, WHEN_MADE_LABELS, WHO_MADE, WHO_MADE_LABELS, type EtsyCategory, type WhenMade, type WhoMade } from "@/lib/sell/etsy";
import type { StoreListing } from "@/lib/types";
import { StoreCard } from "./StoreCard";

type Options = { categories: EtsyCategory[]; shippingProfiles: { id: number; title: string }[] };

const CONNECT_RESULTS: Record<string, { text: string; tone: "ok" | "bad" }> = {
  connected: { text: "Etsy shop connected.", tone: "ok" },
  declined: { text: "Etsy wasn't connected: the request was declined on Etsy.", tone: "bad" },
  expired: { text: "That Etsy sign-in expired. Try connecting again.", tone: "bad" },
  no_shop: { text: "That Etsy account doesn't have a shop yet. Open one on Etsy, then connect again.", tone: "bad" },
  not_configured: { text: "Etsy isn't set up on this server yet.", tone: "bad" },
  error: { text: "Etsy couldn't be connected. Try again in a minute.", tone: "bad" },
};

/**
 * Etsy: set up (server credentials), connect the creator's shop, then create
 * a draft listing on an explicit click. Drafts are never live.
 */
export function EtsyStoreCard({
  projectId,
  version,
  configured,
  shopName,
  runQuantity,
  drafts,
  connectResult,
}: {
  projectId: string;
  version: number;
  configured: boolean;
  shopName: string | null;
  runQuantity: number;
  drafts: StoreListing[];
  connectResult?: string;
}) {
  const router = useRouter();
  const [options, setOptions] = useState<Options | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"draft" | "disconnect" | null>(null);
  const [created, setCreated] = useState<StoreListing | null>(null);
  const [query, setQuery] = useState("");
  const [taxonomyId, setTaxonomyId] = useState<number | null>(null);
  const [shippingProfileId, setShippingProfileId] = useState<number | null>(null);
  const [whoMade, setWhoMade] = useState<WhoMade>("someone_else");
  const [whenMade, setWhenMade] = useState<WhenMade>("2020_2026");
  const [quantity, setQuantity] = useState(Math.min(999, Math.max(1, runQuantity)));
  const result = connectResult ? CONNECT_RESULTS[connectResult] : undefined;
  const returnTo = `/project/${projectId}/sell`;
  const latest = created ?? drafts.at(-1) ?? null;

  useEffect(() => {
    if (!shopName) return;
    let cancelled = false;
    fetch("/api/stores/etsy/options")
      .then((res) => res.json() as Promise<ApiResponse<Options>>)
      .then((json) => {
        if (cancelled) return;
        if (!json.success) setError(json.error);
        else {
          setOptions(json.data);
          if (json.data.shippingProfiles.length === 1) setShippingProfileId(json.data.shippingProfiles[0].id);
        }
      })
      .catch(() => !cancelled && setError("Couldn't reach the server. Check your connection and try again."));
    return () => {
      cancelled = true;
    };
  }, [shopName]);

  const matches = useMemo(() => {
    if (!options) return [];
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return options.categories.filter((c) => words.every((w) => c.path.toLowerCase().includes(w))).slice(0, 8);
  }, [options, query]);
  const chosenCategory = options?.categories.find((c) => c.id === taxonomyId);

  const createDraft = async () => {
    if (!taxonomyId || !shippingProfileId) return;
    setBusy("draft");
    setError(null);
    try {
      const res = await fetch("/api/stores/etsy/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, version, taxonomyId, shippingProfileId, whoMade, whenMade, quantity }),
      });
      const json = (await res.json()) as ApiResponse<StoreListing>;
      if (!json.success) setError(json.error);
      else {
        setCreated(json.data);
        router.refresh();
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    if (!window.confirm(`Disconnect ${shopName}? Drafts already on Etsy stay there.`)) return;
    setBusy("disconnect");
    await fetch("/api/stores/etsy", { method: "DELETE" }).catch(() => null);
    setBusy(null);
    router.refresh();
  };

  return (
    <StoreCard name="Etsy" status={!configured ? "Needs setup" : shopName ? "Connected" : "Not connected"}>
      {result && <p className={`text-sm ${result.tone === "ok" ? "text-idle" : "text-accent"}`}>{result.text}</p>}

      {!configured ? (
        <>
          <p className="text-sm text-muted">
            Creates a draft listing in your own Etsy shop, photos included. This server needs an Etsy app first; the key stays on the server, never in the code.
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>Register an app at etsy.com/developers (personal access covers your own shop).</li>
            <li>
              Add the callback URL <code className="font-mono text-xs">/api/stores/etsy/callback</code> on this site&apos;s address (https).
            </li>
            <li>
              Set <code className="font-mono text-xs">ETSY_API_KEYSTRING</code> and <code className="font-mono text-xs">ETSY_SHARED_SECRET</code> on the server and restart.
            </li>
          </ol>
        </>
      ) : !shopName ? (
        <>
          <p className="text-sm text-muted">Connect your shop once. Moko can then create drafts in it when you ask; it never publishes or edits live listings.</p>
          <a href={`/api/stores/etsy/connect?returnTo=${encodeURIComponent(returnTo)}`} className="self-start bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90">
            Connect Etsy shop
          </a>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              Shop: <strong>{shopName}</strong>
            </span>
            <button type="button" onClick={disconnect} disabled={busy !== null} className="text-xs text-muted underline hover:text-ink">
              Disconnect
            </button>
          </div>

          {latest && (
            <div className="flex flex-col gap-1 border border-line bg-bg p-3 text-sm">
              <span>
                Draft created{latest.photosUploaded ? ` with ${latest.photosUploaded} photo${latest.photosUploaded === 1 ? "" : "s"}` : ", no photos"}. It isn&apos;t live until you publish it on Etsy.
              </span>
              <a href={latest.url} target="_blank" rel="noopener noreferrer" className="self-start font-medium underline">
                Review and publish on Etsy
              </a>
            </div>
          )}

          {!options && !error ? (
            <div aria-hidden className="h-32 animate-pulse bg-line/40 motion-reduce:animate-none" />
          ) : options ? (
            <div className="flex flex-col gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="eyebrow text-[10px] text-muted">Etsy category</span>
                {chosenCategory ? (
                  <span className="flex items-center justify-between gap-2 border border-line bg-bg px-2 py-1.5">
                    <span className="min-w-0 truncate">{chosenCategory.path}</span>
                    <button type="button" className="text-xs underline" onClick={() => setTaxonomyId(null)}>
                      Change
                    </button>
                  </span>
                ) : (
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search, e.g. desk organizer" className="border border-line bg-bg px-2 py-1.5" />
                )}
              </label>
              {!chosenCategory && matches.length > 0 && (
                <ul className="flex flex-col border border-line">
                  {matches.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => setTaxonomyId(c.id)} className="w-full border-b border-line px-2 py-1.5 text-left last:border-0 hover:bg-bg">
                        {c.path}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="flex flex-col gap-1">
                <span className="eyebrow text-[10px] text-muted">Shipping profile</span>
                {options.shippingProfiles.length ? (
                  <select value={shippingProfileId ?? ""} onChange={(e) => setShippingProfileId(Number(e.target.value) || null)} className="border border-line bg-bg px-2 py-1.5">
                    <option value="">Pick one</option>
                    {options.shippingProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-muted">Your shop has no shipping profiles. Create one in Etsy&apos;s Shop Manager, then reload.</span>
                )}
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="eyebrow text-[10px] text-muted">Who made it</span>
                  <select value={whoMade} onChange={(e) => setWhoMade(e.target.value as WhoMade)} className="border border-line bg-bg px-2 py-1.5">
                    {WHO_MADE.map((w) => (
                      <option key={w} value={w}>
                        {WHO_MADE_LABELS[w]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="eyebrow text-[10px] text-muted">When made</span>
                  <select value={whenMade} onChange={(e) => setWhenMade(e.target.value as WhenMade)} className="border border-line bg-bg px-2 py-1.5">
                    {WHEN_MADE.map((w) => (
                      <option key={w} value={w}>
                        {WHEN_MADE_LABELS[w]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="eyebrow text-[10px] text-muted">Quantity</span>
                  <input type="number" min={1} max={999} value={quantity} onChange={(e) => setQuantity(Math.min(999, Math.max(1, Math.round(Number(e.target.value) || 1))))} className="border border-line bg-bg px-2 py-1.5" />
                </label>
              </div>
              {whoMade === "someone_else" && <p className="text-xs text-muted">Etsy asks you to name the production partner that makes it. Add them in the draft on Etsy before publishing.</p>}
              <button
                type="button"
                onClick={createDraft}
                disabled={!taxonomyId || !shippingProfileId || busy !== null}
                className="self-start bg-accent px-4 py-2 font-medium text-accent-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "draft" ? "Creating the draft…" : latest ? "Create another Etsy draft" : "Create Etsy draft"}
              </button>
              <p className="text-xs text-muted">Creates a draft in {shopName} with this listing&apos;s title, description, 13 tags, price and studio renders. Nothing goes live until you publish it on Etsy.</p>
            </div>
          ) : null}
        </>
      )}
      {error && (
        <p role="alert" className="border border-accent/40 px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}
    </StoreCard>
  );
}
