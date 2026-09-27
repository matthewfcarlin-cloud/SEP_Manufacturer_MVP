import { DemoBadge, StartBadge } from "@/components/Badges";
import { CostByVolumeChart } from "@/components/analysis/CostByVolumeChart";
import { TierTable } from "@/components/businessCase/TierTable";
import { VerdictCard } from "@/components/businessCase/VerdictCard";
import { RENDER_ANGLES } from "@/components/viewer/renderAngles";
import { buildBusinessCase } from "@/lib/businessCase";
import { effectiveCostCurve, type CostCurve } from "@/lib/costCurve";
import {
  formatDaysRange,
  formatToolingRange,
  formatUnitCostRange,
} from "@/lib/format";
import type { IterationStep } from "@/lib/iterationStory";
import { PROCESS_LABELS } from "@/lib/processes";
import type {
  Analysis,
  Project,
  ProjectVersion,
  Shop,
  ShopMatch,
} from "@/lib/types";
import { PitchSection, MissingText, RenderStill } from "./PitchSection";
import { PitchVideoSlot } from "./PitchVideoSlot";

export type PitchDocumentProps = {
  project: Project;
  version: ProjectVersion & { analysis: Analysis };
  story: IterationStep[];
  topMatch?: { match: ShopMatch; shop: Shop };
  /** Owner view: explains how to fill gaps. Shared view: hides them. */
  isOwnerView: boolean;
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-l border-line pl-4">
      <dt className="eyebrow text-muted">{label}</dt>
      <dd className="font-mono text-sm font-semibold">{value}</dd>
    </div>
  );
}

function Cover({ project, version, isOwnerView }: PitchDocumentProps) {
  const best = version.analysis.paths[0];
  const hero = version.renders?.[0];
  return (
    <section
      aria-labelledby="pitch-title"
      className="pitch-page grid gap-8 md:grid-cols-[1fr_1.1fr] md:items-center print:grid-cols-[1fr_1.1fr]"
    >
      <div className="flex flex-col gap-6">
        <p className="eyebrow text-accent">
          Licensing pitch · v{version.number}
        </p>
        <h1
          id="pitch-title"
          className="display-type text-[clamp(2.6rem,6vw,5.5rem)]"
        >
          {project.name}
        </h1>
        <p className="text-xl leading-relaxed">
          {version.pitch?.oneLiner ?? version.analysis.productSummary}
        </p>
        <dl className="grid grid-cols-3 gap-4">
          <Fact label="Made by" value={PROCESS_LABELS[best.process]} />
          <Fact
            label={`Per unit @ ${version.targetQuantity.toLocaleString("en-US")}, est.`}
            value={formatUnitCostRange(best.unitCostUsd)}
          />
          <Fact
            label="Tooling, est."
            value={formatToolingRange(best.toolingCostUsd)}
          />
        </dl>
      </div>
      {hero ? (
        <RenderStill
          src={hero}
          caption={`${RENDER_ANGLES[0].label} view`}
          alt={`${project.name}, studio render`}
          isHero
        />
      ) : (
        isOwnerView && (
          <MissingText>
            Studio renders appear here once they&apos;re captured from the 3D
            model.
          </MissingText>
        )
      )}
    </section>
  );
}

function ProblemAndProduct({
  project,
  version,
  isOwnerView,
}: PitchDocumentProps) {
  const { pitch, analysis, renders } = version;
  const missing = isOwnerView && (
    <MissingText>
      Use &ldquo;Write pitch with AI&rdquo; above to draft this section, then
      edit it.
    </MissingText>
  );
  return (
    <>
      <PitchSection
        id="pitch-problem"
        eyebrow="The problem"
        title="Why this needs to exist"
      >
        {pitch ? (
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] print:grid-cols-[1.4fr_1fr]">
            <p className="text-2xl leading-relaxed">{pitch.problem}</p>
            <div className="rounded-xl bg-surface p-5">
              <p className="eyebrow text-muted">Who buys it</p>
              <p className="mt-2 leading-relaxed">{pitch.audience}</p>
            </div>
          </div>
        ) : (
          missing
        )}
      </PitchSection>

      <PitchSection
        id="pitch-product"
        eyebrow="The product"
        title="What we're offering"
      >
        {pitch ? (
          <p className="max-w-4xl text-xl leading-relaxed">{pitch.product}</p>
        ) : (
          missing
        )}
        <ul className="flex flex-wrap gap-2">
          {analysis.detectedFeatures.map((f) => (
            <li
              key={f}
              className="rounded-full border border-line px-3 py-1 text-sm"
            >
              {f}
            </li>
          ))}
        </ul>
        {renders && renders.length > 1 && (
          <div className="grid grid-cols-3 gap-4">
            {renders.slice(1).map((src, i) => (
              <RenderStill
                key={src}
                src={src}
                caption={`${RENDER_ANGLES[i + 1].label} view`}
                alt={`${project.name}, ${RENDER_ANGLES[i + 1].label.toLowerCase()} view`}
              />
            ))}
          </div>
        )}
      </PitchSection>
    </>
  );
}

