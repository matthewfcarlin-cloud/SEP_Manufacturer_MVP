import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AccessibleProject } from "../access";
import { PROCESSES } from "../processes";
import { listTweaks } from "../tweaks";
import type { LearningSource, ProductEvent, ProductEventType, ProjectVersion } from "../types";

// What each event may carry. Every payload is strict (unknown keys are
// refused) and every string is an enum, so no free text, notes or file
// contents can ride along. Keep in step with ProductEventType.

const count = z.number().int().min(0).max(10_000_000);
const usd = z.number().nonnegative().max(1_000_000);
const process = z.enum(PROCESSES);
const rating = z.enum(["up", "down"]);
const listingField = z.enum(["title", "description", "tags", "price"]);

export const EVENT_PAYLOADS = {
  analysis_run: z.strictObject({ pathCount: count, topProcess: process, keySource: z.enum(["user", "house"]) }),
  tweak_applied: z.strictObject({ process, fromVersion: count }),
  tweak_rated: z.strictObject({ process, pathIndex: count, tweakIndex: count, rating }),
  quote_requested: z.strictObject({ quoteCount: count, shareLevel: z.enum(["summary", "full"]) }),
  quote_chosen: z.strictObject({ process, quantity: count, unitPriceUsd: usd, leadTimeDays: count }),
  plan_generated: z.strictObject({}),
  listing_generated: z.strictObject({}),
  listing_copied: z.strictObject({ field: listingField }),
  agent_question: z.strictObject({ turnCount: count }),
  agent_rated: z.strictObject({ turnIndex: count, rating }),
} satisfies Record<ProductEventType, z.ZodType>;

// What a browser may send to POST /api/events. Everything else is logged by
// the server where it happens, so a client can't fake an analysis or a quote.
// Tweak ratings name the tweak by its key; the server looks up the process.
const clientEvent = <T extends string, P extends z.ZodType>(type: T, payload: P) =>
  z.strictObject({ projectId: z.string().min(1).max(64), version: z.number().int().positive(), type: z.literal(type), payload });

const clientEventSchema = z.discriminatedUnion("type", [
  clientEvent("tweak_rated", z.strictObject({ tweak: z.string().regex(/^\d{1,2}\.\d{1,2}$/), rating })),
  clientEvent("agent_rated", EVENT_PAYLOADS.agent_rated),
  clientEvent("listing_copied", EVENT_PAYLOADS.listing_copied),
]);
export type ClientEvent = z.infer<typeof clientEventSchema>;

export const MAX_EVENTS_PER_REQUEST = 50;
export const eventsRequestSchema = z.strictObject({ events: z.array(clientEventSchema).min(1).max(MAX_EVENTS_PER_REQUEST) });

/** Learning only ever reads "real": the creator's own project. Shared examples are demo. */
export function sourceFor(access: AccessibleProject["access"]): LearningSource {
  return access === "owner" ? "real" : "demo";
}

/** Turns a client event into its stored payload, resolved against the version. Null when it doesn't apply to this version. */
export function resolveClientEvent(
  event: Pick<ClientEvent, "type" | "payload">,
  version: ProjectVersion,
): { type: ProductEventType; payload: ProductEvent["payload"] } | null {
  if (event.type !== "tweak_rated") return { type: event.type, payload: event.payload };
  const { tweak, rating } = event.payload as { tweak: string; rating: "up" | "down" };
  const option = listTweaks(version).find((o) => o.key === tweak);
  if (!option) return null;
  const [pathIndex, tweakIndex] = tweak.split(".").map(Number);
  return { type: "tweak_rated", payload: { process: option.process, pathIndex, tweakIndex, rating } };
}

type EventInput = Omit<ProductEvent, "id" | "createdAt">;

/** A complete event row. Throws if the payload doesn't match its type's schema. */
export function buildEvent(input: EventInput): ProductEvent {
  const payload = EVENT_PAYLOADS[input.type].parse(input.payload) as ProductEvent["payload"];
  return {
    id: randomUUID(),
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    ...(input.version !== undefined && { version: input.version }),
    type: input.type,
    payload,
    source: input.source,
    createdAt: new Date().toISOString(),
  };
}
