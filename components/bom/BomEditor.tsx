"use client";

import { useState } from "react";
import { FormError } from "@/components/upload/UploadPickers";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/bom/build";
import { bomItemEditSchema, type BomItemEdit } from "@/lib/bom/schemas";
import { PROCESS_LABELS, PROCESSES } from "@/lib/processes";
import { BOM_UNITS } from "@/lib/schemas";
import type { BomCategory, BomItem, BomUnit, Process } from "@/lib/types";

type Row = {
  key: string;
  id?: string;
  category: BomCategory;
  name: string;
  spec: string;
  quantity: string;
  unit: BomUnit;
  process: Process | "";
  costLow: string;
  costHigh: string;
  notes: string;
};

let nextKey = 0;
const key = () => `row-${++nextKey}`;

const toRow = (i: BomItem): Row => ({
  key: key(),
  id: i.id,
  category: i.category,
  name: i.name,
  spec: i.spec,
  quantity: String(i.quantityPerProduct),
  unit: i.unit,
  process: i.process ?? "",
  costLow: i.costPerProductUsd ? String(i.costPerProductUsd.low) : "",
  costHigh: i.costPerProductUsd ? String(i.costPerProductUsd.high) : "",
  notes: i.notes ?? "",
});

const blankRow = (process: Process | "" = ""): Row => ({
  key: key(),
  category: process ? "custom_part" : "hardware",
  name: "",
  spec: "",
  quantity: "1",
  unit: "pc",
  process,
  costLow: "",
  costHigh: "",
  notes: "",
});

/** Turns the form rows into edits, or the first problem in plain words. */
function parseRows(rows: Row[]): { items: BomItemEdit[] } | { error: string } {
  const items: BomItemEdit[] = [];
  for (const [i, r] of rows.entries()) {
    const where = r.name.trim() ? `"${r.name.trim()}"` : `Line ${i + 1}`;
    const hasLow = r.costLow.trim() !== "";
    const hasHigh = r.costHigh.trim() !== "";
    if (hasLow !== hasHigh) return { error: `${where}: give both costs, or leave both empty.` };
    const candidate = {
      ...(r.id && { id: r.id }),
      category: r.category,
      name: r.name,
      spec: r.spec,
      quantityPerProduct: Number(r.quantity),
      unit: r.unit,
      ...(r.category === "custom_part" && r.process && { process: r.process }),
      ...(hasLow && { costPerProductUsd: { low: Number(r.costLow), high: Number(r.costHigh) } }),
      ...(r.notes.trim() && { notes: r.notes }),
    };
    const parsed = bomItemEditSchema.safeParse(candidate);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const message = issue.code === "invalid_type" && issue.path[0] === "quantityPerProduct" ? "Quantities must be numbers." : issue.message;
      return { error: `${where}: ${message.replace(/^Invalid input.*$/, "check the numbers.")}` };
    }
    items.push(parsed.data);
  }
  if (!items.length) return { error: "Keep at least one line." };
  return { items };
}

const input = "w-full min-w-0 border border-line bg-bg px-2.5 py-1.5 text-sm";
const label = "flex min-w-0 flex-col gap-1 text-xs font-medium text-muted";

type Props = {
  items: BomItem[];
  defaultProcess: Process;
  saving: boolean;
  onSave: (items: BomItemEdit[]) => void;
  onCancel: () => void;
};

/** Every line as editable fields. Saves the whole list at once. */
export function BomEditor({ items, defaultProcess, saving, onSave, onCancel }: Props) {
  const [rows, setRows] = useState<Row[]>(() => (items.length ? items.map(toRow) : [blankRow(defaultProcess)]));
  const [error, setError] = useState<string | null>(null);
  const change = (k: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === k ? { ...r, ...patch } : r)));

  const save = () => {
    const parsed = parseRows(rows);
    if ("error" in parsed) return setError(parsed.error);
    setError(null);
    onSave(parsed.items);
  };

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <li key={r.key} className="grid gap-3 border border-line bg-surface p-4 sm:grid-cols-6 [&>*]:min-w-0">
            <label className={`${label} sm:col-span-2`}>
              Item
              <input className={input} value={r.name} maxLength={80} onChange={(e) => change(r.key, { name: e.target.value })} aria-label={`Line ${i + 1} name`} />
            </label>
            <label className={label}>
              Type
              <select
                className={input}
                value={r.category}
                onChange={(e) => {
                  const category = e.target.value as BomCategory;
                  change(r.key, { category, process: category === "custom_part" ? r.process || defaultProcess : "" });
                }}
              >
                {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </label>
            <label className={label}>
              Made by
              <select className={input} value={r.process} disabled={r.category !== "custom_part"} onChange={(e) => change(r.key, { process: e.target.value as Process })}>
                <option value="">{r.category === "custom_part" ? "Pick a process" : "Bought"}</option>
                {PROCESSES.map((p) => <option key={p} value={p}>{PROCESS_LABELS[p]}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:col-span-2">
              <label className={label}>
                Qty per unit
                <input className={input} inputMode="decimal" value={r.quantity} onChange={(e) => change(r.key, { quantity: e.target.value })} />
              </label>
              <label className={label}>
                Unit
                <select className={input} value={r.unit} onChange={(e) => change(r.key, { unit: e.target.value as BomUnit })}>
                  {BOM_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </label>
            </div>
            <label className={`${label} sm:col-span-4`}>
              Spec (suppliers see this)
              <textarea className={`${input} min-h-16`} value={r.spec} maxLength={400} onChange={(e) => change(r.key, { spec: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:col-span-2">
              <label className={label}>
                Est. $ per unit, low
                <input className={input} inputMode="decimal" value={r.costLow} onChange={(e) => change(r.key, { costLow: e.target.value })} />
              </label>
              <label className={label}>
                High
                <input className={input} inputMode="decimal" value={r.costHigh} onChange={(e) => change(r.key, { costHigh: e.target.value })} />
              </label>
            </div>
            <label className={`${label} sm:col-span-5`}>
              Private notes
              <input className={input} value={r.notes} maxLength={300} onChange={(e) => change(r.key, { notes: e.target.value })} />
            </label>
            <button
              type="button"
              onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              className="self-end border border-line px-3 py-1.5 text-sm hover:border-ink"
              aria-label={`Remove line ${i + 1}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ol>
      <FormError message={error} />
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setRows((rs) => [...rs, blankRow()])} className="border border-dashed border-line px-4 py-2 text-sm hover:border-ink">
          Add a line
        </button>
        <span className="flex-1" />
        <button type="button" onClick={onCancel} disabled={saving} className="border border-line px-4 py-2 text-sm hover:border-ink disabled:opacity-60">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={saving} className="bg-accent px-5 py-2 text-sm font-medium text-accent-ink hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
          {saving ? "Saving…" : "Save BOM"}
        </button>
      </div>
    </div>
  );
}
