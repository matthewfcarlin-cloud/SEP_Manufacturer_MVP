import { editedAgo } from "@/lib/studio/home";
import { stageProgress, STAGES } from "@/lib/studio/stage";
import { statusLine } from "@/lib/studio/statusLine";
import type { VisibleProduct } from "@/lib/studio/visibleProducts";
import { latestAnalyzedVersion, latestVersion } from "@/lib/versions";
import type { ProductSummary } from "./ProductCard";

/** What a product card needs, built on the server from a visible product. */
export function toSummary({ project, access, updatedAt }: VisibleProduct, nowMs: number): ProductSummary {
  const version = latestVersion(project);
  const { current, statuses } = stageProgress(project);
  const stageIndex = STAGES.findIndex((s) => s.key === current);
  return {
    id: project.id,
    name: project.name,
    isExample: access === "example",
    cadUrl: version.cadFileUrl,
    still: (latestAnalyzedVersion(project) ?? version).renders?.[0],
    status: statusLine(project),
    stageLabel: STAGES[stageIndex].label,
    stageIndex,
    statuses,
    canSharePitch: Boolean(latestAnalyzedVersion(project)),
    updatedAt,
    edited: editedAgo(updatedAt, nowMs),
  };
}

/** Cards for a list of products, all "Edited …" labels relative to the same moment (this request). */
export function summariesOf(products: readonly VisibleProduct[]): ProductSummary[] {
  const now = Date.now();
  return products.map((p) => toSummary(p, now));
}
