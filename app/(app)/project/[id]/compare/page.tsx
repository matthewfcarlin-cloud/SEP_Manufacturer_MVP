import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ModelViewer } from "@/components/viewer";
import { compareVersions, summarizeVersion, type DeltaRow, type Direction } from "@/lib/compare";
import { matchVersion } from "@/lib/match";
import { getAccessibleProject } from "@/lib/access";
import { getShopById } from "@/lib/shops";
import type { Project, ProjectVersion } from "@/lib/types";
import { getVersion, parseVersionParam } from "@/lib/versions";
import { buttonClasses } from "@/components/ui/classes";
import { controlClasses } from "@/components/ui/Field";

const WORD_ROWS: ReadonlySet<string> = new Set(["process", "topShop"]);

export async function generateMetadata(props: PageProps<"/project/[id]/compare">): Promise<Metadata> {
  const { id } = await props.params;
  const project = (await getAccessibleProject(id))?.project;
  return { title: project ? `Compare versions · ${project.name}` : "Project not found" };
}

const DIRECTION_STYLE: Record<Direction, string> = {
  better: "text-green-ink",
  worse: "text-accent-ink",
  changed: "text-ink",
  same: "text-ink-2",
};

function topShopName(version: ProjectVersion): string | undefined {
  const top = matchVersion(version)[0];
  return top ? getShopById(top.shopId)?.name : undefined;
}

/** Defaults to the two newest versions when the query doesn't name valid ones. */
function pickVersions(project: Project, a: number | null, b: number | null): [ProjectVersion, ProjectVersion] {
  const [second, latest] = project.versions.slice(-2);
  const va = (a !== null && getVersion(project, a)) || second;
  const vb = (b !== null && getVersion(project, b)) || latest;
  return [va, vb];
}

function VersionSelect({ name, value, project }: { name: "a" | "b"; value: number; project: Project }) {
  return (
    <select name={name} defaultValue={value} aria-label={name === "a" ? "Before" : "After"} className={controlClasses("w-auto")}>
      {project.versions.map((v) => (
        <option key={v.number} value={v.number}>
          Version {v.number}
        </option>
      ))}
    </select>
  );
}

function DeltaTable({ rows, a, b }: { rows: DeltaRow[]; a: number; b: number }) {
  return (
    <div className="overflow-x-auto card">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th scope="col" className="text-[13px] font-medium p-4 text-ink-2">Measure</th>
            <th scope="col" className="text-[13px] font-medium p-4 text-ink-2">Version {a}</th>
            <th scope="col" className="text-[13px] font-medium p-4 text-ink-2">Version {b}</th>
            <th scope="col" className="text-[13px] font-medium p-4 text-right text-ink-2">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border last:border-0">
              <th scope="row" className="p-4 text-left font-medium">{row.label}</th>
              {/* Mono is for numbers only; the process and shop rows are words. */}
              <td className={`p-4 ${WORD_ROWS.has(row.key) ? "" : "font-mono"}`}>{row.a}</td>
              <td className={`p-4 ${WORD_ROWS.has(row.key) ? "" : "font-mono"}`}>{row.b}</td>
              <td className={`p-4 text-right font-semibold ${WORD_ROWS.has(row.key) ? "" : "font-mono"} ${DIRECTION_STYLE[row.direction]}`}>{row.change ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VersionPane({ projectId, version }: { projectId: string; version: ProjectVersion }) {
  return (
    <figure className="flex flex-col gap-2">
      {version.cadFileUrl ? (
        <ModelViewer key={version.cadFileUrl} url={version.cadFileUrl} className="aspect-[4/3] w-full" />
      ) : (
        <div className="grid aspect-[4/3] place-items-center rounded-card bg-sidebar text-[14px] text-ink-2">No CAD file</div>
      )}
      <figcaption className="flex items-baseline justify-between gap-2 text-sm">
        <Link href={`/project/${projectId}?v=${version.number}`} className="type-h3 hover:text-accent-ink">
          Version {version.number}
        </Link>
        <span className="line-clamp-1 text-ink-2">
          {version.appliedTweak ? `Tweak: ${version.appliedTweak.change}` : version.changeNote ?? "Original upload"}
        </span>
      </figcaption>
    </figure>
  );
}

export default async function ComparePage(props: PageProps<"/project/[id]/compare">) {
  const { id } = await props.params;
  const project = (await getAccessibleProject(id))?.project;
  if (!project) notFound();

  const header = (
    <PageHeader title="Compare versions" />
  );

  if (project.versions.length < 2) {
    return (
      <div className="mx-auto flex max-w-content flex-col gap-12 page-pad py-8">
        {header}
        <p className="rounded-card bg-sidebar p-5 text-ink-2">
          There&apos;s only one version so far.{" "}
          <Link href={`/project/${project.id}/versions/new`} className="font-medium text-blue-ink hover:underline">Upload a revised part</Link> to compare it.
        </p>
      </div>
    );
  }

  const { a, b } = await props.searchParams;
  const [va, vb] = pickVersions(project, parseVersionParam(a), parseVersionParam(b));
  const comparison = compareVersions(summarizeVersion(va, topShopName(va)), summarizeVersion(vb, topShopName(vb)));

  return (
    <div className="mx-auto flex max-w-content flex-col gap-12 page-pad py-8">
      {header}

      <form className="flex flex-wrap items-center gap-3 text-sm">
        <VersionSelect name="a" value={va.number} project={project} />
        <span aria-hidden className="text-ink-2">→</span>
        <VersionSelect name="b" value={vb.number} project={project} />
        <button type="submit" className={buttonClasses({ variant: "secondary", size: "sm" })}>Compare</button>
      </form>

      <section aria-labelledby="compare-summary" className="flex flex-col gap-3">
        <p className="text-[13px] font-medium text-ink-2">Version {va.number} → version {vb.number}</p>
        <h2 id="compare-summary" className="type-h2">{comparison.summary}</h2>
        {comparison.quantitiesDiffer && (
          <p className="rounded-control bg-amber-soft px-3 py-2 text-sm">
            These versions target different quantities ({va.targetQuantity.toLocaleString("en-US")} vs{" "}
            {vb.targetQuantity.toLocaleString("en-US")} units), so the cost of each isn&apos;t like-for-like.
          </p>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <VersionPane projectId={project.id} version={va} />
        <VersionPane projectId={project.id} version={vb} />
      </div>

      <DeltaTable rows={comparison.rows} a={va.number} b={vb.number} />
      <p className="text-[13px] text-ink-2">
        Costs are AI estimates for each version&apos;s best path at its target quantity; changes compare the middle of each range. Shops are fictional demo data.
      </p>
    </div>
  );
}
