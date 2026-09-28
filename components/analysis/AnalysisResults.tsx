import { effectiveCostCurve, type CostCurve } from "@/lib/costCurve";
import type { Analysis, ShopMatch } from "@/lib/types";
import { AtAGlance } from "./AtAGlance";
import { CostByVolumeChart } from "./CostByVolumeChart";
import { PathCard, type TweakLink } from "./PathCard";
import { PathComparison } from "./PathComparison";
import { DetailsAccordion } from "@/components/ui/DetailsAccordion";

function Storyboard({ shots }: { shots: Analysis["storyboard"] }) {
  const total = shots.reduce((sum, s) => sum + s.seconds, 0);
  return (
    <DetailsAccordion label={`30-second commercial storyboard (${shots.length} shots, ${total}s)`} className="card card-pad">
      <ol className="grid gap-3 @lg:grid-cols-2 @3xl:grid-cols-3">
        {shots.map((s) => (
          <li key={s.shot} className="flex flex-col gap-2 rounded-control bg-bg p-3 text-sm">
            <span className="text-[13px] font-medium text-ink-2">
              Shot {s.shot} · {s.seconds}s
            </span>
            <p>{s.visual}</p>
            <p className="italic text-ink-2">&ldquo;{s.voiceover}&rdquo;</p>
          </li>
        ))}
      </ol>
    </DetailsAccordion>
  );
}

type Props = {
  analysis: Analysis;
  quantity: number;
  topMatch?: ShopMatch;
  /** When set, each design tweak links to a new version that applies it. */
  tweakLink?: TweakLink;
};

export function AnalysisResults({ analysis, quantity, topMatch, tweakLink }: Props) {
  const curves = analysis.paths.map(effectiveCostCurve).filter((c): c is CostCurve => c !== null);
  const hasCurves = curves.length === analysis.paths.length && curves.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <AtAGlance analysis={analysis} quantity={quantity} topMatch={topMatch} />

      <section className="grid items-start gap-4 @3xl:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-3 card card-pad">
          <h3 className="font-semibold">Recommendation</h3>
          <p>{analysis.topRecommendation}</p>
          <p className="text-sm text-ink-2">{analysis.productSummary}</p>
        </div>
        <div className="flex flex-col gap-4 card card-pad">
          {analysis.detectedFeatures.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Detected features</h3>
              <ul className="flex flex-wrap gap-1.5">
                {analysis.detectedFeatures.map((f) => (
                  <li key={f} className="rounded-pill bg-hover px-2.5 py-0.5 text-[13px] text-ink-2">
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

      {hasCurves ? (
        <CostByVolumeChart curves={curves} targetQuantity={quantity} />
      ) : (
        <p className="rounded-card bg-bg p-4 text-sm text-ink-2">
          This analysis predates the cost-by-quantity chart. Re-run the analysis to see how each process&apos;s cost changes with volume.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold">Manufacturing paths</h3>
          <p className="text-[13px] text-ink-2">All costs are AI estimates in USD, shown as ranges.</p>
        </div>
        <PathComparison paths={analysis.paths} quantity={quantity} />
        <div className="flex flex-col gap-3">
          {analysis.paths.map((p, i) => (
            <PathCard key={`${p.process}-${i}`} path={p} pathIndex={i} quantity={quantity} tweakLink={tweakLink} />
          ))}
        </div>
      </section>

      <Storyboard shots={analysis.storyboard} />
    </div>
  );
}
