import { z } from "zod";

export const MAX_STL_BYTES = 50 * 1024 * 1024;
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

const fieldsSchema = z.object({
  name: z.string().trim().min(1, "Give the project a name.").max(120, "Keep the name under 120 characters."),
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

export type ProjectFields = z.infer<typeof fieldsSchema>;

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; field: string };

/** Validates the text fields of the new-project form. Reports the first failing field. */
export function parseProjectFields(raw: Record<string, string>): ParseResult<ProjectFields> {
  const result = fieldsSchema.safeParse({
    name: raw.name ?? "",
    notes: raw.notes ?? "",
    targetQuantity: raw.targetQuantity ?? "",
    budgetUsd: raw.budgetUsd ?? "",
    materialHints: raw.materialHints ?? "",
  });
  if (result.success) return { success: true, data: result.data };
  const issue = result.error.issues[0];
  return { success: false, error: issue.message, field: issue.path.join(".") };
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
