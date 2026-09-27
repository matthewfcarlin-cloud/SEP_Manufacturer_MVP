import { formatDimensions } from "@/lib/format";
import { PROCESS_LABELS } from "@/lib/processes";
import type { SpecSheet } from "@/lib/types";

const usd = (n: number) => `$${n.toFixed(2)}`;

/** The spec sheet exactly as a shop would receive it at this share level. */
export function SpecSheetCard({ sheet, title = "Spec sheet" }: { sheet: SpecSheet; title?: string }) {
  const rows: [string, string][] = [
    ["Process", PROCESS_LABELS[sheet.process]],
    ["Size", formatDimensions(sheet.dimensionsMm)],
    ["Material", sheet.material],
    ["Finish", sheet.finish],
    ["Quantities", sheet.quantityTiers.map((q) => q.toLocaleString("en-US")).join(" / ")],
    ["Target price", sheet.targetUnitPriceUsd !== undefined ? `≤ ${usd(sheet.targetUnitPriceUsd)} per unit` : "Not set (no business case)"],
    ["Quotes by", sheet.quoteBy],
  ];
  return (
    <section className="flex flex-col gap-4 border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="eyebrow text-[10px] text-muted">{sheet.shareLevel === "summary" ? "Spec summary only" : "Includes renders and notes"}</span>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-mono text-xs">{v}</dd>
          </div>
        ))}
      </dl>
      {sheet.renders.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {sheet.renders.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- saved render served by our own API
            <img key={src} src={src} alt={`Studio render ${i + 1}`} className="aspect-square w-full border border-line object-cover" />
          ))}
        </div>
      )}
      {sheet.notes && <p className="line-clamp-3 border-l-2 border-line pl-3 text-xs text-muted">{sheet.notes}</p>}
      {sheet.shareLevel === "summary" && (
        <p className="text-xs text-muted">No file, renders, photos or notes: shops see these facts only until you choose to share more.</p>
      )}
    </section>
  );
}
