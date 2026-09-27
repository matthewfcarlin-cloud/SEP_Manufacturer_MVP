import type { AccessibleProject } from "../access";
import { appendEvents } from "../db/learningStore";
import type { ProductEvent, ProductEventType } from "../types";
import { buildEvent, sourceFor } from "./events";

type ServerEvent = {
  workspaceId: string | undefined;
  projectId: string;
  version?: number;
  access: AccessibleProject["access"];
  type: ProductEventType;
  payload: ProductEvent["payload"];
  /** Force demo even on the creator's own project (the event is built on simulated data, e.g. demo quotes). */
  simulated?: boolean;
};

/**
 * Logs an event from a route, where the action happened. Never throws:
 * learning is a side effect and must not fail the creator's request.
 */
export async function recordEvent(input: ServerEvent): Promise<void> {
  if (!input.workspaceId) return;
  try {
    const event = buildEvent({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      version: input.version,
      type: input.type,
      payload: input.payload,
      source: input.simulated ? "demo" : sourceFor(input.access),
    });
    await appendEvents(input.projectId, [event]);
  } catch (err) {
    console.error(`[learning] couldn't record ${input.type} for ${input.projectId}`, err);
  }
}
