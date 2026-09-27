import Link from "next/link";
import { DemoBadge } from "@/components/Badges";
import { DEMO_PROJECTS } from "@/lib/demoProjects";
import { formatUnitCostRange, formatUsd } from "@/lib/format";
import { PROCESS_LABELS } from "@/lib/processes";
import { getProject } from "@/lib/projectStore";
import { etsySale } from "@/lib/sell/fees";
import { getShopById } from "@/lib/shops";
import { STAGES } from "@/lib/studio/stage";
import { keyNumbers } from "@/lib/studio/summary";
import type { Project, Stage } from "@/lib/types";
import { latestVersion } from "@/lib/versions";
import { Reveal } from "./Reveal";

/** The example that has been taken all the way to a listing. */
const EXAMPLE = DEMO_PROJECTS[1];

type Proof = { label: string; value: string; isDemo?: boolean };

const COPY: Record<Stage, { title: string; body: string; path: string }> = {
  idea: { title: "Bring an idea", body: "A CAD file, photos, a sketch, or just a description, plus how many you want and your budget.", path: "" },
  design: { title: "Make it makeable", body: "Real measurements, 2–4 ways to manufacture it, and the design tweaks that cut the cost.", path: "" },
  make: { title: "Get it made", body: "Send a spec sheet to the best-matched shops in one click and compare quotes side by side.", path: "/make" },
  money: { title: "Price it to profit", body: "A retail price from the market, margin at every run size, and when the tooling pays back.", path: "" },
  launch: { title: "Plan the launch", body: "Milestones, dates and budget built from your chosen quote, re-dated when anything changes.", path: "/plan" },
  sell: { title: "Start selling", body: "An Etsy-ready title, description, 13 tags and photos, with fees worked out per sale.", path: "/sell" },
};

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Each stage's real output from the example product, when it exists. */
function proofs(project: Project): Partial<Record<Stage, Proof>> {
  const version = latestVersion(project);
  const { unitCost, retailUsd, margin } = keyNumbers(version);
  const best = version.analysis?.paths[0];
  const chosen = version.outreach?.quotes.find((q) => q.id === version.outreach?.chosenQuoteId);
  const photos = version.imageUrls.length;
  return {
    idea: {
      label: "Started with",
      value: `CAD file${photos ? ` + ${photos} photo${photos === 1 ? "" : "s"}` : ""} · ${version.targetQuantity.toLocaleString("en-US")} units`,
    },
    design: best && unitCost && {
      label: `v${version.number} · ${PROCESS_LABELS[best.process]}`,
      value: `${formatUnitCostRange(unitCost)} per unit, est.`,
    },
    make: chosen && {
      label: `Chosen of ${version.outreach!.quotes.length} quotes`,
      value: `${getShopById(chosen.shopId)?.name ?? "Local shop"} · ${formatUsd(chosen.unitPriceUsd)}/unit`,
      isDemo: true,
    },
    money: retailUsd !== undefined && margin
      ? { label: "Retail · margin, est.", value: `${formatUsd(retailUsd)} · ${Math.round(margin.mid * 100)}%` }
      : undefined,
    launch: version.plan && { label: `${version.plan.milestones.length} milestones`, value: `Launch ${shortDate(version.plan.launchDate)}` },
    sell: version.listing && {
      label: `Etsy · ${version.listing.tags.length} tags`,
      value: `${formatUsd(etsySale(version.listing.priceUsd).afterFeesUsd)} after fees per sale`,
    },
  };
}

/** The six-stage journey, each stage backed by the example product's real output. */
export async function JourneyStages() {
  const project = await getProject(EXAMPLE.id);
  const proof = project ? proofs(project) : {};
  return (
    <section aria-labelledby="journey-heading" className="py-24 sm:py-32">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 sm:px-6">
        <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow text-muted">Six stages · one guided journey</p>
            <h2 id="journey-heading" className="display-type mt-4 text-[clamp(2.6rem,6vw,5.5rem)]">
              Idea to
              <br />
              first sale
            </h2>
          </div>
          <p className="max-w-sm text-muted">
            One studio instead of five tools. Every product moves through the same six stages, and Moko
            always shows the next step.
            {project && <> The numbers below are one real example: {project.name}.</>}
          </p>
        </Reveal>

        <ol className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map(({ key, label }, i) => {
            const copy = COPY[key];
            const p = proof[key];
            const body = (
              <Reveal delay={(i % 3) * 0.06} className="flex h-full flex-col gap-5 p-6 transition-colors group-hover:bg-bg">
                <div className="flex items-start justify-between gap-4">
                  <span className="eyebrow text-accent">{String(i + 1).padStart(2, "0")} · {label}</span>
                  {p?.isDemo && <DemoBadge label="Demo quote" title="Simulated quote from a fictional demo shop" />}
                </div>
                <h3 className="display-type text-3xl">{copy.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{copy.body}</p>
                {p && (
                  <dl className="mt-auto border-t border-line pt-4">
                    <dt className="eyebrow text-[11px] text-muted">{p.label}</dt>
                    <dd className="mt-1 font-mono text-sm tabular-nums">{p.value}</dd>
                  </dl>
                )}
              </Reveal>
            );
            return (
              <li key={key} className="group bg-surface">
                {project ? (
                  <Link href={`/project/${EXAMPLE.id}${copy.path}`} className="block h-full" aria-label={`${label}: ${copy.title}. Open it on ${project.name}`}>
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
