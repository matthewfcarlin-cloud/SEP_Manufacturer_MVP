import { fail, ok } from "@/lib/api";
import { analyzeStl, StlParseError } from "@/lib/geometry";
import {
  detectImageType,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  MAX_STL_BYTES,
  parseProjectFields,
  type ImageType,
} from "@/lib/projectInput";
import { createProject } from "@/lib/projectStore";

const TEXT_FIELDS = ["name", "notes", "targetQuantity", "budgetUsd", "materialHints"] as const;
const MB = 1024 * 1024;

type ValidatedImage = { type: ImageType; bytes: Uint8Array };

async function readImages(files: File[]): Promise<ValidatedImage[] | string> {
  if (files.length > MAX_IMAGES) return `Upload at most ${MAX_IMAGES} photos.`;
  const images: ValidatedImage[] = [];
  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES) {
      return `"${file.name}" is over ${MAX_IMAGE_BYTES / MB} MB.`;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = detectImageType(bytes);
    if (!type) return `"${file.name}" isn't a JPG, PNG, or WebP image.`;
    images.push({ type, bytes });
  }
  return images;
}

/** Creates a project from the upload form: validates, measures the STL, stores everything. */
export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Expected a multipart form upload.", 400);
  }

  const raw = Object.fromEntries(
    TEXT_FIELDS.map((key) => {
      const value = form.get(key);
      return [key, typeof value === "string" ? value : ""];
    }),
  );
  const fields = parseProjectFields(raw);
  if (!fields.success) return fail(fields.error, 400);

  const stlFile = form.get("stl");
  if (!(stlFile instanceof File) || stlFile.size === 0) {
    return fail("Attach an STL file of your part.", 400);
  }
  if (stlFile.size > MAX_STL_BYTES) {
    return fail(`STL files must be under ${MAX_STL_BYTES / MB} MB.`, 400);
  }

  const imageFiles = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const images = await readImages(imageFiles);
  if (typeof images === "string") return fail(images, 400);

  const stlBuffer = await stlFile.arrayBuffer();
  let geometry;
  try {
    geometry = analyzeStl(stlBuffer);
  } catch (err) {
    if (err instanceof StlParseError) return fail(err.message, 400);
    console.error("[api/projects] geometry analysis failed", err);
    return fail("Something went wrong measuring this part. Try re-exporting the STL.", 500);
  }

  try {
    const project = await createProject({
      fields: fields.data,
      stl: new Uint8Array(stlBuffer),
      geometry,
      images,
    });
    return ok({ id: project.id }, 201);
  } catch (err) {
    console.error("[api/projects] failed to save project", err);
    return fail("Couldn't save the project. Please try again.", 500);
  }
}
