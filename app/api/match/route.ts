import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { matchVersion } from "@/lib/match";
import { findVersion } from "@/lib/versionLookup";

const bodySchema = z.object({ projectId: z.string().min(1), version: z.number().int().positive().optional() });

/** Ranked shop matches for one version (default: latest). */
export async function POST(request: Request): Promise<Response> {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "projectId": "...", "version": 2 }.', 400);

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;
  const { version } = found;
  if (!version.analysis || !version.geometry) return fail("Analyze this version before requesting shop matches.", 422);

  return ok(matchVersion(version));
}
