import { z } from "zod";
import { parseProjectFields } from "../projectInput";

// The /new flow's logic, kept pure: one question per screen, the answers it
// collects (every field the upload form always had), per-screen checks that
// reuse the server's own validation, saved drafts, and honest loading lines.

export const STEPS = ["what", "look", "howMany", "budget", "review"] as const;
export type Step = (typeof STEPS)[number];

/** The four tiles on "How many do you want to make?", or an exact number. */
export const QUANTITY_PRESETS = [10, 100, 1000] as const;
export type Quantity = { kind: "preset"; value: (typeof QUANTITY_PRESETS)[number] } | { kind: "unsure" } | { kind: "exact"; value: string } | null;

/** "Not sure yet" plans for a small batch; it can be changed later. */
export const UNSURE_QUANTITY = 100;

export type Answers = { name: string; notes: string; materialHints: string; quantity: Quantity; budget: string };
export const EMPTY_ANSWERS: Answers = { name: "", notes: "", materialHints: "", quantity: null, budget: "" };

export function quantityValue(quantity: Quantity): string {
  if (!quantity) return "";
  if (quantity.kind === "preset") return String(quantity.value);
  if (quantity.kind === "unsure") return String(UNSURE_QUANTITY);
  return quantity.value.trim();
}

/** How the review screen says the quantity. */
export function quantityLabel(quantity: Quantity): string {
  if (!quantity) return "Not chosen";
  if (quantity.kind === "unsure") return `Not sure yet (planning for ${UNSURE_QUANTITY})`;
  const n = Number(quantityValue(quantity));
  return Number.isFinite(n) && n > 0 ? `${n.toLocaleString("en-US")} units` : quantity.kind === "exact" ? quantity.value : "Not chosen";
}

/** The text fields the create route reads, exactly as the old form sent them. */
export function formFields(a: Answers): Record<"name" | "notes" | "materialHints" | "targetQuantity" | "budgetUsd", string> {
  return { name: a.name, notes: a.notes, materialHints: a.materialHints, targetQuantity: quantityValue(a.quantity), budgetUsd: a.budget.trim() };
}

// Valid stand-ins for the screens not being checked, so the server's parser
// only reports problems that belong to the current screen.
const VALID = { name: "x", notes: "", materialHints: "", targetQuantity: "1", budgetUsd: "" };

const serverError = (raw: Partial<typeof VALID>): string | null => {
  const result = parseProjectFields({ ...VALID, ...raw });
  return result.success ? null : result.error;
};

/** What's wrong on this screen, in plain words, or null to continue. */
export function stepError(step: Step, a: Answers, hasFiles: boolean): string | null {
  const f = formFields(a);
  switch (step) {
    case "what":
      return serverError({ name: f.name, notes: f.notes, materialHints: f.materialHints });
    case "look":
      return hasFiles || a.notes.trim() ? null : "Add a file, or go back and describe it in a sentence.";
    case "howMany":
      return a.quantity ? serverError({ targetQuantity: f.targetQuantity }) : "Pick one to continue.";
    case "budget":
      return serverError({ budgetUsd: f.budgetUsd });
    case "review": {
      const parsed = parseProjectFields(f);
      if (!parsed.success) return parsed.error;
      return stepError("look", a, hasFiles);
    }
  }
}

const quantitySchema = z.union([
  z.object({ kind: z.literal("preset"), value: z.union([z.literal(10), z.literal(100), z.literal(1000)]) }),
  z.object({ kind: z.literal("unsure") }),
  z.object({ kind: z.literal("exact"), value: z.string() }),
  z.null(),
]);
const draftSchema = z.object({ name: z.string(), notes: z.string(), materialHints: z.string(), quantity: quantitySchema, budget: z.string() });

/** "Save and exit" keeps the text answers; files can't be stored in the browser. */
export const serializeDraft = (a: Answers): string => JSON.stringify(a);

export function parseDraft(raw: string | null): Answers | null {
  if (!raw) return null;
  try {
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The lines the loading screen rotates through: only what is really happening. */
export function loadingLines({ hasCad, willAnalyze }: { hasCad: boolean; willAnalyze: boolean }): string[] {
  const first = hasCad ? "Measuring your part…" : "Saving your product…";
  return willAnalyze ? [first, "Finding ways to make it…", "Estimating costs…"] : [first, "Getting your studio ready…"];
}
