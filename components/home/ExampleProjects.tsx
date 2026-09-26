import Link from "next/link";
import { connection } from "next/server";
import { DEMO_PROJECTS } from "@/lib/demoProjects";
import { formatUnitCostRange } from "@/lib/format";
import { PROCESS_LABELS } from "@/lib/processes";
import { getProject } from "@/lib/projectStore";
import { Reveal } from "./Reveal";

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
    <section aria-labelledby="examples-heading" className="py-24 sm:py-32">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 sm:px-6">
        <Reveal>
          <p className="eyebrow text-muted">Real Claude analyses · open them</p>
          <h2 id="examples-heading" className="display-type mt-4 text-[clamp(2.6rem,6vw,5.5rem)]">
            See an example
          </h2>
        </Reveal>
        <ul className="grid gap-4 md:grid-cols-2">
          {examples.map(({ demo, project }, i) => {
            const p = project!;
            const top = p.analysis!.paths[0];
            return (
              <li key={demo.id}>
                <Reveal delay={i * 0.08} className="h-full">
                  <Link
                    href={`/project/${demo.id}`}
                    className="group flex h-full flex-col gap-8 rounded-lg border border-line bg-surface p-6 transition-colors hover:border-ink sm:p-8"
                  >
                    <p className="eyebrow text-muted">{demo.tagline}</p>
                    <h3 className="display-type text-4xl sm:text-5xl">{p.name}</h3>
                    <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line">
                      {[
                        ["Best fit", PROCESS_LABELS[top.process]],
                        ["Per part, est.", formatUnitCostRange(top.unitCostUsd)],
                        ["Quantity", p.targetQuantity.toLocaleString("en-US")],
                      ].map(([k, v]) => (
                        <div key={k} className="bg-surface p-3">
                          <dt className="eyebrow text-muted">{k}</dt>
                          <dd className="mt-1 font-mono text-sm">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <span className="eyebrow mt-auto flex items-center gap-2 text-accent">
                      Open analysis <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                    </span>
                  </Link>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
