import { currentOwnerHash, getAccessibleProject } from "@/lib/access";
import { fail, ok } from "@/lib/api";
import { duplicateProject } from "@/lib/projectStore";

/** Copies a project you can open (yours or a shared example) into a new private one of yours. */
export async function POST(_request: Request, ctx: RouteContext<"/api/projects/[id]/duplicate">): Promise<Response> {
  const { id } = await ctx.params;
  const [found, ownerHash] = await Promise.all([getAccessibleProject(id), currentOwnerHash()]);
  if (!found) return fail("Project not found.", 404);
  if (!ownerHash) return fail("Reload the page and try again.", 400);
  try {
    const copy = await duplicateProject(id, ownerHash);
    return copy ? ok({ id: copy.id, name: copy.name }, 201) : fail("Project not found.", 404);
  } catch (err) {
    console.error("[api/projects/duplicate] failed", err);
    return fail("Couldn't duplicate the project. Please try again.", 500);
  }
}
