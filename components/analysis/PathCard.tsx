import { formatDaysRange, formatToolingRange, formatUnitCostRange } from "@/lib/format";
import { PROCESS_LABELS } from "@/lib/processes";
import type { ManufacturingPath } from "@/lib/types";

function FitBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Fit score ${score} out of 100`}>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent" style={{ width: `${score}%` }} />
      </div>
      <span className="font-mono text-sm">{score}</span>
    </div>
  );
}

function Cost({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-lg bg-bg p-3 sm:block">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="whitespace-nowrap font-mono text-sm font-medium">{value}</dd>
    </div>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone: "good" | "bad" }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">{title}</h4>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className={tone === "good" ? "text-idle" : "text-accent"}>
              {tone === "good" ? "+" : "−"}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PathCard({ path, rank, quantity }: { path: ManufacturingPath; rank: number; quantity: number }) {
  const isTop = rank === 1;
  return (
    <article
      className={`flex flex-col gap-4 rounded-xl border bg-surface p-5 ${isTop ? "border-accent/60" : "border-line"}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {isTop && <p className="text-xs font-medium uppercase tracking-wider text-accent">Best fit</p>}
          <h3 className="text-lg font-semibold">{PROCESS_LABELS[path.process]}</h3>
          <p className="text-sm text-muted">{path.materials.join(", ")}</p>
        </div>
        <FitBar score={path.fitScore} />
      </header>

      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Cost label={`Per unit @ ${quantity.toLocaleString("en-US")}, est.`} value={formatUnitCostRange(path.unitCostUsd)} />
        <Cost label="Tooling, est." value={formatToolingRange(path.toolingCostUsd)} />
        <Cost label="Lead time, est." value={formatDaysRange(path.leadTimeDays)} />
      </dl>

      <div className="grid gap-4 sm:grid-cols-2">
        <List title="Pros" items={path.pros} tone="good" />
        <List title="Cons" items={path.cons} tone="bad" />
      </div>

      {path.designTweaks.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Design tweaks</h4>
          <ol className="flex flex-col gap-2">
            {path.designTweaks.map((t, i) => (
              <li key={`${i}-${t.change}`} className="rounded-lg border border-line p-3 text-sm">
                <p className="font-medium">{t.change}</p>
                <p className="mt-1 text-muted">{t.why}</p>
                <p className="mt-1 text-idle">{t.impact}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}
