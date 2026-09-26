import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { DEMO_PROJECTS } from "@/lib/demoProjects";
import { formatUnitCostRange } from "@/lib/format";
import { PROCESS_LABELS } from "@/lib/processes";
import { listProjects } from "@/lib/projectStore";

export const metadata: Metadata = { title: "Projects" };

const EXAMPLE_IDS = new Set<string>(DEMO_PROJECTS.map((d) => d.id));

export default async function ProjectsPage() {
  // Read the project folder per request, so new uploads show up at once.
  await connection();
  const projects = await listProjects();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-muted">Every part you&apos;ve uploaded, newest first.</p>
        </div>
        <Link href="/new" className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink hover:opacity-90">
          Start a project
        </Link>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center text-muted">
          No projects yet. <Link href="/new" className="underline">Upload your first part</Link>.
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const best = p.analysis?.paths[0];
            const g = p.geometry;
            return (
              <li key={p.id}>
                <Link href={`/project/${p.id}`} className="flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-ink">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold">{p.name}</h2>
                    {EXAMPLE_IDS.has(p.id) && (
                      <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-muted">Example</span>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ·{" "}
                    {p.targetQuantity.toLocaleString("en-US")} units
                    {g && ` · ${Math.round(g.boundingBoxMm.x)} × ${Math.round(g.boundingBoxMm.y)} × ${Math.round(g.boundingBoxMm.z)} mm`}
                  </p>
                  {best ? (
                    <p className="text-sm">
                      <span className="font-medium">{PROCESS_LABELS[best.process]}</span>{" "}
                      <span className="text-muted">·</span> <span className="font-mono">{formatUnitCostRange(best.unitCostUsd)}</span>
                      <span className="text-muted">/part est.</span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted">Not analyzed yet</p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
