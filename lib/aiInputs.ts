import type { AiInputs, ProjectVersion } from "./types";

// What the owner lets the AI see. Every AI call (analysis, price, pitch)
// builds its prompt through these helpers, so a withheld field is withheld
// everywhere.

/** Shown to the model in place of anything the inventor withheld. */
export const WITHHELD = "(withheld by the inventor)";

export function resolveAiInputs(version: ProjectVersion): AiInputs {
  return version.aiInputs ?? { includePhotos: true, includeNotes: true };
}

/** The inventor's own words (notes), or the withheld marker. */
export function notesForAi(version: ProjectVersion): string {
  if (!resolveAiInputs(version).includeNotes) return WITHHELD;
  return version.notes.trim() || "(no notes given)";
}

/** The inventor's change note, or null when notes are withheld. */
export function changeNoteForAi(version: ProjectVersion): string | undefined {
  return resolveAiInputs(version).includeNotes ? version.changeNote : undefined;
}

/** Loads photos only when the owner allows them. */
export async function imagesToSend<T>(version: ProjectVersion, load: () => Promise<T[]>): Promise<T[]> {
  return resolveAiInputs(version).includePhotos ? load() : [];
}
