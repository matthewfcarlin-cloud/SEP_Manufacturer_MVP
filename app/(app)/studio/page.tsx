import type { Metadata } from "next";
import { OwnKeyPrompt } from "@/components/studio/OwnKeyPrompt";
import type { ProductSummary } from "@/components/studio/ProductCard";
import { ProductGrid } from "@/components/studio/ProductGrid";
import { stageProgress, STAGES } from "@/lib/studio/stage";
import { statusLine } from "@/lib/studio/statusLine";
import { visibleProducts } from "@/lib/studio/visibleProducts";
import { latestAnalyzedVersion, latestVersion } from "@/lib/versions";

export const metadata: Metadata = { title: "My products" };

/** "My products": every product as a card, with its render, one status line and its progress. */
export default async function StudioPage() {
  const products: ProductSummary[] = (await visibleProducts()).map(({ project, access, updatedAt }) => {
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
      dots: STAGES.map((s) => ({ label: s.label, status: statuses[s.key] })),
      canSharePitch: Boolean(latestAnalyzedVersion(project)),
      updatedAt,
    };
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-3">
        <h1 className="display-type text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.9]">My products</h1>
        <p className="max-w-xl text-muted">Everything you&apos;re making, where each one stands, and what to do next.</p>
      </div>
      <OwnKeyPrompt />
      <ProductGrid products={products} />
    </div>
  );
}
