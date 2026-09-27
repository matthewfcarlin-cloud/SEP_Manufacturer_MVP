"use client";

import { useState } from "react";
import Image from "next/image";
import { allInCostAt, cheapestPathAt } from "@/lib/businessCase";
import type { Analysis, BusinessCaseInputs, EtsyListing } from "@/lib/types";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }
  return <section className="min-w-0 border border-line bg-surface p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3"><h3 className="eyebrow text-muted">{label}</h3><button onClick={copy} className="eyebrow shrink-0 border border-line px-3 py-2 text-[10px] hover:border-accent" type="button">{copied ? "COPIED" : "COPY"}</button></div>
    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{value}</p>
  </section>;
}

export function SellingPanel({ projectId, version, initial, businessCase, analysis, targetQuantity }: { projectId: string; version: number; initial?: EtsyListing; businessCase?: BusinessCaseInputs; analysis?: Analysis; targetQuantity: number }) {
  const [listing, setListing] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const feeEstimate = listing ? listing.priceUsd * 0.095 + 0.25 : 0;
  const totalCost = analysis && analysis.paths.length ? allInCostAt(cheapestPathAt(analysis.paths, targetQuantity), targetQuantity) : undefined;
  const marginAfterFees = listing && totalCost ? { low: listing.priceUsd - feeEstimate - totalCost.high, high: listing.priceUsd - feeEstimate - totalCost.low } : undefined;
  async function generate() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/listing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId, version }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error ?? "Couldn't generate the listing.");
      setListing(result.data);
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't generate the listing."); }
    finally { setBusy(false); }
  }
  return <section id="selling" className="scroll-mt-6 space-y-6">
    <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-end"><div><p className="eyebrow text-accent">ETSY LISTING · SAVED ON V{version}</p><h2 className="display-type mt-2 text-3xl sm:text-4xl">Selling</h2></div><button disabled={busy || !businessCase} onClick={generate} className="eyebrow bg-accent px-5 py-4 text-xs font-bold text-accent-ink disabled:opacity-50" type="button">{busy ? "WRITING LISTING…" : listing ? "REGENERATE LISTING" : "GENERATE ETSY LISTING"}</button></div>
    {!businessCase && <p className="border border-line p-4 text-sm text-muted">Set a price in the business case before generating a listing.</p>}
    {error && <p role="alert" className="border border-red-500 p-4 text-sm">{error}</p>}
    {listing ? <>
      <div className="grid gap-4 lg:grid-cols-2"><CopyField label={`Title · ${listing.title.length}/140`} value={listing.title}/><CopyField label="Suggested price · USD" value={`$${listing.priceUsd.toFixed(2)}`}/><div className="lg:col-span-2"><CopyField label="Description" value={listing.description}/></div><div className="lg:col-span-2"><CopyField label="Tags · 13" value={listing.tags.join(", ")}/></div></div>
      <p className="eyebrow text-muted">EST. ETSY FEES ~${feeEstimate.toFixed(2)} · EST. MARGIN AFTER FEES {marginAfterFees ? `$${marginAfterFees.low.toFixed(2)}–$${marginAfterFees.high.toFixed(2)} / SALE` : "UNAVAILABLE"} <span className="normal-case tracking-normal">(about 9.5% + $0.25 and estimated unit cost including tooling; excludes payment, ads, tax and country-specific fees)</span></p>
      <div><h3 className="eyebrow mb-3 text-muted">LISTING PHOTOS · PITCH KIT RENDERS</h3>{listing.photos.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{listing.photos.map((photo) => <Image key={photo} src={photo} alt="Product listing photo" width={800} height={800} unoptimized className="aspect-square w-full border border-line object-cover" />)}</div> : <p className="border border-line p-4 text-sm text-muted">No saved pitch-kit renders yet. Generate the renders on the product analysis screen, then regenerate this listing.</p>}</div>
      <p className="eyebrow text-muted">GENERATED {new Date(listing.generatedAt).toLocaleDateString()}</p>
    </> : <p className="max-w-2xl border border-line p-5 text-sm leading-6 text-muted">Your listing will include a 140-character title, product description, 13 Etsy tags, suggested price from your business case, estimated fees and pitch-kit photos.</p>}
    <div className="flex flex-wrap gap-3"><button type="button" disabled className="eyebrow border border-line px-4 py-3 text-xs text-muted opacity-70">CONNECT ETSY SHOP · COMING SOON</button><button type="button" disabled className="eyebrow border border-line px-4 py-3 text-xs text-muted opacity-70">SHOPIFY · COMING SOON</button></div>
  </section>;
}
