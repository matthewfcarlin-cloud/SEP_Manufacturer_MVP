// Server-side parsing shared by the new-project and new-version uploads:
// text fields, the CAD file (STEP converted to STL), and photos.
import { analyzeStl, scaleStl, StlParseError } from "./geometry";
import { detectCadFormat, detectImageType, MAX_IMAGE_BYTES, MAX_IMAGES, MAX_STL_BYTES, type ImageType } from "./projectInput";
import { StepParseError, stepToStl } from "./step";
import { MM_PER_UNIT, parseStlUnit } from "./units";
import type { GeometryStats } from "./types";

const MB = 1024 * 1024;

export type UploadedParts = {
  stl: Uint8Array;
  geometry: GeometryStats;
  images: { type: ImageType; bytes: Uint8Array }[];
};

export type UploadResult = { ok: true; data: UploadedParts } | { ok: false; error: string; status: number };

const rejected = (error: string, status = 400): UploadResult => ({ ok: false, error, status });

/** The named string fields of a form, with missing or file values as "". */
export function readTextFields<K extends string>(form: FormData, keys: readonly K[]): Record<K, string> {
  return Object.fromEntries(
    keys.map((key) => {
      const value = form.get(key);
      return [key, typeof value === "string" ? value : ""];
    }),
  ) as Record<K, string>;
}

async function readImages(files: File[]): Promise<UploadedParts["images"] | string> {
  if (files.length > MAX_IMAGES) return `Upload at most ${MAX_IMAGES} photos.`;
  const images: UploadedParts["images"] = [];
  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES) return `"${file.name}" is over ${MAX_IMAGE_BYTES / MB} MB.`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = detectImageType(bytes);
    if (!type) return `"${file.name}" isn't a JPG, PNG, or WebP image.`;
    images.push({ type, bytes });
  }
  return images;
}

/** Validates the CAD file and photos, converts STEP, and measures the part. */
export async function readUploadedParts(form: FormData, logTag: string): Promise<UploadResult> {
  const cadFile = form.get("stl");
  if (!(cadFile instanceof File) || cadFile.size === 0) return rejected("Attach an STL or STEP file of your part.");
  if (cadFile.size > MAX_STL_BYTES) return rejected(`CAD files must be under ${MAX_STL_BYTES / MB} MB.`);

  const imageFiles = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const images = await readImages(imageFiles);
  if (typeof images === "string") return rejected(images);

  const unitsRaw = form.get("units");
  const units = parseStlUnit(typeof unitsRaw === "string" ? unitsRaw : "");
  if (!units) return rejected("Pick the units your STL was exported in: millimeters, centimeters, meters or inches.");

  const cadBytes = new Uint8Array(await cadFile.arrayBuffer());
  const format = detectCadFormat(cadFile.name, cadBytes);
  if (!format) return rejected("Upload an STL or STEP (.step, .stp) file.");

  try {
    // Everything downstream (viewer, geometry, AI brief) works on STL.
    // STEP records its own units (converted to mm); STL is scaled from the unit the user picked.
    const raw = cadBytes.buffer.slice(cadBytes.byteOffset, cadBytes.byteOffset + cadBytes.byteLength);
    const stlBuffer =
      format === "step" ? await stepToStl(cadBytes) : units === "mm" ? raw : scaleStl(raw, MM_PER_UNIT[units]);
    const geometry = analyzeStl(stlBuffer);
    return { ok: true, data: { stl: new Uint8Array(stlBuffer), geometry, images } };
  } catch (err) {
    if (err instanceof StlParseError || err instanceof StepParseError) return rejected(err.message);
    console.error(`[${logTag}] geometry analysis failed`, err);
    return rejected("Something went wrong measuring this part. Try re-exporting the STL.", 500);
  }
}
