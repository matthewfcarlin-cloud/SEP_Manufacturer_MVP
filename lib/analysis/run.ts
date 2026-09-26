import { analysisSchema } from "../schemas";
import type { Analysis } from "../types";

export type ImageInput = { mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string };

/** What one model call returns, stripped to what the retry loop needs. */
export type ModelTurn = {
  stopReason: string | null;
  /** Parsed structured output, or null if the model produced none. */
  output: unknown;
};

/** Sends one user turn (images + text) and returns the model's structured answer. */
export type CallModel = (input: { images: ImageInput[]; text: string }) => Promise<ModelTurn>;

/** A failure with a message safe to show the user. */
export class AnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisError";
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const range = (r: { low: number; high: number }, round: (n: number) => number) => ({
  low: round(r.low),
  high: round(r.high),
});

/** Sorts paths best-first, numbers shots 1..n, and rounds money to sensible precision. */
export function normalizeAnalysis(a: Analysis): Analysis {
  return {
    ...a,
    paths: [...a.paths]
      .sort((x, y) => y.fitScore - x.fitScore)
      .map((p) => ({
        ...p,
        fitScore: Math.round(p.fitScore),
        unitCostUsd: range(p.unitCostUsd, round2),
        toolingCostUsd: range(p.toolingCostUsd, Math.round),
        leadTimeDays: range(p.leadTimeDays, Math.round),
      })),
    storyboard: a.storyboard.map((s, i) => ({ ...s, shot: i + 1 })),
  };
}

type Attempt = { ok: true; analysis: Analysis } | { ok: false; problems: string[] };

function checkTurn(turn: ModelTurn): Attempt {
  if (turn.stopReason === "refusal") {
    throw new AnalysisError("The AI declined to analyze this project. Try rewording the notes.");
  }
  if (turn.stopReason === "max_tokens") {
    return { ok: false, problems: ["The previous answer ran out of room and was cut off. Be more concise."] };
  }
  if (turn.output == null) {
    return { ok: false, problems: ["No structured analysis was returned."] };
  }
  const result = analysisSchema.safeParse(turn.output);
  if (result.success) return { ok: true, analysis: normalizeAnalysis(result.data) };
  return {
    ok: false,
    problems: result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
  };
}

function retryText(text: string, problems: string[]): string {
  return `${text}

A previous attempt at this analysis was rejected by validation for these reasons:
${problems.map((p) => `- ${p}`).join("\n")}
Produce the complete analysis again, fixing these.`;
}

/**
 * Runs the analysis with one retry. The retry is a fresh request that names
 * what failed, rather than a continuation, so no thinking blocks need echoing.
 */
export async function runAnalysis(
  callModel: CallModel,
  input: { images: ImageInput[]; text: string },
): Promise<Analysis> {
  const first = checkTurn(await callModel(input));
  if (first.ok) return first.analysis;

  console.warn("[analysis] first attempt failed validation, retrying", first.problems);
  const second = checkTurn(await callModel({ ...input, text: retryText(input.text, first.problems) }));
  if (second.ok) return second.analysis;

  console.error("[analysis] retry also failed validation", second.problems);
  throw new AnalysisError("The AI's answer didn't pass our checks twice in a row. Please try again.");
}
