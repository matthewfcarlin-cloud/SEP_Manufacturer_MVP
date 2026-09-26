import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { callClaude, isClaudeConfigured } from "@/lib/analysis/claude";
import { buildProjectBrief } from "@/lib/analysis/prompt";
import { aiFailure } from "@/lib/analysis/errors";
import { runAnalysis } from "@/lib/analysis/run";
import { getVersionImages, updateVersion } from "@/lib/projectStore";
import type { Analysis } from "@/lib/types";
import { findVersion } from "@/lib/versionLookup";

// Opus with adaptive thinking and up to two attempts can take a few minutes.
export const maxDuration = 300;

const bodySchema = z.object({ projectId: z.string(), version: z.number().int().positive().optional() });

/** Runs the AI manufacturing analysis for one version (default: latest) and saves the result on it. */
export async function POST(request: Request): Promise<Response> {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail("Send JSON like { \"projectId\": \"...\", \"version\": 2 }.", 400);

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;
  const { project, version } = found;

  if (!isClaudeConfigured()) {
    return fail("AI analysis isn't set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server.", 503);
  }

  try {
    const images = await getVersionImages(project.id, version);
    const analysis: Analysis = await runAnalysis(callClaude, {
      images,
      text: buildProjectBrief(project, version, images.length),
    });
    // Re-reads the project before saving, so versions added meanwhile survive.
    const saved = await updateVersion(project.id, version.number, (v) => ({ ...v, analysis }));
    if (!saved) return fail("This version was removed while it was being analyzed.", 404);
    return ok(analysis);
  } catch (err) {
    return aiFailure(err, "api/analyze");
  }
}
