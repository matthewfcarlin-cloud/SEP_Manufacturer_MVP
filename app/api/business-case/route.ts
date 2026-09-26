import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { updateVersion } from "@/lib/projectStore";
import { businessCaseInputsSchema } from "@/lib/schemas";
import { findVersion } from "@/lib/versionLookup";

const bodySchema = z.object({
  projectId: z.string(),
  version: z.number().int().positive(),
  inputs: businessCaseInputsSchema.omit({ priceSuggestion: true }),
});

/** Saves the user's business-case inputs on a version, keeping any AI price suggestion. */
export async function PUT(request: Request): Promise<Response> {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid business case.", 400);

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;

  try {
    const saved = await updateVersion(found.project.id, found.version.number, (v) => ({
      ...v,
      businessCase: {
        ...body.data.inputs,
        ...(v.businessCase?.priceSuggestion && { priceSuggestion: v.businessCase.priceSuggestion }),
      },
    }));
    const businessCase = saved?.versions.find((v) => v.number === found.version.number)?.businessCase;
    if (!businessCase) return fail("Version not found.", 404);
    return ok(businessCase);
  } catch (err) {
    console.error("[api/business-case] failed to save", err);
    return fail("Couldn't save the business case. Please try again.", 500);
  }
}
