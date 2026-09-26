import Link from "next/link";
import { connection } from "next/server";
import { DEMO_PROJECTS } from "@/lib/demoProjects";
import { formatUnitCostRange } from "@/lib/format";
import { PROCESS_LABELS } from "@/lib/processes";
import { getProject } from "@/lib/projectStore";

/** Links to the pre-analyzed demo projects that are installed (npm run demo:seed). */
export async function ExampleProjects() {
  // Per request: which examples are installed can change after the build.
  await connection();
  const loaded = await Promise.all(
    DEMO_PROJECTS.map(async (demo) => ({ demo, project: await getProject(demo.id) })),
  );
  const examples = loaded.filter((e) => e.project?.analysis);
  if (examples.length === 0) return null;

  return (
    <section aria-labelledby="examples-heading" className="flex flex-col gap-6">
      <h2 id="examples-heading" className="text-sm font-medium uppercase tracking-widest text-muted">
        See an example
      </h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {examples.map(({ demo, project }) => {
          const top = project!.analysis!.paths[0];
          return (
            <li key={demo.id}>
              <Link
                href={`/project/${demo.id}`}
                className="flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-ink"
              >
                <p className="text-sm text-muted">{demo.tagline}</p>
                <h3 className="text-lg font-semibold">{project!.name}</h3>
                <p className="text-sm">
                  Best fit: <span className="font-medium">{PROCESS_LABELS[top.process]}</span> at{" "}
                  <span className="font-mono">{formatUnitCostRange(top.unitCostUsd)}</span>/unit (est.) for{" "}
                  {project!.targetQuantity.toLocaleString("en-US")} units
                </p>
                <span className="mt-auto text-sm font-medium text-accent">Open analysis →</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
