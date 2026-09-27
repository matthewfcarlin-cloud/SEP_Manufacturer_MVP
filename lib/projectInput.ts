import { z } from "zod";

export const MAX_STL_BYTES = 50 * 1024 * 1024;
/** CAD file extensions the upload accepts. STEP is converted to STL on the server. */
export const CAD_EXTENSIONS = [".stl", ".step", ".stp"] as const;

export type CadFormat = "stl" | "step";

/**
 * Identifies the CAD format from the file's content, falling back to the
 * extension only to tell ASCII STL from anything else. STEP files always
 * begin with the ISO-10303-21 header.
 */
export function detectCadFormat(fileName: string, head: Uint8Array): CadFormat | null {
  const text = new TextDecoder().decode(head.subarray(0, 64)).trimStart();
  if (text.startsWith("ISO-10303-21")) return "step";
  return fileName.toLowerCase().endsWith(".stl") ? "stl" : null;
}
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // Claude's per-image limit
export const MAX_IMAGES = 5;
export const MAX_MATERIAL_HINTS = 10;

export type ImageType = "jpg" | "png" | "webp";

export const IMAGE_CONTENT_TYPES: Record<ImageType, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const optionalPositiveNumber = z
  .string()
  .trim()
  .transform((s) => (s === "" ? undefined : Number(s)))
  .pipe(z.number("Budget must be a number.").positive("Budget must be more than $0.").max(100_000_000).optional());

const briefSchema = z.object({
  notes: z.string().trim().max(4000, "Notes must be 4000 characters or fewer."),
  targetQuantity: z
    .string()
    .trim()
    .transform(Number)
    .pipe(
      z
        .number({ message: "Target quantity must be a number." })
        .int("Target quantity must be a whole number.")
        .min(1, "Target quantity must be at least 1.")
        .max(10_000_000, "Target quantity must be 10 million or less."),
    ),
  budgetUsd: optionalPositiveNumber,
  materialHints: z
    .string()
    .transform((s) =>
      s
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().max(40)).max(MAX_MATERIAL_HINTS, "Up to 10 material ideas.")),
});

export const projectNameSchema = z.string().trim().min(1, "Give the project a name.").max(120, "Keep the name under 120 characters.");

const fieldsSchema = briefSchema.extend({ name: projectNameSchema });

export const MAX_CHANGE_NOTE = 1000;

const versionFieldsSchema = briefSchema.extend({
  changeNote: z
    .string()
    .trim()
    .min(1, "Say what changed in this version.")
    .max(MAX_CHANGE_NOTE, `Keep the change note under ${MAX_CHANGE_NOTE} characters.`),
});

export type ProjectFields = z.infer<typeof fieldsSchema>;
export type VersionFields = z.infer<typeof versionFieldsSchema>;

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; field: string };

function firstIssue<T>(result: z.ZodSafeParseResult<T>): ParseResult<T> {
  if (result.success) return { success: true, data: result.data };
  const issue = result.error.issues[0];
  return { success: false, error: issue.message, field: issue.path.join(".") };
}

const briefInput = (raw: Record<string, string>) => ({
  notes: raw.notes ?? "",
  targetQuantity: raw.targetQuantity ?? "",
  budgetUsd: raw.budgetUsd ?? "",
  materialHints: raw.materialHints ?? "",
});

/** Validates the text fields of the new-project form. Reports the first failing field. */
export function parseProjectFields(raw: Record<string, string>): ParseResult<ProjectFields> {
  return firstIssue(fieldsSchema.safeParse({ ...briefInput(raw), name: raw.name ?? "" }));
}

/** Validates the text fields of the new-version form. Reports the first failing field. */
export function parseVersionFields(raw: Record<string, string>): ParseResult<VersionFields> {
  return firstIssue(versionFieldsSchema.safeParse({ ...briefInput(raw), changeNote: raw.changeNote ?? "" }));
}

const startsWith = (bytes: Uint8Array, sig: number[], offset = 0) =>
  bytes.length >= offset + sig.length && sig.every((b, i) => bytes[offset + i] === b);

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/** Identifies an image by its magic bytes, never by filename or client-sent MIME type. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) return "webp";
  return null;
}
