import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PitchDocument } from "@/components/pitch/PitchDocument";
import { buildIterationStory } from "@/lib/iterationStory";
import { matchVersion } from "@/lib/match";
import { loadSharedPitch } from "@/lib/sharedPitch";
import { getShopById } from "@/lib/shops";

// Shared pitches are for the people the owner sends them to, not search engines.
export async function generateMetadata(props: PageProps<"/p/[token]">): Promise<Metadata> {
  const { token } = await props.params;
  const shared = await loadSharedPitch(token);
  return { title: shared ? `${shared.project.name} · Pitch` : "Pitch not found", robots: { index: false, follow: false } };
}

/** The public, read-only pitch behind a share link. 404 once the owner turns it off or revokes it. */
export default async function SharedPitchPage(props: PageProps<"/p/[token]">) {
  const { token } = await props.params;
  const shared = await loadSharedPitch(token);
  if (!shared) notFound();
  const { project, version } = shared;
  const match = matchVersion(version).find((m) => m.matchedMachine.type === version.analysis.paths[0].process);
  const shop = match ? getShopById(match.shopId) : undefined;

  return (
    <div className="@container mx-auto flex max-w-content flex-col gap-12 page-pad py-8 print:max-w-none print:px-0 print:py-0">
      <PitchDocument
        project={project}
        version={version}
        story={buildIterationStory(project)}
        topMatch={match && shop ? { match, shop } : undefined}
        isOwnerView={false}
      />
    </div>
  );
}
