"use client";

import { inputClass } from "@/components/upload/UploadPickers";
import { supplierFieldsSchema } from "@/lib/sourcing/schemas";
import type { z } from "zod";

type SupplierFieldsInput = z.infer<typeof supplierFieldsSchema>;
import type { Supplier, SupplierQuote } from "@/lib/types";

export type FieldDraft = { name: string; email: string; listingUrl: string; unitUsd: string; moq: string; toolingUsd: string; leadDays: string; notes: string };

export const EMPTY_FIELDS: FieldDraft = { name: "", email: "", listingUrl: "", unitUsd: "", moq: "", toolingUsd: "", leadDays: "", notes: "" };

const str = (n: number | undefined) => (n === undefined ? "" : String(n));

export function fieldsFromSupplier(s: Supplier): FieldDraft {
  const q = s.quote ?? {};
  return { name: s.name, email: s.email ?? "", listingUrl: s.listingUrl ?? "", unitUsd: str(q.unitUsd), moq: str(q.moq), toolingUsd: str(q.toolingUsd), leadDays: str(q.leadDays), notes: s.notes ?? "" };
}

const num = (s: string) => (s.trim() === "" ? undefined : Number(s.replace(/[$,\s]/g, "")));

/** Form text → the API's supplier fields, validated with the same schema the server uses. */
export function parseSupplierFields(d: FieldDraft): { error: string } | { supplier: SupplierFieldsInput } {
  const quote: SupplierQuote = { unitUsd: num(d.unitUsd), moq: num(d.moq), toolingUsd: num(d.toolingUsd), leadDays: num(d.leadDays) };
  const hasQuote = Object.values(quote).some((v) => v !== undefined);
  const result = supplierFieldsSchema.safeParse({
    name: d.name,
    email: d.email.trim() || undefined,
    listingUrl: d.listingUrl.trim() || undefined,
    quote: hasQuote ? quote : undefined,
    notes: d.notes.trim() || undefined,
  });
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = String(issue?.path.at(-1) ?? "");
    const friendly: Record<string, string> = {
      unitUsd: "Enter the per-part price as a number, like 3.40.",
      moq: "Enter the MOQ as a whole number.",
      toolingUsd: "Enter tooling as a number of dollars.",
      leadDays: "Enter lead time as a whole number of days.",
    };
    return { error: friendly[field] ?? issue?.message ?? "Check the supplier details." };
  }
  return { supplier: result.data };
}

type Props = { value: FieldDraft; onChange: (v: FieldDraft) => void; idPrefix: string };

export function SupplierFields({ value, onChange, idPrefix }: Props) {
  const set = (key: keyof FieldDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [key]: e.target.value });
  const field = (key: keyof FieldDraft, label: string, placeholder: string, inputMode?: "decimal" | "numeric") => (
    <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor={`${idPrefix}-${key}`}>
      {label}
      <input id={`${idPrefix}-${key}`} value={value[key]} onChange={set(key)} placeholder={placeholder} inputMode={inputMode} className={inputClass} />
    </label>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {field("name", "Supplier name", "e.g. Ningbo die-casting factory")}
      {field("email", "Sales email (optional)", "sales@factory.example")}
      <div className="sm:col-span-2">{field("listingUrl", "Listing or website link (optional)", "https://www.alibaba.com/product-detail/…")}</div>
      <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
        {field("unitUsd", "Quoted $/part", "3.40", "decimal")}
        {field("moq", "MOQ", "500", "numeric")}
        {field("toolingUsd", "Tooling $", "1200", "decimal")}
        {field("leadDays", "Lead time (days)", "30", "numeric")}
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2" htmlFor={`${idPrefix}-notes`}>
        Notes (optional)
        <textarea id={`${idPrefix}-notes`} rows={2} value={value.notes} onChange={set("notes")} placeholder="Trade Assurance, years on Alibaba, response rate, anything you noticed." className={inputClass} />
      </label>
    </div>
  );
}
