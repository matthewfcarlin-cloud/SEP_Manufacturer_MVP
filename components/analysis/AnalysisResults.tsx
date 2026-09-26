import type { Analysis } from "@/lib/types";
import { PathCard } from "./PathCard";

function Storyboard({ shots }: { shots: Analysis["storyboard"] }) {
  const total = shots.reduce((sum, s) => sum + s.seconds, 0);
  return (
    <details className="rounded-xl border border-line bg-surface p-5">
      <summary className="cursor-pointer font-semibold">
        30-second commercial storyboard <span className="font-normal text-muted">({shots.length} shots, {total}s)</span>
      </summary>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shots.map((s) => (
          <li key={s.shot} className="flex flex-col gap-2 rounded-lg bg-bg p-3 text-sm">
            <span className="font-mono text-xs text-muted">
              Shot {s.shot} · {s.seconds}s
            </span>
            <p>{s.visual}</p>
            <p className="italic text-muted">&ldquo;{s.voiceover}&rdquo;</p>
          </li>
        ))}
      </ol>
    </details>
  );
}

export function AnalysisResults({ analysis, quantity }: { analysis: Analysis; quantity: number }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="grid items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
          <h3 className="font-semibold">Recommendation</h3>
          <p>{analysis.topRecommendation}</p>
          <p className="text-sm text-muted">{analysis.productSummary}</p>
        </div>
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
          {analysis.detectedFeatures.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Detected features</h3>
              <ul className="flex flex-wrap gap-1.5">
                {analysis.detectedFeatures.map((f) => (
                  <li key={f} className="rounded-full border border-line px-2 py-0.5 text-xs">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.risks.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Risks to check</h3>
              <ul className="flex list-disc flex-col gap-1 pl-4 text-sm">
                {analysis.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold">Manufacturing paths</h3>
          <p className="text-xs text-muted">All costs are AI estimates in USD, shown as ranges.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {analysis.paths.map((p, i) => (
            <PathCard key={`${p.process}-${i}`} path={p} rank={i + 1} quantity={quantity} />
          ))}
        </div>
      </section>

      <Storyboard shots={analysis.storyboard} />
    </div>
  );
}
