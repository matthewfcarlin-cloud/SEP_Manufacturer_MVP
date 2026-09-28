import { ArrowRight, ChevronDown } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import Link from "next/link";
import { InfoTip, PLAIN_TERMS } from "@/components/InfoTip";
import { formatDaysRange, formatToolingRange, formatUnitCostRange } from "@/lib/format";
import { PROCESS_LABELS } from "@/lib/processes";
import type { ManufacturingPath } from "@/lib/types";

function FitBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`How well it fits: ${score} out of 100`}>
      <div className="h-1.5 w-24 overflow-hidden rounded-pill bg-border">
        <div className="h-full rounded-pill bg-accent" style={{ width: `${score}%` }} />
      </div>
      <span className="text-[14px] font-medium">{score}</span>
    </div>
  );
}

function Cost({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-control bg-bg p-3 sm:block">
      <dt className="text-[13px] text-ink-2">{label}</dt>
      <dd className="whitespace-nowrap font-mono text-sm font-medium">{value}</dd>
    </div>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone: "good" | "bad" }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1 text-[13px] font-medium text-ink-2">{title}</h4>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className={tone === "good" ? "text-green-ink" : "text-amber-ink"}>
              {tone === "good" ? "+" : "−"}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export type TweakLink = { projectId: string; version: number };

type Props = { path: ManufacturingPath; pathIndex: number; quantity: number; tweakLink?: TweakLink };

export function PathCard({ path, pathIndex, quantity, tweakLink }: Props) {
  const isTop = pathIndex === 0;
  return (
    <article
      id={`path-${path.process}`}
      className={`card scroll-mt-6 ${isTop ? "ring-2 ring-accent" : ""}`}
    >
      <details open={isTop} className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
          <div>
            {isTop && <StatusPill tone="accent" className="mb-2">Best fit</StatusPill>}
            <h3 className="type-h3">{PROCESS_LABELS[path.process]}</h3>
            <p className="text-[14px] text-ink-2">{path.materials.join(", ")}</p>
          </div>
          <div className="flex items-center gap-3">
            <FitBar score={path.fitScore} />
            <ChevronDown aria-hidden size={18} strokeWidth={1.75} className="text-ink-2 transition-transform group-open:rotate-180" />
          </div>
        </summary>
        <div className="flex flex-col gap-4 px-5 pb-5">
          <dl className="grid grid-cols-1 gap-2 @lg:grid-cols-3">
            <Cost label={`Per unit @ ${quantity.toLocaleString("en-US")}, est.`} value={formatUnitCostRange(path.unitCostUsd)} />
            <Cost label={<>{PLAIN_TERMS.setup.label}, est.<InfoTip text={PLAIN_TERMS.setup.tip} /></>} value={formatToolingRange(path.toolingCostUsd)} />
            <Cost label={<>{PLAIN_TERMS.time.label}, est.<InfoTip text={PLAIN_TERMS.time.tip} /></>} value={formatDaysRange(path.leadTimeDays)} />
          </dl>

          <div className="grid gap-4 @lg:grid-cols-2">
            <List title="Pros" items={path.pros} tone="good" />
            <List title="Cons" items={path.cons} tone="bad" />
          </div>

          {path.designTweaks.length > 0 && (
            <div>
              <h4 className="mb-2 text-[13px] font-medium text-ink-2">Design tweaks</h4>
              <ol className="flex flex-col gap-2">
                {path.designTweaks.map((t, i) => (
                  <li key={`${i}-${t.change}`} className="rounded-control bg-bg p-3 text-[14px]">
                    <p className="font-medium">{t.change}</p>
                    <p className="mt-1 text-ink-2">{t.why}</p>
                    <p className="mt-1 text-green-ink">{t.impact}</p>
                    {tweakLink && (
                      <Link
                        href={`/project/${tweakLink.projectId}/versions/new?from=${tweakLink.version}&tweak=${pathIndex}.${i}`}
                        className="mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-accent-ink hover:underline"
                      >
                        Try this tweak as a new version <ArrowRight aria-hidden size={16} strokeWidth={1.75} />
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </details>
    </article>
  );
}
