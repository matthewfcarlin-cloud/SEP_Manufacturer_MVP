import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GeometryPanel } from "@/components/GeometryPanel";
import { ModelViewer } from "@/components/viewer";
import { formatNumber, formatUsd } from "@/lib/format";
import { getProject } from "@/lib/projectStore";

export async function generateMetadata(props: PageProps<"/project/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const project = await getProject(id);
  return { title: project?.name ?? "Project not found" };
}

function Brief({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export default async function ProjectPage(props: PageProps<"/project/[id]">) {
  const { id } = await props.params;
  const project = await getProject(id);
  if (!project) notFound();

  const created = new Date(project.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted">Project · created {created}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {project.cadFileUrl ? (
          <ModelViewer url={project.cadFileUrl} className="aspect-[4/3] w-full" />
        ) : (
          <div className="grid aspect-[4/3] place-items-center rounded-xl border border-line text-sm text-muted">
            No CAD file uploaded.
          </div>
        )}
        <div className="flex flex-col gap-6">
          {project.geometry && <GeometryPanel geometry={project.geometry} />}
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-4 font-semibold">Brief</h2>
            <dl className="grid grid-cols-2 gap-4">
              <Brief label="Target quantity">{formatNumber(project.targetQuantity, 0)} units</Brief>
              <Brief label="Budget">
                {project.budgetUsd !== undefined ? formatUsd(project.budgetUsd) : "Not set"}
              </Brief>
              <div className="col-span-2">
                <Brief label="Material ideas">
                  {project.materialHints?.length ? project.materialHints.join(", ") : "None given"}
                </Brief>
              </div>
              {project.notes && (
                <div className="col-span-2">
                  <Brief label="Notes">
                    <span className="whitespace-pre-line">{project.notes}</span>
                  </Brief>
                </div>
              )}
            </dl>
          </section>
        </div>
      </div>

      {project.imageUrls.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Photos and sketches</h2>
          <div className="flex flex-wrap gap-3">
            {project.imageUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- served from our own API route
              <img
                key={url}
                src={url}
                alt={`${project.name}, reference photo ${i + 1}`}
                className="h-40 w-40 rounded-lg border border-line object-cover"
              />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-dashed border-line p-6 text-sm text-muted">
        <h2 className="mb-1 font-semibold text-ink">Manufacturing analysis</h2>
        Not built yet. Phase 2 adds manufacturing paths, cost ranges, and design tweaks here.
      </section>
    </div>
  );
}
