import Link from "next/link";
import { connection } from "next/server";
import { ExampleProjects } from "@/components/home/ExampleProjects";
import { Hero } from "@/components/home/Hero";
import { IdleTicker } from "@/components/home/IdleTicker";
import { ProcessStory, type StoryData } from "@/components/home/ProcessStory";
import { ProcessTiles } from "@/components/home/ProcessTiles";
import { ScrollStatement } from "@/components/home/ScrollStatement";
import { Showcase } from "@/components/home/Showcase";
import sampleProject from "@/demo/sample-project.json";
import { formatDimensions, formatUnitCostRange } from "@/lib/format";
import { matchProject } from "@/lib/match";
import { PROCESS_LABELS } from "@/lib/processes";
import { getProject } from "@/lib/projectStore";
import { projectSchema } from "@/lib/schemas";
import { getShopById, getShops, summarizeShops } from "@/lib/shops";
import type { Project } from "@/lib/types";

const DEMO_STL_KB = 174;

/** Real numbers from the saved demo analysis, for the pinned process story. */
function storyData(project: Project): StoryData {
  const g = project.geometry;
  const paths = project.analysis?.paths ?? [];
  const matches = matchProject(project).slice(0, 3);
  return {
    fileName: "pedal-enclosure.stl",
    fileKb: DEMO_STL_KB,
    dims: g ? formatDimensions(g.boundingBoxMm) : "n/a",
    wallMm: g?.typicalWallMm,
    volumeCm3: g?.volumeCm3 ?? 0,
    watertight: g?.isWatertight ?? false,
    paths: paths.map((p) => ({ label: PROCESS_LABELS[p.process], fit: p.fitScore, cost: formatUnitCostRange(p.unitCostUsd) })),
    shops: matches.map((m) => {
      const shop = getShopById(m.shopId);
      return { name: shop?.name ?? m.shopId, neighborhood: shop?.neighborhood ?? "", machine: m.matchedMachine.model, idle: m.idleBoost };
    }),
    frames: (project.analysis?.storyboard ?? []).map((f) => ({ seconds: f.seconds, voiceover: f.voiceover })),
  };
}

export default async function Home() {
  // Per request: whether the example is installed can change after the build.
  await connection();
  const shops = getShops();
  const stats = summarizeShops(shops);
  const demo = projectSchema.parse(sampleProject);
  const exampleHref = (await getProject(demo.id)) ? `/project/${demo.id}` : null;

  return (
    <>
      <Hero shops={stats.shops} machines={stats.machines} idle={stats.idleMachines} exampleHref={exampleHref} />
      <IdleTicker shops={shops} />
      <ProcessStory data={storyData(demo)} />
      <ProcessTiles shops={shops} />
      <Showcase project={demo} href={exampleHref} />
      <ScrollStatement
        text="Good design doesn't close the deal. Manufacturability does."
        accentWords={["Manufacturability", "does."]}
      />
      <ExampleProjects />

      <section className="border-t border-line py-24 sm:py-32">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-10 px-4 sm:px-6">
          <h2 className="display-type text-[clamp(3rem,9vw,8rem)]">
            Got a part?
            <br />
            <span className="text-accent">Let&apos;s make it.</span>
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/new"
              className="group inline-flex items-center justify-between gap-8 rounded-md bg-ink px-6 py-4 font-medium text-bg transition-opacity hover:opacity-90"
            >
              Start a project
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link href="/shops" className="inline-flex items-center justify-center rounded-md border border-line px-6 py-4 font-medium hover:border-ink">
              Browse {stats.shops} shops
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
