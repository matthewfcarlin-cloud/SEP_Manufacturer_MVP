import Link from "next/link";
import { formatUnitCostRange } from "@/lib/format";
import { PROCESS_LABELS } from "@/lib/processes";
import type { Project, ProjectVersion } from "@/lib/types";

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

type ChipProps = { projectId: string; version: ProjectVersion; isSelected: boolean; isFirst: boolean };

function VersionChip({ projectId, version, isSelected, isFirst }: ChipProps) {
  const best = version.analysis?.paths[0];
  const reason = version.appliedTweak ? `Tweak: ${version.appliedTweak.change}` : version.changeNote;
  return (
    <li className="flex shrink-0 items-stretch gap-3">
      {!isFirst && (
        <span aria-hidden className="self-center text-muted">
          →
        </span>
      )}
      <Link
        href={`/project/${projectId}?v=${version.number}`}
        aria-current={isSelected ? "page" : undefined}
        className={`flex w-64 flex-col gap-2 rounded-lg border p-4 transition-colors ${
          isSelected ? "border-accent bg-surface" : "border-line hover:border-ink"
        }`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="display-type text-2xl">v{version.number}</span>
          <span className="eyebrow text-muted">{shortDate(version.createdAt)}</span>
        </div>
        {best ? (
          <p className="text-sm">
            <span className="font-medium">{PROCESS_LABELS[best.process]}</span>
            <span className="text-muted"> · </span>
            <span className="font-mono">{formatUnitCostRange(best.unitCostUsd)}</span>
            <span className="text-muted">/part est.</span>
          </p>
        ) : (
          <p className="text-sm text-muted">Not analyzed yet</p>
        )}
        <p className="line-clamp-2 text-xs text-muted">{reason ?? (version.number === 1 ? "Original upload" : "No change note")}</p>
      </Link>
    </li>
  );
}

/** Every version of the product idea, oldest first, with the selected one highlighted. */
export function VersionTimeline({ project, selected }: { project: Project; selected: number }) {
  const hasMany = project.versions.length > 1;
  const previous = project.versions.filter((v) => v.number < selected).at(-1) ?? project.versions.find((v) => v.number !== selected);

  return (
    <section aria-labelledby="versions-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="versions-heading" className="eyebrow text-muted">
          Versions · {project.versions.length}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {hasMany && previous && (
            <Link
              href={`/project/${project.id}/compare?a=${Math.min(previous.number, selected)}&b=${Math.max(previous.number, selected)}`}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-ink"
            >
              Compare versions
            </Link>
          )}
          <Link
            href={`/project/${project.id}/versions/new?from=${selected}`}
            className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90"
          >
            New version
          </Link>
        </div>
      </div>
      <ol className="flex gap-3 overflow-x-auto pb-1">
        {project.versions.map((v, i) => (
          <VersionChip key={v.number} projectId={project.id} version={v} isSelected={v.number === selected} isFirst={i === 0} />
        ))}
      </ol>
    </section>
  );
}
