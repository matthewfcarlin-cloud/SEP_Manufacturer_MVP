import { currentOwnerHash, getAccessibleProject } from "@/lib/access";
import { fail, isJsonRequest, ok } from "@/lib/api";
import { appendEvents } from "@/lib/db/learningStore";
import { buildEvent, eventsRequestSchema, resolveClientEvent, sourceFor, type ClientEvent } from "@/lib/learning/events";
import { eventLimit } from "@/lib/learning/limits";
import type { ProductEvent } from "@/lib/types";
import { getVersion } from "@/lib/versions";

/**
 * Batched feedback events from the browser (👍/👎 on tweaks and agent
 * answers, listing copies). Events for a project this browser can't see, or
 * a version or tweak that doesn't exist, are dropped. `{ accepted, dropped }`.
 */
export async function POST(request: Request): Promise<Response> {
  const workspaceId = await currentOwnerHash();
  if (!workspaceId) return fail("Enable cookies for this site to send feedback.", 400);
  if (!isJsonRequest(request)) return fail("Send events as JSON.", 415);
  const body = eventsRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid events.", 400);
  const { events } = body.data;
  if (!eventLimit.allow(workspaceId, events.length)) return fail("Too many events from this browser. Try again in a few minutes.", 429);

  const byProject = Map.groupBy(events, (e) => e.projectId);
  let accepted = 0;
  try {
    for (const [projectId, group] of byProject) {
      accepted += await recordGroup(workspaceId, projectId, group);
    }
  } catch (err) {
    console.error("[api/events] couldn't store events", err);
    return fail("Couldn't save feedback. Please try again.", 500);
  }
  return ok({ accepted, dropped: events.length - accepted });
}

async function recordGroup(workspaceId: string, projectId: string, group: ClientEvent[]): Promise<number> {
  const found = await getAccessibleProject(projectId);
  if (!found) return 0;
  const source = sourceFor(found.access);
  const rows: ProductEvent[] = group.flatMap((event) => {
    const version = getVersion(found.project, event.version);
    const resolved = version && resolveClientEvent(event, version);
    return resolved ? [buildEvent({ workspaceId, projectId, version: event.version, ...resolved, source })] : [];
  });
  if (rows.length === 0) return 0;
  return (await appendEvents(projectId, rows)) ? rows.length : 0;
}
