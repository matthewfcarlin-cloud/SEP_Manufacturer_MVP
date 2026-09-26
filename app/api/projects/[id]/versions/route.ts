import { fail, ok } from "@/lib/api";
import { parseVersionFields } from "@/lib/projectInput";
import { addVersion, getProject } from "@/lib/projectStore";
import { resolveTweak } from "@/lib/tweaks";
import { readTextFields, readUploadedParts } from "@/lib/uploadForm";
import { getVersion, parseVersionParam } from "@/lib/versions";

const TEXT_FIELDS = ["notes", "targetQuantity", "budgetUsd", "materialHints", "changeNote"] as const;

/**
 * Adds a new version to a project from the new-version form. The applied
 * tweak is sent as an index ("pathIndex.tweakIndex") into the base version's
 * analysis and resolved here, so its text always comes from the real analysis.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/versions">): Promise<Response> {
  const { id } = await ctx.params;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Expected a multipart form upload.", 400);
  }

  const project = await getProject(id);
  if (!project) return fail("Project not found.", 404);

  const basedOnRaw = form.get("basedOn");
  const basedOn = parseVersionParam(typeof basedOnRaw === "string" ? basedOnRaw : undefined);
  const base = basedOn === null ? undefined : getVersion(project, basedOn);
  if (!base) return fail("Pick which version this one revises.", 400);

  const fields = parseVersionFields(readTextFields(form, TEXT_FIELDS));
  if (!fields.success) return fail(fields.error, 400);

  const tweakRaw = form.get("tweak");
  const tweakKey = typeof tweakRaw === "string" ? tweakRaw : "";
  const appliedTweak = tweakKey ? resolveTweak(base, tweakKey) : undefined;
  if (tweakKey && !appliedTweak) return fail("That design tweak isn't in the version you're revising.", 400);

  const parts = await readUploadedParts(form, "api/projects/versions");
  if (!parts.ok) return fail(parts.error, parts.status);

  try {
    const added = await addVersion(id, {
      fields: fields.data,
      ...parts.data,
      basedOn: base.number,
      ...(appliedTweak && { appliedTweak }),
      ...(form.get("keepPhotos") === "on" && { keepPhotosFrom: base }),
    });
    if (!added) return fail("Project not found.", 404);
    return ok({ id, version: added.version.number }, 201);
  } catch (err) {
    console.error("[api/projects/versions] failed to save version", err);
    return fail("Couldn't save the new version. Please try again.", 500);
  }
}
