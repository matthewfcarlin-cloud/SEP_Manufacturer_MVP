import { z } from "zod";
import { currentOwnerHash } from "@/lib/access";
import { fail, isJsonRequest, ok } from "@/lib/api";
import { appendOutcome, listOutcomes } from "@/lib/db/learningStore";
import { outcomeLimit } from "@/lib/learning/limits";
import { buildOutcome, outcomeRequestSchema } from "@/lib/learning/outcomes";
import { findVersion } from "@/lib/versionLookup";

/**
 * Saves a real-world outcome for a version: a supplier's real quote, an
 * actual unit cost, or units sold. Answers with the stored row, including
 * its `source` ("demo" on shared examples) and the analysis estimate.
 */
export async function POST(request: Request): Promise<Response> {
  const workspaceId = await currentOwnerHash();
  if (!workspaceId) return fail("Enable cookies for this site to save results.", 400);
  if (!isJsonRequest(request)) return fail("Send the outcome as JSON.", 415);
  const body = outcomeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid outcome.", 400);
  if (!outcomeLimit.allow(workspaceId)) return fail("Too many entries from this browser. Try again in a few minutes.", 429);

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;
  const built = buildOutcome(body.data, found.version, found.access);
  if (!built.ok) return fail(built.error, built.status);
  try {
    const saved = await appendOutcome(found.project.id, built.outcome);
    return saved ? ok(built.outcome, 201) : fail("Project not found.", 404);
  } catch (err) {
    console.error("[api/outcomes] couldn't store the outcome", err);
    return fail("Couldn't save that. Please try again.", 500);
  }
}

const listQuery = z.object({ projectId: z.string().min(1).max(64), version: z.coerce.number().int().positive() });

/** A version's saved outcomes, oldest first: `{ outcomes: Outcome[] }`. */
export async function GET(request: Request): Promise<Response> {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = listQuery.safeParse(params);
  if (!query.success) return fail("Use ?projectId=...&version=1.", 400);
  const found = await findVersion(query.data.projectId, query.data.version);
  if (found instanceof Response) return found;
  try {
    const outcomes = (await listOutcomes(found.project.id)).filter((o) => o.version === found.version.number);
    return ok({ outcomes });
  } catch (err) {
    console.error("[api/outcomes] couldn't read outcomes", err);
    return fail("Couldn't load saved results. Please try again.", 500);
  }
}
