import { getAccessibleProject } from "@/lib/access";
import { fail, ok } from "@/lib/api";
import { RENDER_COUNT, RenderError, saveVersionRenders } from "@/lib/projectStore";
import { parseVersionParam } from "@/lib/versions";

/** Stores the four studio renders captured in the browser, so the pitch shows stills (and prints) without WebGL. */
export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/versions/[n]/renders">): Promise<Response> {
  const { id, n } = await ctx.params;
  const version = parseVersionParam(n);
  if (version === null) return fail("Version not found.", 404);
  if (!(await getAccessibleProject(id))) return fail("Project not found.", 404);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Expected a multipart upload of renders.", 400);
  }
  const files = form.getAll("renders").filter((f): f is File => f instanceof File);
  if (files.length !== RENDER_COUNT) return fail(`Send exactly ${RENDER_COUNT} renders.`, 400);

  try {
    const saved = await saveVersionRenders(id, version, await Promise.all(files.map(async (f) => new Uint8Array(await f.arrayBuffer()))));
    if (!saved) return fail("Version not found.", 404);
    return ok({ renders: saved.renders ?? [] });
  } catch (err) {
    if (err instanceof RenderError) return fail(err.message, 400);
    console.error("[api/renders] failed to save renders", err);
    return fail("Couldn't save the renders.", 500);
  }
}
