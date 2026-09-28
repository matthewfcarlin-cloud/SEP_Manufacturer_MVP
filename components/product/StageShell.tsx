import { ArrowRight, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { DemoBadge } from "@/components/Badges";
import { RunAnalysisButton } from "@/components/analysis/RunAnalysisButton";
import { DraftPlanButton } from "@/components/plan/DraftPlanButton";
import { WriteListingButton } from "@/components/sell/WriteListingButton";
import { ButtonLink } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/classes";
import { DetailsAccordion } from "@/components/ui/DetailsAccordion";
import { StatusPill } from "@/components/ui/StatusPill";
import { VerdictCard } from "@/components/ui/VerdictCard";
import type { Access } from "@/lib/ownerKey";
import { stageSummary, type SummaryAction, type SummaryScreen } from "@/lib/studio/stageSummary";
import { statusLine, statusTone } from "@/lib/studio/statusLine";
import type { Project, ProjectVersion } from "@/lib/types";
import { latestAnalyzedVersion, latestVersion } from "@/lib/versions";
import { ModelPanel } from "./ModelPanel";
import { ProductMenu } from "./ProductMenu";

type Props = {
  project: Project;
  version: ProjectVersion;
  access: Exclude<Access, "none">;
  screen: SummaryScreen;
  /** This screen's path, so an action pointing inside it becomes a plain #hash that opens the details. */
  path: string;
  /** Open the details from the start (the pitch document reads like the page itself). */
  isDetailsOpen?: boolean;
  /** Replaces the standard summary card, e.g. Money's verdict that updates as the price slider moves. */
  summary?: ReactNode;
  /** The stage's own visual, shown under the summary and above "See the details" (tweak cards, quote cards, …). */
  highlights?: ReactNode;
  children: ReactNode;
};

function SummaryButton({ action, project, version, path }: { action: SummaryAction; project: Project; version: ProjectVersion; path: string }) {
  switch (action.kind) {
    case "analyze":
      return <RunAnalysisButton projectId={project.id} version={version.number} />;
    case "draftPlan":
      return <DraftPlanButton projectId={project.id} version={version.number} hasPlan={false} />;
    case "writeListing":
      return <WriteListingButton projectId={project.id} version={version.number} hasListing={false} />;
    case "link": {
      if (action.isExternal) {
        return (
          <a href={action.href} target="_blank" rel="noopener noreferrer" className={buttonClasses()}>
            {action.label}
            <ExternalLink aria-hidden size={18} strokeWidth={1.75} />
          </a>
        );
      }
      const [target, hash] = action.href.split("#");
      const isHere = hash !== undefined && (target === "" || target.split("?")[0] === path);
      // Same screen: a real anchor, so the browser fires hashchange and the details open.
      return isHere ? (
        <a href={`#${hash}`} className={buttonClasses()}>
          {action.label}
          <ArrowRight aria-hidden size={18} strokeWidth={1.75} />
        </a>
      ) : (
        <ButtonLink href={action.href} iconRight={ArrowRight}>
          {action.label}
        </ButtonLink>
      );
    }
  }
}

/**
 * One stage of the product studio (design/DESIGN.md §4): the name, status pill
 * and ⋯ menu; the model in a 320px panel; this stage's summary card with one
 * button; then everything else behind "See the details".
 */
export function StageShell({ project, version, access, screen, path, isDetailsOpen = false, summary: summaryOverride, highlights, children }: Props) {
  const summary = stageSummary(project, version, screen);
  const isExample = access === "example";
  const status = statusLine(project);
  return (
    <div className="@container mx-auto flex w-full max-w-content flex-col gap-5 page-pad py-8 md:py-10 print:max-w-none print:p-0">
      <header className="flex items-start justify-between gap-3 print:hidden">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="type-h1 [overflow-wrap:anywhere]">{project.name}</h1>
          <p className="flex flex-wrap items-center gap-1.5">
            <StatusPill tone={statusTone(status)}>{status}</StatusPill>
            {isExample && <DemoBadge label="Example" title="A shared demo product anyone can open" />}
            {project.versions.length > 1 && <span className="type-small text-muted">Showing version {version.number}</span>}
          </p>
        </div>
        <ProductMenu
          projectId={project.id}
          productName={project.name}
          isExample={isExample}
          versionCount={project.versions.length}
          latestVersion={latestVersion(project).number}
          canSharePitch={Boolean(latestAnalyzedVersion(project))}
        />
      </header>

      <ModelPanel projectId={project.id} version={version} name={project.name} />

      <div className="print:hidden">
        {summaryOverride ?? (
          <VerdictCard
            aria-label="Summary"
            tone={summary.tone}
            title={summary.title}
            explanation={summary.explanation}
            action={<SummaryButton action={summary.action} project={project} version={version} path={path} />}
          />
        )}
      </div>

      {highlights && <div className="flex flex-col gap-5 print:hidden">{highlights}</div>}

      <DetailsAccordion id="stage-details" defaultOpen={isDetailsOpen} className="[&>button]:print:hidden">
        <div className="flex flex-col gap-8">{children}</div>
      </DetailsAccordion>
    </div>
  );
}
