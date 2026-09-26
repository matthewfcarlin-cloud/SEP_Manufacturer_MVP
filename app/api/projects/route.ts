import { currentOwnerHash } from "@/lib/access";
import { fail, ok } from "@/lib/api";
import { parseProjectFields } from "@/lib/projectInput";
import { createProject } from "@/lib/projectStore";
import { readTextFields, readUploadedParts } from "@/lib/uploadForm";

const TEXT_FIELDS = ["name", "notes", "targetQuantity", "budgetUsd", "materialHints"] as const;

/** Creates a project from the upload form: validates, measures the STL, stores everything as version 1. */
export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Expected a multipart form upload.", 400);
  }

  const fields = parseProjectFields(readTextFields(form, TEXT_FIELDS));
  if (!fields.success) return fail(fields.error, 400);

  const parts = await readUploadedParts(form, "api/projects");
  if (!parts.ok) return fail(parts.error, parts.status);

  // proxy.ts gives every browser an owner key; without one the project would belong to no one.
  const ownerKeyHash = await currentOwnerHash();
  if (!ownerKeyHash) return fail("Enable cookies for this site: projects are private to the browser that creates them.", 400);

  try {
    const project = await createProject({ fields: fields.data, ...parts.data, ownerKeyHash });
    return ok({ id: project.id }, 201);
  } catch (err) {
    console.error("[api/projects] failed to save project", err);
    return fail("Couldn't save the project. Please try again.", 500);
  }
}
