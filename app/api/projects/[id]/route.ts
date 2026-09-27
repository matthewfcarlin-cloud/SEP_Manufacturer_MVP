import { z } from "zod";
import { requireOwner } from "@/lib/access";
import { fail, isJsonRequest, ok } from "@/lib/api";
import { projectNameSchema } from "@/lib/projectInput";
import { deleteProject, updateProject } from "@/lib/projectStore";
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

const renameSchema = z.strictObject({ name: projectNameSchema });

/** Renames the project (owner only). The only field this route changes. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/projects/[id]">): Promise<Response> {
  const { id } = await ctx.params;
  if (!isJsonRequest(request)) return fail('Send JSON like { "name": "..." }.', 415);
  const body = renameSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? 'Send JSON like { "name": "..." }.', 400);
  const project = await requireOwner(id);
  if (project instanceof Response) return project;
  try {
    const saved = await updateProject(id, (p) => ({ ...p, name: body.data.name }));
    return saved ? ok({ id, name: saved.name }) : fail("Project not found.", 404);
  } catch (err) {
    console.error("[api/projects] rename failed", err);
    return fail("Couldn't rename the project. Please try again.", 500);
  }
}
