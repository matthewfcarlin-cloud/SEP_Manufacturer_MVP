import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { currentTweakStats } from "@/lib/learning/tweakData";
import { rankTweaks } from "@/lib/learning/tweakStats";
import { findVersion } from "@/lib/versionLookup";

const query = z.object({ projectId: z.string().min(1).max(64), version: z.coerce.number().int().positive() });

/** A version's design tweaks, each path's best first by what actually worked, with the evidence. */
export async function GET(request: Request): Promise<Response> {
  const params = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!params.success) return fail("Use ?projectId=...&version=1.", 400);
  const found = await findVersion(params.data.projectId, params.data.version);
  if (found instanceof Response) return found;
  if (!found.version.analysis) return fail("Analyze this version first.", 422);
  try {
    return ok({ paths: rankTweaks(found.version, await currentTweakStats()) });
  } catch (err) {
    console.error("[api/tweak-ranking] failed", err);
    return fail("Couldn't rank the tweaks. Please try again.", 500);
  }
}
