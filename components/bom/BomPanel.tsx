"use client";

import { useState } from "react";
import { CopyButton } from "@/components/sourcing/CopyButton";
import { useBusy } from "@/components/sourcing/useSourcing";
import { AiErrorBanner } from "@/components/AiErrorBanner";
import { AiCallError } from "@/lib/client/aiError";
import type { ApiResponse } from "@/lib/api";
import { CATEGORY_LABELS, bomToCsv, bomTotals, runQuantity } from "@/lib/bom/build";
import type { BomItemEdit } from "@/lib/bom/schemas";
import { bomSpecText } from "@/lib/bom/sourcing";
import { formatUnitCostRange } from "@/lib/format";
import { PROCESS_LABELS, processInSentence } from "@/lib/processes";
import type { Bom, BomItem, Process } from "@/lib/types";
import { BomEditor } from "./BomEditor";

type Props = {
  projectId: string;
  projectName: string;
  version: number;
  targetQuantity: number;
  processes: Process[];
  initial?: Bom;
};

async function call(method: "POST" | "PUT", body: unknown): Promise<Bom> {
  const res = await fetch("/api/bom", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => null)) as ApiResponse<Bom> | null;
  if (!json) throw new Error("The server didn't answer. Please try again.");
  if (!json.success) throw new AiCallError(json.error, res.status);
  return json.data;
}

function download(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

const qty = (n: number, unit: string) => `${n.toLocaleString("en-US")} ${unit === "pc" && n !== 1 ? "pcs" : unit}`;

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow text-muted">{label}</dt>
      <dd className="font-mono text-2xl tabular-nums">{value}</dd>
      {note && <dd className="text-xs text-muted">{note}</dd>}
    </div>
  );
}

function Line({ item, targetQuantity }: { item: BomItem; targetQuantity: number }) {
  return (
    <li className="grid grid-cols-2 gap-x-6 gap-y-1 border-b border-line py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_10rem_9rem] [&>*]:min-w-0">
      <div className="col-span-2 sm:col-span-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{item.name}</span>
          <span className="eyebrow text-muted">{item.process ? PROCESS_LABELS[item.process] : CATEGORY_LABELS[item.category]}</span>
          {item.source === "ai" && <span className="border border-line px-1.5 text-[0.65rem] uppercase tracking-wide text-muted">AI draft</span>}
        </p>
        <p className="text-sm text-muted">{item.spec || "No spec yet"}</p>
        {item.notes && <p className="mt-0.5 text-xs italic text-muted">{item.notes}</p>}
      </div>
      <p className="font-mono text-sm tabular-nums sm:text-right">
        {qty(item.quantityPerProduct, item.unit)} / unit
        <span className="block text-xs text-muted">{qty(runQuantity(item, targetQuantity), item.unit)} for the run</span>
      </p>
      <p className="text-right font-mono text-sm tabular-nums">
        {item.costPerProductUsd ? `${formatUnitCostRange(item.costPerProductUsd)}` : "—"}
        <span className="block text-xs text-muted">{item.costPerProductUsd ? "est. per unit" : "not priced"}</span>
      </p>
    </li>
  );
}

function Skeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3 border border-line p-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-10 animate-pulse bg-line/40 motion-reduce:animate-none" />
      ))}
    </div>
  );
}

