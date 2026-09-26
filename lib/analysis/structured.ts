import type { z } from "zod";
import { AnalysisError, type ModelTurn } from "./run";

/** Sends one text-only user turn and returns the model's structured answer. */
export type CallTextModel = (text: string) => Promise<ModelTurn>;

type Options<T> = {
  schema: z.ZodType<T>;
  logTag: string;
  /** Shown to the user when both attempts fail. */
  failMessage: string;
  refusalMessage: string;
  normalize?: (value: T) => T;
};

type Attempt<T> = { ok: true; value: T } | { ok: false; problems: string[] };

function check<T>(turn: ModelTurn, { schema, refusalMessage, normalize }: Options<T>): Attempt<T> {
  if (turn.stopReason === "refusal") throw new AnalysisError(refusalMessage);
  if (turn.output == null) return { ok: false, problems: ["No structured answer was returned."] };
  const result = schema.safeParse(turn.output);
  if (!result.success) {
    return { ok: false, problems: result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
  }
  return { ok: true, value: normalize ? normalize(result.data) : result.data };
}

/**
 * Asks for a small structured answer, with one retry that names what failed
 * validation. Used by the text-only calls (price, pitch); the full analysis
 * has its own runner in run.ts because it also trims and ranks paths.
 */
export async function runStructured<T>(callModel: CallTextModel, text: string, options: Options<T>): Promise<T> {
  const first = check(await callModel(text), options);
  if (first.ok) return first.value;
  console.warn(`[${options.logTag}] first attempt failed validation, retrying`, first.problems);
  const retry = `${text}\n\nA previous answer was rejected for these reasons:\n${first.problems.map((p) => `- ${p}`).join("\n")}\nAnswer again, fixing these.`;
  const second = check(await callModel(retry), options);
  if (second.ok) return second.value;
  console.error(`[${options.logTag}] retry also failed validation`, second.problems);
  throw new AnalysisError(options.failMessage);
}
