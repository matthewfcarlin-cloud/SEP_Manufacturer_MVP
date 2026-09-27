import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { textCaller, isAiConfigured } from "@/lib/analysis/callers";
import { aiFailure } from "@/lib/analysis/errors";
import { buildPitchBrief, runPitchGeneration } from "@/lib/analysis/pitch";
import { updateVersion } from "@/lib/projectStore";
import { pitchEditSchema } from "@/lib/schemas";
import type { PitchContent } from "@/lib/types";
import { aiBudgetGate } from "@/lib/usage/gate";
import { findVersion } from "@/lib/versionLookup";

export const maxDuration = 120;

const target = { projectId: z.string(), version: z.number().int().positive() };
const generateSchema = z.object(target);
const editSchema = z.object({ ...target, pitch: pitchEditSchema });

async function savePitch(projectId: string, version: number, pitch: PitchContent): Promise<Response> {
  const saved = await updateVersion(projectId, version, (v) => ({ ...v, pitch }));
  if (!saved) return fail("This version was removed.", 404);
  return ok(pitch);
}

/** Writes the licensing-pitch text for a version with the AI, replacing any existing text. */
export async function POST(request: Request): Promise<Response> {
  const body = generateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "projectId": "...", "version": 1 }.', 400);

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;
  if (!found.version.analysis) return fail("Analyze this version before writing its pitch.", 422);

  const ownerHash = await aiBudgetGate("pitch");
  if (ownerHash instanceof Response) return ownerHash;
  if (!(await isAiConfigured(ownerHash))) {
    return fail("AI writing isn't set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server.", 503);
  }

  try {
    const pitch = await runPitchGeneration(textCaller("pitch", ownerHash), buildPitchBrief(found.project, found.version));
    return await savePitch(found.project.id, found.version.number, pitch);
  } catch (err) {
    return aiFailure(err, "api/pitch");
  }
}

/** Saves the user's edits to the pitch text. */
export async function PUT(request: Request): Promise<Response> {
  const body = editSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid pitch.", 400);

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;

  try {
    return await savePitch(found.project.id, found.version.number, { ...body.data.pitch, editedByUser: true });
  } catch (err) {
    console.error("[api/pitch] failed to save edits", err);
    return fail("Couldn't save the pitch. Please try again.", 500);
  }
}
