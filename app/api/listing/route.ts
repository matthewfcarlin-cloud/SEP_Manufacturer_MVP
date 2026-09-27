import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { isAiConfigured, textCaller } from "@/lib/analysis/callers";
import { aiFailure } from "@/lib/analysis/errors";
import { buildListingBrief, runListingDraft } from "@/lib/analysis/listing";
import { updateVersion } from "@/lib/projectStore";
import type { EtsyListing } from "@/lib/types";
import { aiBudgetGate } from "@/lib/usage/gate";
import { latestAnalyzedVersion } from "@/lib/versions";
import { recordEvent } from "@/lib/learning/record";
import { findVersion } from "@/lib/versionLookup";

export const maxDuration = 60;

const bodySchema = z.object({ projectId: z.string(), version: z.number().int().positive().optional() });

/** Writes the Etsy listing. The price comes from the business case and the photos from the studio renders. */
export async function POST(request: Request): Promise<Response> {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "projectId": "...", "version": 1 }.', 400);
  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;
  const { project, version, access } = found;
  if (!version.analysis) return fail("Analyze this version before writing its listing.", 422);
  if (!version.businessCase) return fail("Set a retail price in the business case first: the listing uses it.", 422);
  const ownerHash = await aiBudgetGate("listing");
  if (ownerHash instanceof Response) return ownerHash;
  if (!(await isAiConfigured(ownerHash))) return fail("AI writing isn't set up yet: add ANTHROPIC_API_KEY to .env.local, or your own key in Settings.", 503);

  try {
    const draft = await runListingDraft(textCaller("listing", ownerHash), buildListingBrief(project, version));
    const listing: EtsyListing = {
      ...draft,
      priceUsd: version.businessCase.retailPriceUsd,
      photos: version.renders ?? latestAnalyzedVersion(project)?.renders ?? [],
      generatedAt: new Date().toISOString(),
    };
    const saved = await updateVersion(project.id, version.number, (v) => ({ ...v, listing }));
    if (!saved) return fail("This version was removed while its listing was written.", 404);
    await recordEvent({ workspaceId: ownerHash, projectId: project.id, version: version.number, access, type: "listing_generated", payload: {} });
    return ok(listing, 201);
  } catch (err) {
    return aiFailure(err, "api/listing");
  }
}
