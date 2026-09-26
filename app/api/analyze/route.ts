import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { callClaude, isClaudeConfigured } from "@/lib/analysis/claude";
import { buildProjectBrief } from "@/lib/analysis/prompt";
import { AnalysisError, runAnalysis } from "@/lib/analysis/run";
import { getProject, getVersionImages, updateVersion } from "@/lib/projectStore";
import type { Analysis } from "@/lib/types";
import { getVersion, latestVersion } from "@/lib/versions";

// Opus with adaptive thinking and up to two attempts can take a few minutes.
export const maxDuration = 300;

const bodySchema = z.object({ projectId: z.string(), version: z.number().int().positive().optional() });

function toFailure(err: unknown): Response {
  if (err instanceof AnalysisError) return fail(err.message, 422);
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("[api/analyze] Anthropic auth failed; is ANTHROPIC_API_KEY set?", err.message);
    return fail("The server isn't configured with a working Anthropic API key.", 500);
  }
  if (err instanceof Anthropic.RateLimitError) {
    return fail("The AI service is busy right now. Try again in a minute.", 429);
  }
  if (err instanceof Anthropic.APIConnectionError) {
    console.error("[api/analyze] couldn't reach the Anthropic API", err);
    return fail("Couldn't reach the AI service. Check the connection and try again.", 502);
  }
  if (err instanceof Anthropic.APIError) {
    console.error(`[api/analyze] Anthropic API error ${err.status}`, err.message);
    return fail("The AI service returned an error. Please try again.", 502);
  }
  console.error("[api/analyze] unexpected failure", err);
  return fail("Something went wrong running the analysis. Please try again.", 500);
}

/** Runs the AI manufacturing analysis for one version (default: latest) and saves the result on it. */
export async function POST(request: Request): Promise<Response> {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail("Send JSON like { \"projectId\": \"...\", \"version\": 2 }.", 400);

  const project = await getProject(body.data.projectId);
  if (!project) return fail("Project not found.", 404);
  const version = body.data.version === undefined ? latestVersion(project) : getVersion(project, body.data.version);
  if (!version) return fail("Version not found.", 404);

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
    return toFailure(err);
  }
}
