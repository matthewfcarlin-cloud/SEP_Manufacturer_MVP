import type { AiTask } from "../types";
import type { AiAction } from "../usage/budget";
import type { Effort } from "./types";

// Which model, effort and token limit each task runs with. Change routing
// here, nowhere else. Every task runs on the strongest model today, as it did
// before the gateway; cheaper tasks (listing, outreach, quote simulation) can
// point at a smaller model when they're added.

export const STRONGEST_MODEL = process.env.IDLEFIT_MODEL ?? "claude-opus-5";
const ANALYSIS_EFFORT = (process.env.IDLEFIT_EFFORT ?? "high") as Effort;

export type TaskRoute = {
  model: string;
  effort: Effort;
  maxTokens: number;
  /** Adaptive thinking on or off. */
  thinking: boolean;
  /** Which demo-budget estimate a house-key call must fit (lib/usage/budget.ts). */
  budgetAction: AiAction;
};

export const TASK_ROUTES: Record<AiTask, TaskRoute> = {
  // Room for adaptive thinking plus a ~4-6k token JSON answer, while staying
  // under the SDK's non-streaming timeout ceiling.
  analyze: { model: STRONGEST_MODEL, effort: ANALYSIS_EFFORT, maxTokens: 20_000, thinking: true, budgetAction: "analysis" },
  agent_chat: { model: STRONGEST_MODEL, effort: "medium", maxTokens: 8_000, thinking: true, budgetAction: "chat" },
  // Small, text-only question: low effort keeps it to a few seconds.
  price: { model: STRONGEST_MODEL, effort: "low", maxTokens: 8_000, thinking: false, budgetAction: "price" },
  // A few short paragraphs of writing.
  pitch: { model: STRONGEST_MODEL, effort: "medium", maxTokens: 10_000, thinking: false, budgetAction: "pitch" },
  // Alibaba search plan: a short list and one RFQ.
  sourcing_plan: { model: STRONGEST_MODEL, effort: "low", maxTokens: 8_000, thinking: false, budgetAction: "sourcing" },
  // One negotiation message; judgment matters more than length.
  negotiation: { model: STRONGEST_MODEL, effort: "medium", maxTokens: 10_000, thinking: false, budgetAction: "negotiation" },
  // Etsy listing copy is a short structured writing task.
  listing: { model: STRONGEST_MODEL, effort: "medium", maxTokens: 8_000, thinking: false, budgetAction: "listing" },
};
