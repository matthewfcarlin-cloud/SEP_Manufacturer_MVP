import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { connection } from "next/server";
import { DEMO_PROJECTS } from "@/lib/demoProjects";
import { formatUnitCostRange } from "@/lib/format";
import { PROCESS_LABELS } from "@/lib/processes";
import { listProjects } from "@/lib/projectStore";
import { latestVersion } from "@/lib/versions";

export const metadata: Metadata = { title: "Projects" };

const EXAMPLE_IDS = new Set<string>(DEMO_PROJECTS.map((d) => d.id));

export default async function ProjectsPage() {
  // Read the project folder per request, so new uploads show up at once.
  await connection();
  const projects = await listProjects();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader
        eyebrow={<span>{projects.length} {projects.length === 1 ? "project" : "projects"} · newest first</span>}
        title="Projects"
        description="Every part you've uploaded. Open one to see its analysis, shop matches, and pitch kit."
        actions={
          <Link href="/new" className="eyebrow rounded-md bg-ink px-4 py-3 text-bg hover:opacity-90">
            Start a project →
          </Link>
        }
      />

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center text-muted">
          No projects yet. <Link href="/new" className="underline">Upload your first part</Link>.
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const version = latestVersion(p);
            const best = version.analysis?.paths[0];
            const g = version.geometry;
            return (
              <li key={p.id}>
                <Link href={`/project/${p.id}`} className="flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-ink">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="display-type text-2xl">{p.name}</h2>
                    {p.versions.length > 1 && (
                      <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-xs text-bg">v{version.number}</span>
                    )}
                    {EXAMPLE_IDS.has(p.id) && (
                      <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-muted">Example</span>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ·{" "}
                    {version.targetQuantity.toLocaleString("en-US")} units
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
