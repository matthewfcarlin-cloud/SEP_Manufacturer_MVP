import { requireOwner } from "@/lib/access";
import { fail, ok } from "@/lib/api";
import { rotateShare } from "@/lib/shareStore";

/** Revokes the current public link and issues a new one. */
export async function POST(_request: Request, ctx: RouteContext<"/api/projects/[id]/share/rotate">): Promise<Response> {
  const { id } = await ctx.params;
  const project = await requireOwner(id);
  if (project instanceof Response) return project;
  const share = await rotateShare(id);
  return share ? ok(share) : fail("Project not found.", 404);
}
