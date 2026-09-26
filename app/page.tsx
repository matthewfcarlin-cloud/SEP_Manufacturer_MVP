import Link from "next/link";
import { connection } from "next/server";
import { DemoBadge, IdleBadge } from "@/components/Badges";
import { ExampleProjects } from "@/components/home/ExampleProjects";
import sampleProject from "@/demo/sample-project.json";
import { formatDimensions, formatUnitCostRange } from "@/lib/format";
import { matchProject } from "@/lib/match";
import { PROCESS_LABELS } from "@/lib/processes";
import { getProject } from "@/lib/projectStore";
import { projectSchema } from "@/lib/schemas";
import { getShopById, getShops, summarizeShops } from "@/lib/shops";

const STEPS = [
  {
    title: "Upload",
    body: "Drop in an STL, a few photos or sketches, and what you know: quantity, budget, materials.",
  },
  {
    title: "Understand",
    body: "See your part in 3D with real dimensions, volume, and wall-thickness warnings.",
  },
  {
    title: "Choose a path",
    body: "Compare 2–4 ways to make it, with cost ranges, lead times, and the design tweaks that make each one cheaper.",
  },
  {
    title: "Match and pitch",
    body: "Find local shops with idle machines that fit, then share a pitch kit with renders, a cost card, and a storyboard.",
  },
];

export default async function Home() {
  // Per request: whether the example is installed can change after the build.
  await connection();
  const stats = summarizeShops(getShops());
  const demoProject = projectSchema.parse(sampleProject);
  const isExampleInstalled = (await getProject(demoProject.id)) !== null;
  const featuredPath = demoProject.analysis?.paths[0];
  const featuredMatch = matchProject(demoProject).find(
    (match) => match.matchedMachine.type === featuredPath?.process,
  );
  const featuredShop = featuredMatch ? getShopById(featuredMatch.shopId) : undefined;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-16 sm:px-6 sm:py-24">
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="flex flex-col items-start gap-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent sm:text-sm">
            For independent inventors and small hardware teams
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl xl:text-6xl">
            Design around the machines that are already sitting idle.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted">
            A good design doesn&apos;t close the deal on its own. Whether it can be made cheaply does.
            Idlefit shows you how your product could be made, which nearby shops have open capacity
            for it, and what small changes bring the cost down.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/new"
              className="rounded-lg bg-accent px-5 py-3 text-center font-medium text-accent-ink hover:opacity-90"
            >
              Start a project
            </Link>
            <Link
              href="/shops"
              className="rounded-lg border border-line bg-surface px-5 py-3 text-center font-medium hover:border-ink"
            >
              Browse {stats.shops} shops · {stats.idleMachines} idle machines
            </Link>
          </div>
        </div>

        {featuredPath && featuredMatch && featuredShop && (
          <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Example match</p>
                <h2 className="mt-1 font-semibold">
                  {isExampleInstalled ? (
                    <Link href={`/project/${demoProject.id}`} className="hover:underline">
                      {demoProject.name}
                    </Link>
                  ) : (
                    demoProject.name
                  )}
                </h2>
              </div>
              <DemoBadge />
            </div>
            <div className="bg-bg px-5 py-3">
              <svg viewBox="0 0 480 250" role="img" aria-labelledby="part-sketch-title" className="h-auto w-full">
                <title id="part-sketch-title">Illustration of a compact guitar pedal enclosure</title>
                <defs>
                  <linearGradient id="pedal-fill" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="var(--surface)" />
                    <stop offset="1" stopColor="var(--line)" />
                  </linearGradient>
                </defs>
                <path d="M82 68 312 43l87 40-229 30z" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
                <path d="m170 113 229-30v107l-229 31z" fill="var(--line)" stroke="var(--muted)" strokeWidth="2" />
                <path d="m82 68 88 45v108l-88-46z" fill="url(#pedal-fill)" stroke="var(--muted)" strokeWidth="2" />
                <circle cx="205" cy="88" r="14" fill="var(--bg)" stroke="var(--accent)" strokeWidth="3" />
                <circle cx="264" cy="82" r="10" fill="var(--bg)" stroke="var(--muted)" strokeWidth="2" />
                <circle cx="306" cy="77" r="10" fill="var(--bg)" stroke="var(--muted)" strokeWidth="2" />
                <path d="m181 181 59-8m23-4 68-9" stroke="var(--muted)" strokeDasharray="4 5" strokeWidth="2" />
                <text x="72" y="232" fill="var(--muted)" fontSize="13">122 × 66 × 39.5 mm · concept illustration</text>
              </svg>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted">Best-fit process</p>
                  <p className="font-semibold">{PROCESS_LABELS[featuredPath.process]} <span className="font-normal text-muted">· {featuredPath.fitScore}/100</span></p>
                </div>
                <p className="font-mono text-sm font-semibold">{formatUnitCostRange(featuredPath.unitCostUsd)}<span className="font-sans font-normal text-muted"> / part est.</span></p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-idle/30 bg-idle-soft/50 p-3">
                <div>
                  <p className="text-xs text-muted">A machine that fits</p>
                  <p className="font-medium">{featuredShop.name} <span className="font-normal text-muted">· {featuredShop.neighborhood}</span></p>
                  <p className="text-xs text-muted">{featuredMatch.matchedMachine.model} · {formatDimensions(demoProject.geometry!.boundingBoxMm)}</p>
                </div>
                {featuredMatch.idleBoost && <IdleBadge hoursPerWeek={featuredMatch.matchedMachine.idleHoursPerWeek} />}
              </div>
              <p className="text-xs text-muted">Illustrative demo data. Cost ranges are estimates, not a shop quote.</p>
            </div>
          </article>
        )}
      </section>

      <ExampleProjects />

      <section aria-labelledby="how-it-works" className="flex flex-col gap-6">
        <h2 id="how-it-works" className="text-sm font-medium uppercase tracking-widest text-muted">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5">
              <span className="font-mono text-sm text-accent">0{i + 1}</span>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
