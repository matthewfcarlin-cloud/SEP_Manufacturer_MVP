import { getAccessibleProject } from "@/lib/access";
import { fail, ok } from "@/lib/api";
import { updateVersion } from "@/lib/projectStore";
import { aiInputsSchema } from "@/lib/schemas";
import { parseVersionParam } from "@/lib/versions";

/** Saves what this version lets the AI see (photos, notes). */
export async function PUT(request: Request, ctx: RouteContext<"/api/projects/[id]/versions/[n]/ai-inputs">): Promise<Response> {
  const { id, n } = await ctx.params;
  const version = parseVersionParam(n);
  const body = aiInputsSchema.safeParse(await request.json().catch(() => null));
  if (version === null || !body.success) return fail('Send JSON like { "includePhotos": true, "includeNotes": false }.', 400);
  if (!(await getAccessibleProject(id))) return fail("Project not found.", 404);

  const saved = await updateVersion(id, version, (v) => ({ ...v, aiInputs: body.data }));
  return saved ? ok(body.data) : fail("Version not found.", 404);
}
