import type { z } from "zod";
import { gateway } from "../ai/gateway";
import { AGENT_SYSTEM_PROMPT } from "../agent/prompt";
import type { AgentMessage, AiTask } from "../types";
import { bomOutputSchema } from "../bom/schemas";
import { analysisOutputSchema, listingDraftOutputSchema, pitchOutputSchema, planDraftOutputSchema, priceSuggestionOutputSchema } from "../schemas";
import { getShops } from "../shops";
import { orderDraftOutputSchema } from "../orders/schemas";
import { sourcingPlanOutputSchemaWithSubject, supplierDraftOutputSchema } from "../sourcing/schemas";
import { BOM_SYSTEM_PROMPT } from "./bom";
import { summarizeCapacity } from "./capacity";
import { LISTING_SYSTEM_PROMPT } from "./listing";
import { PITCH_SYSTEM_PROMPT } from "./pitch";
import { PLAN_SYSTEM_PROMPT } from "./plan";
import { PRICE_SYSTEM_PROMPT } from "./price";
import { buildSystemPrompt } from "./prompt";
import type { CallModel, ImageInput } from "./run";
import { ORDER_DRAFT_SYSTEM_PROMPT } from "./orders";
import { NEGOTIATION_SYSTEM_PROMPT, SOURCING_PLAN_SYSTEM_PROMPT } from "./sourcing";
import type { CallTextModel } from "./structured";

// The app's AI callers: each pairs a task's prompt and output schema with a
// gateway call. Model, effort, keys and metering all live in lib/ai/.

// Stable across requests, so it's marked for prompt caching. Together with
// the output schema it forms a ~4.5k-token cached prefix, which also makes
// retries cheaper.
const analysisSystemPrompt = buildSystemPrompt(summarizeCapacity(getShops()));

/** Whether AI calls can run for this browser now. */
export function isAiConfigured(workspaceId: string): Promise<boolean> {
  return gateway.isConfigured(workspaceId);
}

/** The manufacturing analysis: images plus the brief, one structured answer. */
export function analysisCaller(workspaceId: string): CallModel {
  return ({ images, text, context }) =>
    gateway.generate({
      task: "analyze",
      workspaceId,
      schema: analysisOutputSchema,
      system: [{ text: analysisSystemPrompt, cache: true }],
      messages: [
        {
          role: "user",
          content: [
            ...images.map((img) => ({ type: "image" as const, ...img })),
            { type: "text" as const, text },
            ...(context ? [{ type: "text" as const, text: context }] : []),
          ],
        },
      ],
    });
}

type TextTask = Extract<AiTask, "price" | "pitch" | "sourcing_plan" | "negotiation" | "plan" | "listing" | "order_draft">;

const TEXT_TASKS: Record<TextTask, { system: string; schema: z.ZodType }> = {
  price: { system: PRICE_SYSTEM_PROMPT, schema: priceSuggestionOutputSchema },
  pitch: { system: PITCH_SYSTEM_PROMPT, schema: pitchOutputSchema },
  sourcing_plan: { system: SOURCING_PLAN_SYSTEM_PROMPT, schema: sourcingPlanOutputSchemaWithSubject },
  negotiation: { system: NEGOTIATION_SYSTEM_PROMPT, schema: supplierDraftOutputSchema },
  order_draft: { system: ORDER_DRAFT_SYSTEM_PROMPT, schema: orderDraftOutputSchema },
  plan: { system: PLAN_SYSTEM_PROMPT, schema: planDraftOutputSchema },
  listing: { system: LISTING_SYSTEM_PROMPT, schema: listingDraftOutputSchema },
};

/** A text-only structured call (price, pitch, sourcing plan, negotiation draft, launch plan, Etsy listing, order email). */
export function textCaller(task: TextTask, workspaceId: string): CallTextModel {
  const { system, schema } = TEXT_TASKS[task];
  return (text) => gateway.generate({ task, workspaceId, schema, system: [{ text: system }], messages: [{ role: "user", content: text }] });
}

/** The bill of materials: the version's photos (when allowed) go with every attempt. */
export function bomCaller(workspaceId: string, images: ImageInput[]): CallTextModel {
  return (text) =>
    gateway.generate({
      task: "bom",
      workspaceId,
      schema: bomOutputSchema,
      system: [{ text: BOM_SYSTEM_PROMPT }],
      messages: [{ role: "user", content: [...images.map((img) => ({ type: "image" as const, ...img })), { type: "text" as const, text }] }],
    });
}

/**
 * The build agent's streamed reply. The product context is a stable system
 * block marked for caching, so follow-up turns re-read it cheaply.
 */
export function streamAgentReply(input: { workspaceId: string; context: string; messages: AgentMessage[]; signal: AbortSignal }) {
  return gateway.stream({
    task: "agent_chat",
    workspaceId: input.workspaceId,
    signal: input.signal,
    system: [{ text: AGENT_SYSTEM_PROMPT }, { text: input.context, cache: true }],
    messages: input.messages,
  });
}