function HowItsMade({ version, topMatch }: PitchDocumentProps) {
  const best = version.analysis.paths[0];
  return (
    <PitchSection
      id="pitch-made"
      eyebrow="How it gets made"
      title={PROCESS_LABELS[best.process]}
    >
      <div className="grid gap-5 lg:grid-cols-2 print:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
          <p className="leading-relaxed">
            {version.analysis.topRecommendation}
          </p>
          <dl className="grid grid-cols-3 gap-4">
            <Fact label="Fit" value={`${best.fitScore}/100`} />
            <Fact
              label="Lead time, est."
              value={formatDaysRange(best.leadTimeDays)}
            />
            <Fact label="Material" value={best.materials[0] ?? "—"} />
          </dl>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6">
          {topMatch ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="eyebrow text-accent">
                  Local shop ready to run it
                </p>
                <StartBadge canStartNow={topMatch.match.idleBoost} />
                <DemoBadge />
              </div>
              <p className="text-2xl font-semibold tracking-tight">
                {topMatch.shop.name}
              </p>
              <p className="text-sm text-muted">
                {topMatch.shop.neighborhood} ·{" "}
                {topMatch.match.matchedMachine.model}
              </p>
              {topMatch.match.requiredTweaks[0] && (
                <p className="border-l-2 border-accent pl-3 text-sm">
                  <span className="font-semibold">Quote against: </span>
                  {topMatch.match.requiredTweaks[0]}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">
              No local shop matches this process yet.
            </p>
          )}
        </div>
      </div>
    </PitchSection>
  );
}

function UnitEconomics({ version, isOwnerView }: PitchDocumentProps) {
  const inputs = version.businessCase;
  if (!inputs) {
    return isOwnerView ? (
      <PitchSection
        id="pitch-economics"
        eyebrow="Unit economics"
        title="Can it make money?"
      >
        <MissingText>
          Set up the business case on the project page (retail price and run
          sizes) and it appears here.
        </MissingText>
      </PitchSection>
    ) : null;
  }
  const result = buildBusinessCase(version.analysis.paths, inputs);
  const curves = version.analysis.paths
    .map(effectiveCostCurve)
    .filter((c): c is CostCurve => c !== null);
  return (
    <PitchSection
      id="pitch-economics"
      eyebrow="Unit economics"
      title="Can it make money?"
    >
      {/* In print, verdict + table sit beside the chart so the section fits one landscape page. */}
      <div className="flex flex-col gap-6 print:grid print:grid-cols-2 print:items-start print:gap-4">
        <div className="flex flex-col gap-6 print:gap-3">
          <VerdictCard verdict={result.verdict} />
          <TierTable tiers={result.tiers} />
        </div>
        {curves.length === version.analysis.paths.length &&
          curves.length > 0 && (
            <CostByVolumeChart
              curves={curves}
              targetQuantity={version.targetQuantity}
              title="Cost per part vs. what the maker receives"
              description={`At $${inputs.retailPriceUsd} retail with ${Math.round(inputs.revenueShare * 100)}% to the maker. Where a process's line drops below the dashed line, it pays back its tooling.`}
              priceLine={{
                value: result.revenuePerUnit,
                label: "Maker receives",
              }}
            />
          )}
      </div>
    </PitchSection>
  );
}

function IterationStory({ story }: PitchDocumentProps) {
  if (story.length === 0) return null;
  return (
    <PitchSection
      id="pitch-iteration"
      eyebrow="Iteration"
      title="How the design got better"
    >
      <ol className="flex flex-col gap-3">
        {story.map((step) => (
          <li
            key={step.to}
            className="grid gap-2 rounded-xl border border-line bg-surface p-5 md:grid-cols-[auto_1fr_1fr] md:items-baseline md:gap-6 print:grid-cols-[auto_1fr_1fr]"
          >
            <span className="display-type text-2xl">
              v{step.from} → v{step.to}
            </span>
            <span className="text-sm text-muted">
              {step.change ?? "Revised design"}
            </span>
            <span className="font-semibold">{step.summary}</span>
          </li>
        ))}
      </ol>
    </PitchSection>
  );
}

function Commercial({ version }: PitchDocumentProps) {
  return (
    <PitchSection
      id="pitch-spot"
      eyebrow="A 30-second spot"
      title="How we'd sell it"
    >
      <div className="print:mx-auto print:w-[42%]">
        <PitchVideoSlot video={version.pitchVideo} />
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-2 print:text-xs">
        {version.analysis.storyboard.map((shot) => (
          <li
            key={shot.shot}
            className="flex flex-col justify-between gap-4 rounded-xl border border-line bg-surface p-4 print:gap-2 print:p-3"
          >
            <div>
              <p className="eyebrow text-accent">
                Frame {String(shot.shot).padStart(2, "0")}{" "}
                <span className="text-muted">· {shot.seconds}s</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed print:mt-1 print:text-xs">
                {shot.visual}
              </p>
            </div>
            <p className="border-t border-line pt-3 text-sm italic text-muted print:pt-2 print:text-xs">
              &ldquo;{shot.voiceover}&rdquo;
            </p>
          </li>
        ))}
      </ol>
    </PitchSection>
  );
}

function Ask({ project, version, isOwnerView }: PitchDocumentProps) {
  if (!version.pitch && !isOwnerView) return null;
  return (
    <PitchSection
      id="pitch-ask"
      eyebrow="The ask"
      title="What we're looking for"
    >
      {version.pitch ? (
        <p className="max-w-4xl text-2xl leading-relaxed">
          {version.pitch.ask}
        </p>
      ) : (
        <MissingText>
          Use &ldquo;Write pitch with AI&rdquo; above to draft the ask.
        </MissingText>
      )}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-xs text-muted">
        <span>{project.name} · Moko licensing pitch</span>
        <span>
          All costs and margins are AI estimates. Shop listings are fictional
          demo data.
        </span>
      </footer>
    </PitchSection>
  );
}

/** The pitch itself, read-only. The owner's page and (Phase 9) the shared page both render it. */
export function PitchDocument(props: PitchDocumentProps) {
  return (
    <article className="flex flex-col gap-14 print:gap-0">
      <Cover {...props} />
      <ProblemAndProduct {...props} />
      <HowItsMade {...props} />
      <UnitEconomics {...props} />
      <IterationStory {...props} />
      <Commercial {...props} />
      <Ask {...props} />
    </article>
  );
}
