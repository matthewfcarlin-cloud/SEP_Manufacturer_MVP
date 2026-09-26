import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { callClaude, isClaudeConfigured } from "@/lib/analysis/claude";
import { buildProjectBrief } from "@/lib/analysis/prompt";
import { AnalysisError, runAnalysis } from "@/lib/analysis/run";
import { getProject, getProjectImages, saveProject } from "@/lib/projectStore";
import type { Analysis } from "@/lib/types";

// Opus with adaptive thinking and up to two attempts can take a few minutes.
export const maxDuration = 300;

const bodySchema = z.object({ projectId: z.string() });

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

/** Runs the AI manufacturing analysis for a stored project and saves the result on it. */
export async function POST(request: Request): Promise<Response> {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail("Send JSON like { \"projectId\": \"...\" }.", 400);

  const project = await getProject(body.data.projectId);
  if (!project) return fail("Project not found.", 404);

  if (!isClaudeConfigured()) {
    return fail("AI analysis isn't set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server.", 503);
  }

  try {
    const images = await getProjectImages(project);
    const analysis: Analysis = await runAnalysis(callClaude, {
      images,
      text: buildProjectBrief(project, images.length),
    });
    await saveProject({ ...project, analysis });
    return ok(analysis);
  } catch (err) {
    return toFailure(err);
  }
}
