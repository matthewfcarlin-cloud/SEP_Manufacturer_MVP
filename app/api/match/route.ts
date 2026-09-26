import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { matchProject } from "@/lib/match";
import { getProject } from "@/lib/projectStore";

const bodySchema = z.object({ projectId: z.string().min(1) });

export async function POST(request: Request): Promise<Response> {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "projectId": "..." }.', 400);

  const project = await getProject(body.data.projectId);
  if (!project) return fail("Project not found.", 404);
  if (!project.analysis || !project.geometry) return fail("Analyze this project before requesting shop matches.", 422);

  return ok(matchProject(project));
}
