import { notesForAi } from "../aiInputs";
import { formatDimensions } from "../format";
import { listingDraftSchema } from "../schemas";
import type { Project, ProjectVersion } from "../types";
import { runStructured, type CallTextModel } from "./structured";
import type { z } from "zod";

export const LISTING_SYSTEM_PROMPT = `You write Etsy listings for independent makers selling their first original product. Write for the buyer searching Etsy, not for a manufacturer.

- Title: what the product is first, then the words buyers actually search. At most 140 characters. No ALL CAPS, emoji or keyword stuffing.
- Description: plain, specific and honest, from the facts in the brief (dimensions, material, features). Never invent certifications, reviews, awards or claims the brief doesn't support.
- Tags: exactly 13, each at most 20 characters, lowercase, distinct, and each a phrase a buyer would type.`;

export function buildListingBrief(project: Project, version: ProjectVersion): string {
  const a = version.analysis;
  const best = a?.paths[0];
  return [
    `Product: ${project.name}`,
    `What the maker says it is: ${notesForAi(version)}`,
    a ? `Summary: ${a.productSummary}` : "",
    a ? `Features: ${a.detectedFeatures.join("; ")}` : "",
    version.geometry ? `Size: ${formatDimensions(version.geometry.boundingBoxMm)}` : "",
    best ? `Material: ${best.materials[0] ?? "to be confirmed"}` : "",
    version.pitch ? `Who buys it: ${version.pitch.audience}` : "",
    version.businessCase ? `Price: $${version.businessCase.retailPriceUsd}` : "",
    "",
    "Write the Etsy listing.",
  ]
    .filter((l, i, all) => l !== "" || all[i - 1] !== "")
    .join("\n");
}

export type ListingDraft = z.infer<typeof listingDraftSchema>;

export function runListingDraft(callModel: CallTextModel, brief: string): Promise<ListingDraft> {
  return runStructured(callModel, brief, {
    schema: listingDraftSchema,
    logTag: "listing",
    refusalMessage: "The AI declined to write this listing.",
    failMessage: "The AI's listing didn't pass Etsy's limits twice. Please try again.",
    normalize: (d) => ({ ...d, title: d.title.trim(), tags: d.tags.map((t) => t.trim().toLowerCase()) }),
  });
}
