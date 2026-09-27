import Link from "next/link";
import { AtAGlance } from "@/components/analysis/AtAGlance";
import { CostByVolumeChart } from "@/components/analysis/CostByVolumeChart";
import { effectiveCostCurve, type CostCurve } from "@/lib/costCurve";
import { matchVersion } from "@/lib/match";
import type { ProjectVersion } from "@/lib/types";
import { Reveal } from "./Reveal";

/**
 * Curri-style: the real product UI as the showcase. These are the same
 * components the results page uses, fed by a real saved analysis.
 */
export function Showcase({ name, version, href }: { name: string; version: ProjectVersion; href: string | null }) {
  const analysis = version.analysis;
  if (!analysis) return null;
  const curves = analysis.paths.map(effectiveCostCurve).filter((c): c is CostCurve => c !== null);
  const topMatch = matchVersion(version)[0];

  return (
    <section aria-labelledby="showcase-heading" className="border-t border-line py-24 sm:py-32">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 sm:px-6">
        <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow text-muted">Real output · {name} · {version.targetQuantity} units</p>
            <h2 id="showcase-heading" className="display-type mt-4 text-[clamp(2.6rem,6vw,5.5rem)]">
              One upload.
              <br />
              The whole picture.
            </h2>
          </div>
          {href && (
            <Link href={href} className="eyebrow text-muted underline-offset-4 hover:text-ink hover:underline">
              Open the full analysis →
            </Link>
          )}
        </Reveal>

        <Reveal className="overflow-hidden rounded-lg border border-line bg-bg shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-3">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-line" />
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-line" />
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-line" />
            <span className="eyebrow ml-3 truncate text-muted">moko / project / {name}</span>
          </div>
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            <AtAGlance analysis={analysis} quantity={version.targetQuantity} topMatch={topMatch} />
            {curves.length === analysis.paths.length && curves.length > 0 && (
              <CostByVolumeChart curves={curves} targetQuantity={version.targetQuantity} />
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
