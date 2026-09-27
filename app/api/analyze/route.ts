import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { analysisCaller, isAiConfigured } from "@/lib/analysis/callers";
import { buildProjectBrief } from "@/lib/analysis/prompt";
import { imagesToSend } from "@/lib/aiInputs";
import { aiFailure } from "@/lib/analysis/errors";
import { getKeyInfo } from "@/lib/ai/keyStore";
import { recordEvent } from "@/lib/learning/record";
import { learningContextFor } from "@/lib/learning/retrieval";
import { runAnalysis } from "@/lib/analysis/run";
import { getVersionImages, updateVersion } from "@/lib/projectStore";
import type { Analysis } from "@/lib/types";
import { aiBudgetGate } from "@/lib/usage/gate";
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
  const { project, version, access } = found;

  const ownerHash = await aiBudgetGate("analysis");
  if (ownerHash instanceof Response) return ownerHash;
  if (!(await isAiConfigured(ownerHash))) {
    return fail("AI analysis isn't set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server.", 503);
  }

  try {
    const images = await imagesToSend(version, () => getVersionImages(project.id, version));
    const learned = await learningContextFor(project, version);
    const analysis: Analysis = await runAnalysis(analysisCaller(ownerHash), {
      images,
      text: buildProjectBrief(project, version, images.length),
      ...(learned && { context: learned }),
    });
    // Re-reads the project before saving, so versions added meanwhile survive.
    const saved = await updateVersion(project.id, version.number, (v) => ({ ...v, analysis }));
    if (!saved) return fail("This version was removed while it was being analyzed.", 404);
    await recordEvent({
      workspaceId: ownerHash,
      projectId: project.id,
      version: version.number,
      access,
      type: "analysis_run",
      payload: { pathCount: analysis.paths.length, topProcess: analysis.paths[0].process, keySource: (await getKeyInfo(ownerHash)) ? "user" : "house" },
    });
    return ok(analysis);
  } catch (err) {
    return aiFailure(err, "api/analyze");
  }
}
