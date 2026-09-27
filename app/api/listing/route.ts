import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { aiFailure } from "@/lib/analysis/errors";
import { isClaudeConfigured } from "@/lib/analysis/claude";
import { generateListing } from "@/lib/listing";
import { updateVersion } from "@/lib/projectStore";
import { aiBudgetGate } from "@/lib/usage/gate";
import { findVersion } from "@/lib/versionLookup";

export const maxDuration = 60;
const requestSchema = z.object({ projectId: z.string(), version: z.number().int().positive() });

/** Generates and saves the Etsy listing on this version. No CAD or renders go to the model. */
export async function POST(request: Request): Promise<Response> {
  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "projectId": "...", "version": 1 }.', 400);
  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;
  const { project, version } = found;
  if (!version.analysis || !version.businessCase) return fail("Analyze this version and set its business case before writing a listing.", 422);
  if (!isClaudeConfigured()) return fail("AI writing isn't set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server.", 503);
  const ownerHash = await aiBudgetGate("listing");
  if (ownerHash instanceof Response) return ownerHash;

  try {
    const copy = await generateListing(project, version, ownerHash);
    const listing = {
      ...copy,
      priceUsd: version.businessCase.retailPriceUsd,
      // Existing listing routes display saved renders locally; they are never sent in this AI request.
      photos: version.renders ?? [],
      generatedAt: new Date().toISOString(),
    };
    const saved = await updateVersion(project.id, version.number, (current) => ({ ...current, listing }));
    if (!saved) return fail("This version was removed while writing the listing.", 404);
    return ok(listing);
  } catch (err) {
    return aiFailure(err, "api/listing");
  }
}
