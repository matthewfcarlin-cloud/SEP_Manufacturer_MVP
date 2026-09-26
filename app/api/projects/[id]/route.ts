import { requireOwner } from "@/lib/access";
import { fail, ok } from "@/lib/api";
import { deleteProject } from "@/lib/projectStore";
import { removeShareIndex } from "@/lib/shareStore";

/** Deletes the project for real: its folder (data and every file) and its share link. */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/projects/[id]">): Promise<Response> {
  const { id } = await ctx.params;
  const project = await requireOwner(id);
  if (project instanceof Response) return project;
  try {
    if (project.share) await removeShareIndex(project.share.token);
    await deleteProject(id);
    return ok({ deleted: id });
  } catch (err) {
    console.error("[api/projects] delete failed", err);
    return fail("Couldn't delete the project. Please try again.", 500);
  }
}
