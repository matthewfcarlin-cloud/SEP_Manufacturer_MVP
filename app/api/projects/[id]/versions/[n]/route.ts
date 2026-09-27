import { requireOwner } from "@/lib/access";
import { fail, ok } from "@/lib/api";
import { removeVersionRecords } from "@/lib/db/learningStore";
import { deleteVersion } from "@/lib/projectStore";
import { parseVersionParam } from "@/lib/versions";

/** Deletes one version: its entry, its files, and its events and outcomes. */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/projects/[id]/versions/[n]">): Promise<Response> {
  const { id, n } = await ctx.params;
  const version = parseVersionParam(n);
  if (version === null) return fail("Version not found.", 404);
  const project = await requireOwner(id);
  if (project instanceof Response) return project;

  const result = await deleteVersion(id, version);
  if (result === "not-found") return fail("Version not found.", 404);
  if (result === "only-version") return fail("This is the only version. Delete the whole project instead.", 409);
  await removeVersionRecords(id, version);
  return ok({ deleted: version });
}
