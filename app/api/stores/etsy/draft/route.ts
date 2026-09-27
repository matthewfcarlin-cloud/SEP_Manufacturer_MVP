import { z } from "zod";
import { fail, isJsonRequest, ok } from "@/lib/api";
import { readProjectFile, updateVersion } from "@/lib/projectStore";
import { etsyConfig, etsyDraftForm, etsyEditorUrl, ETSY_MAX_PHOTOS, ETSY_MAX_QUANTITY, WHEN_MADE, WHO_MADE } from "@/lib/sell/etsy";
import { createEtsyDraft, etsySession, uploadEtsyImage } from "@/lib/sell/etsyClient";
import { etsyFailure, etsyNotConfigured, storeWorkspaceOrFail } from "@/lib/sell/etsyRoutes";
import { photoFileName, storeReadiness } from "@/lib/sell/stores";
import type { StoreListing } from "@/lib/types";
import { findVersion } from "@/lib/versionLookup";

export const maxDuration = 60;

const bodySchema = z.object({
  projectId: z.string(),
  version: z.number().int().positive(),
  taxonomyId: z.number().int().positive(),
  shippingProfileId: z.number().int().positive(),
  whoMade: z.enum(WHO_MADE),
  whenMade: z.enum(WHEN_MADE),
  quantity: z.number().int().min(1).max(ETSY_MAX_QUANTITY),
});

/**
 * Creates a draft of the listing in the creator's connected Etsy shop, with
 * the studio renders as photos. Only after the order plan is signed off, and
 * only on this explicit request. Etsy drafts aren't live: the creator
 * publishes from Etsy.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isJsonRequest(request)) return fail("Send JSON.", 415);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail("Pick a category, a shipping profile, who made it, when it was made and a quantity.", 400);
  const workspaceId = await storeWorkspaceOrFail();
  if (workspaceId instanceof Response) return workspaceId;
  const config = etsyConfig();
  if (!config) return etsyNotConfigured();

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;
  const { project, version, access } = found;
  const readiness = storeReadiness(project.id, version);
  if (!readiness.ready) return fail(readiness.message, 409);
  const listing = version.listing!;

  try {
    const { connection, accessToken } = await etsySession(config, workspaceId);
    const { listingId } = await createEtsyDraft(config, accessToken, connection.shopId, etsyDraftForm(listing, body.data));

    // Photos are best effort: the draft exists either way, and the seller can add photos on Etsy.
    let photosUploaded = 0;
    for (const [i, url] of listing.photos.slice(0, ETSY_MAX_PHOTOS).entries()) {
      const fileName = photoFileName(project.id, url);
      const file = fileName && (await readProjectFile(project.id, fileName));
      if (!file) continue;
      try {
        await uploadEtsyImage(config, accessToken, connection.shopId, listingId, file.bytes, fileName, i + 1);
        photosUploaded++;
      } catch (err) {
        console.warn("[api/stores/etsy/draft] a photo didn't upload", err instanceof Error ? err.name : typeof err);
      }
    }

    const link: StoreListing = { channel: "etsy", listingId, url: etsyEditorUrl(listingId), state: "draft", photosUploaded, createdAt: new Date().toISOString() };
    // Shared examples don't keep a visitor's store link; the creator gets it in the response.
    if (access === "owner") {
      await updateVersion(project.id, version.number, (v) => ({ ...v, storeListings: [...(v.storeListings ?? []), link] }));
    }
    return ok(link, 201);
  } catch (err) {
    return etsyFailure(err, "api/stores/etsy/draft");
  }
}
