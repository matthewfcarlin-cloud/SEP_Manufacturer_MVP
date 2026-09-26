import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ModelViewer } from "@/components/viewer";
import { compareVersions, summarizeVersion, type DeltaRow, type Direction } from "@/lib/compare";
import { matchVersion } from "@/lib/match";
import { getProject } from "@/lib/projectStore";
import { getShopById } from "@/lib/shops";
import type { Project, ProjectVersion } from "@/lib/types";
import { getVersion, parseVersionParam } from "@/lib/versions";

export async function generateMetadata(props: PageProps<"/project/[id]/compare">): Promise<Metadata> {
  const { id } = await props.params;
  const project = await getProject(id);
  return { title: project ? `Compare versions · ${project.name}` : "Project not found" };
}

const DIRECTION_STYLE: Record<Direction, string> = {
  better: "text-idle",
  worse: "text-accent",
  changed: "text-ink",
  same: "text-muted",
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
    <select name={name} defaultValue={value} aria-label={name === "a" ? "Before" : "After"} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
      {project.versions.map((v) => (
        <option key={v.number} value={v.number}>
          v{v.number}
        </option>
      ))}
    </select>
  );
}

function DeltaTable({ rows, a, b }: { rows: DeltaRow[]; a: number; b: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="eyebrow p-4 font-normal text-muted">Measure</th>
            <th scope="col" className="eyebrow p-4 font-normal text-muted">v{a}</th>
            <th scope="col" className="eyebrow p-4 font-normal text-muted">v{b}</th>
            <th scope="col" className="eyebrow p-4 text-right font-normal text-muted">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-line last:border-0">
              <th scope="row" className="p-4 text-left font-medium">{row.label}</th>
              <td className="p-4 font-mono">{row.a}</td>
              <td className="p-4 font-mono">{row.b}</td>
              <td className={`p-4 text-right font-mono font-semibold ${DIRECTION_STYLE[row.direction]}`}>{row.change ?? "—"}</td>
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
        <div className="grid aspect-[4/3] place-items-center rounded-xl border border-line text-sm text-muted">No CAD file</div>
      )}
      <figcaption className="flex items-baseline justify-between gap-2 text-sm">
        <Link href={`/project/${projectId}?v=${version.number}`} className="display-type text-2xl hover:text-accent">
          v{version.number}
        </Link>
        <span className="line-clamp-1 text-muted">
          {version.appliedTweak ? `Tweak: ${version.appliedTweak.change}` : version.changeNote ?? "Original upload"}
        </span>
      </figcaption>
    </figure>
  );
}

export default async function ComparePage(props: PageProps<"/project/[id]/compare">) {
  const { id } = await props.params;
  const project = await getProject(id);
  if (!project) notFound();

  const header = (
    <PageHeader
      eyebrow={
        <>
          <Link href={`/project/${project.id}`} className="hover:text-ink">{project.name}</Link>
          <span aria-hidden>/</span>
          <span>Compare</span>
        </>
      }
      title="Compare versions"
    />
  );

  if (project.versions.length < 2) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
        {header}
        <p className="rounded-xl border border-dashed border-line p-6 text-muted">
          There&apos;s only one version so far.{" "}
          <Link href={`/project/${project.id}/versions/new`} className="font-medium text-ink underline">Upload a revised part</Link> to compare it.
        </p>
      </div>
    );
  }

  const { a, b } = await props.searchParams;
  const [va, vb] = pickVersions(project, parseVersionParam(a), parseVersionParam(b));
  const comparison = compareVersions(summarizeVersion(va, topShopName(va)), summarizeVersion(vb, topShopName(vb)));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      {header}

      <form className="flex flex-wrap items-center gap-3 text-sm">
        <VersionSelect name="a" value={va.number} project={project} />
        <span aria-hidden className="text-muted">→</span>
        <VersionSelect name="b" value={vb.number} project={project} />
        <button type="submit" className="rounded-lg border border-line px-3 py-2 font-medium hover:border-ink">Compare</button>
      </form>

      <section aria-labelledby="compare-summary" className="flex flex-col gap-3">
        <p className="eyebrow text-muted">v{va.number} → v{vb.number}</p>
        <h2 id="compare-summary" className="display-type text-[clamp(1.8rem,4vw,3rem)]">{comparison.summary}</h2>
        {comparison.quantitiesDiffer && (
          <p className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
            These versions target different quantities ({va.targetQuantity.toLocaleString("en-US")} vs{" "}
            {vb.targetQuantity.toLocaleString("en-US")} units), so the unit costs aren&apos;t like-for-like.
          </p>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <VersionPane projectId={project.id} version={va} />
        <VersionPane projectId={project.id} version={vb} />
      </div>

      <DeltaTable rows={comparison.rows} a={va.number} b={vb.number} />
      <p className="text-xs text-muted">
        Costs are AI estimates for each version&apos;s best path at its target quantity; changes compare the middle of each range. Shops are fictional demo data.
      </p>
    </div>
  );
}
