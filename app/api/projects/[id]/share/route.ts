import { z } from "zod";
import { requireOwner } from "@/lib/access";
import { fail, ok } from "@/lib/api";
import { setSharing } from "@/lib/shareStore";

const bodySchema = z.object({ enabled: z.boolean() });

/** Turns the public pitch link on or off. */
export async function PUT(request: Request, ctx: RouteContext<"/api/projects/[id]/share">): Promise<Response> {
  const { id } = await ctx.params;
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "enabled": true }.', 400);
  const project = await requireOwner(id);
  if (project instanceof Response) return project;
  const share = await setSharing(id, body.data.enabled);
  return share ? ok(share) : fail("Project not found.", 404);
}
