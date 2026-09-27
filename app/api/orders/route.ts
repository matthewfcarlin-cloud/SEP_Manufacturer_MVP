import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { orderOpSchema } from "@/lib/orders/schemas";
import { applyOp } from "@/lib/orders/store";
import { orderView } from "@/lib/orders/view";
import { parseVersionParam } from "@/lib/versions";
import { findVersion } from "@/lib/versionLookup";

const bodySchema = z.object({ projectId: z.string(), version: z.number().int().positive(), op: orderOpSchema });

/** The order plan for a version: the user's choices, the computed plan and matching assemblers. */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const n = params.get("version");
  const number = n === null ? undefined : parseVersionParam(n);
  if (number === null) return fail("Version not found.", 404);
  const found = await findVersion(params.get("projectId") ?? "", number);
  if (found instanceof Response) return found;
  return ok(orderView(found.version));
}

/**
 * Edits the order: run size, which source supplies each line, the
 * assembler, message drafts, and the user's sign-off. Nothing is ordered,
 * paid for or sent from here.
 */
export async function PUT(request: Request): Promise<Response> {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid change.", 400);

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;

  try {
    const result = await applyOp(found.project.id, found.version.number, body.data.op);
    if (!result.ok) return fail(result.error, result.status);
    return ok(orderView(result.version!));
  } catch (err) {
    console.error("[api/orders] failed to save", err);
    return fail("Couldn't save that change. Please try again.", 500);
  }
}
