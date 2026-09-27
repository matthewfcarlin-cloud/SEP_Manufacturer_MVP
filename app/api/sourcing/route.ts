import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { sourcingOpSchema } from "@/lib/sourcing/schemas";
import { applyOp } from "@/lib/sourcing/store";
import { findVersion } from "@/lib/versionLookup";

const bodySchema = z.object({ projectId: z.string(), version: z.number().int().positive(), op: sourcingOpSchema });

/**
 * Edits the supplier shortlist and conversations: add or edit suppliers,
 * paste a supplier's reply, edit a draft, or record that the user sent it.
 * Nothing is ever sent to a supplier from here.
 */
export async function PUT(request: Request): Promise<Response> {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid change.", 400);

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;

  try {
    const result = await applyOp(found.project.id, found.version.number, body.data.op);
    return result.ok ? ok(result.sourcing) : fail(result.error, result.status);
  } catch (err) {
    console.error("[api/sourcing] failed to save", err);
    return fail("Couldn't save that change. Please try again.", 500);
  }
}
