import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { matchVersion } from "@/lib/match";
import { getProject } from "@/lib/projectStore";
import { getVersion, latestVersion } from "@/lib/versions";

const bodySchema = z.object({ projectId: z.string().min(1), version: z.number().int().positive().optional() });

/** Ranked shop matches for one version (default: latest). */
export async function POST(request: Request): Promise<Response> {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "projectId": "...", "version": 2 }.', 400);

  const project = await getProject(body.data.projectId);
  if (!project) return fail("Project not found.", 404);
  const version = body.data.version === undefined ? latestVersion(project) : getVersion(project, body.data.version);
  if (!version) return fail("Version not found.", 404);
  if (!version.analysis || !version.geometry) return fail("Analyze this version before requesting shop matches.", 422);

  return ok(matchVersion(version));
}