/** The version's bill of materials: an AI first draft the user corrects, exported for suppliers. */
export function BomPanel({ projectId, projectName, version, targetQuantity, processes, initial }: Props) {
  const [bom, setBom] = useState<Bom | undefined>(initial);
  const [editing, setEditing] = useState(false);
  const [process, setProcess] = useState<Process>(initial?.process ?? processes[0]);
  const { busy, error, errorStatus, run } = useBusy();
  const target = { projectId, version };

  const draft = () => {
    if (bom?.editedByUser && !window.confirm("Redraft the BOM? This replaces your edited lines with a new AI draft.")) return;
    void run("draft", async () => {
      setBom(await call("POST", { ...target, process }));
      setEditing(false);
    });
  };
  const save = (items: BomItemEdit[]) =>
    void run("save", async () => {
      setBom(await call("PUT", { ...target, items }));
      setEditing(false);
    });

  const totals = bom && bomTotals(bom);
  const fileBase = `${projectName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "product"}-v${version}`;
  const specText = bom ? bomSpecText({ bom, targetQuantity }).join("\n") : "";

  return (
    <section aria-labelledby="bom-heading" className="flex flex-col gap-6">
      <div>
        <p className="eyebrow text-accent">What you&apos;re sourcing</p>
        <h2 id="bom-heading" className="display-type text-[clamp(2rem,4vw,3.25rem)]">Bill of materials</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Everything that goes into one finished unit: the custom parts from your CAD file, plus the hardware, finishes and packaging around
          them. The AI drafts it from your analysis, notes and photos; you correct it. Suppliers get the spec lines, never your costs or notes.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="bom-process">
          Main part made by
          <select id="bom-process" value={process} onChange={(e) => setProcess(e.target.value as Process)} disabled={busy !== null} className="border border-line bg-surface px-3 py-2 text-sm">
            {processes.map((p) => <option key={p} value={p}>{PROCESS_LABELS[p]}</option>)}
          </select>
        </label>
        <button
          type="button"
          disabled={busy !== null}
          onClick={draft}
          className="bg-accent px-5 py-2.5 font-medium text-accent-ink hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {busy === "draft" ? "Drafting the BOM…" : bom ? "Redraft with AI" : "Draft my BOM"}
        </button>
        {!bom && !editing && busy === null && (
          <button type="button" onClick={() => setEditing(true)} className="border border-line px-4 py-2.5 text-sm hover:border-ink">
            Start from scratch
          </button>
        )}
      </div>
      {error && <AiErrorBanner message={error} status={errorStatus} />}

      {busy === "draft" ? (
        <Skeleton />
      ) : editing ? (
        <BomEditor items={bom?.items ?? []} defaultProcess={process} saving={busy === "save"} onSave={save} onCancel={() => setEditing(false)} />
      ) : bom && totals ? (
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-2 gap-4 border border-line bg-surface p-5 sm:grid-cols-3">
            <Stat label="Lines" value={String(bom.items.length)} note={`${totals.customParts} custom · ${totals.boughtLines} bought`} />
            <Stat
              label="Per unit · est."
              value={totals.perProduct ? formatUnitCostRange(totals.perProduct) : "—"}
              note={totals.uncostedLines ? `${totals.uncostedLines} line${totals.uncostedLines === 1 ? "" : "s"} not priced` : "All lines priced"}
            />
            <Stat
              label={`${targetQuantity.toLocaleString("en-US")} units · est.`}
              value={totals.perProduct ? formatUnitCostRange({ low: totals.perProduct.low * targetQuantity, high: totals.perProduct.high * targetQuantity }) : "—"}
              note="Tooling not included"
            />
          </dl>

          <ul className="border-y border-line">
            {bom.items.map((item) => <Line key={item.id} item={item} targetQuantity={targetQuantity} />)}
          </ul>

          <div className="flex flex-wrap gap-3">
            <a href="#sourcing-heading" className="bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90">
              Find suppliers for this BOM ↓
            </a>
            <button type="button" onClick={() => setEditing(true)} className="bg-ink px-4 py-2 text-sm font-medium text-bg hover:opacity-90">
              Edit lines
            </button>
            <button type="button" onClick={() => download(`${fileBase}-bom.csv`, bomToCsv(bom, targetQuantity))} className="border border-line bg-surface px-3 py-1.5 text-sm hover:border-ink">
              Download CSV
            </button>
            <button
              type="button"
              onClick={() => download(`${fileBase}-bom-for-suppliers.csv`, bomToCsv(bom, targetQuantity, { forSupplier: true }))}
              className="border border-line bg-surface px-3 py-1.5 text-sm hover:border-ink"
            >
              Supplier CSV (no costs)
            </button>
            <CopyButton text={specText} label="Copy spec list" />
          </div>

          {bom.assumptions.length > 0 && (
            <div className="text-sm">
              <p className="eyebrow text-muted">What the AI assumed</p>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted">
                {bom.assumptions.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted">
            Drafted for {processInSentence(bom.process)}
            {bom.editedByUser ? ", edited by you" : ""}. Costs are estimates per finished unit at {targetQuantity.toLocaleString("en-US")} units, from the AI&apos;s
            general knowledge, not live prices; tooling is one-time and shown in the analysis.
          </p>
        </div>
      ) : (
        <div className="border border-dashed border-line p-8 text-sm text-muted">
          No bill of materials yet. The AI drafts one from this version&apos;s analysis, notes and photos (whatever your AI
          settings allow).
        </div>
      )}
    </section>
  );
}
