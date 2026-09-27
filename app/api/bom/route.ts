import { randomBytes } from "node:crypto";
import { imagesToSend } from "@/lib/aiInputs";
import { fail, ok } from "@/lib/api";
import { buildBomBrief, runBomGeneration } from "@/lib/analysis/bom";
import { bomCaller, isAiConfigured } from "@/lib/analysis/callers";
import { aiFailure } from "@/lib/analysis/errors";
import { applyBomEdit, bomFromAnswer, type BomContext } from "@/lib/bom/build";
import { bomEditSchema, bomGenerateSchema } from "@/lib/bom/schemas";
import { getVersionImages, updateVersion } from "@/lib/projectStore";
import type { Bom, ProjectVersion } from "@/lib/types";
import { aiBudgetGate } from "@/lib/usage/gate";
import { findVersion } from "@/lib/versionLookup";

export const maxDuration = 120;

const context = (): BomContext => ({ now: new Date().toISOString(), newId: () => randomBytes(9).toString("base64url") });

/** The path a BOM is for: the one asked for if the analysis has it, else the top path. */
function pathFor(version: ProjectVersion, asked?: string) {
  const paths = version.analysis?.paths ?? [];
  return (paths.find((p) => p.process === asked) ?? paths[0])?.process;
}

/** Drafts a version's bill of materials with the AI, replacing any existing one. */
export async function POST(request: Request): Promise<Response> {
  const body = bomGenerateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "projectId": "...", "version": 1 }.', 400);

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;
  const process = pathFor(found.version, body.data.process);
  if (!process) return fail("Analyze this version before drafting its bill of materials.", 422);

  const ownerHash = await aiBudgetGate("bom");
  if (ownerHash instanceof Response) return ownerHash;
  if (!(await isAiConfigured(ownerHash))) {
    return fail("AI drafting isn't set up yet: add ANTHROPIC_API_KEY to .env.local, or your own key in Settings.", 503);
  }

  try {
    const { project, version } = found;
    const images = await imagesToSend(version, () => getVersionImages(project.id, version));
    const answer = await runBomGeneration(bomCaller(ownerHash, images), buildBomBrief(project, version, process, images.length), process);
    const bom = bomFromAnswer(answer, process, context());
    const saved = await updateVersion(project.id, version.number, (v) => ({ ...v, bom }));
    return saved ? ok(bom) : fail("This version was removed.", 404);
  } catch (err) {
    return aiFailure(err, "api/bom");
  }
}

/** Saves the user's edited lines. Also starts a BOM by hand when there's none yet. */
export async function PUT(request: Request): Promise<Response> {
  const body = bomEditSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid bill of materials.", 400);

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;
  const process = pathFor(found.version);
  if (!found.version.bom && !process) return fail("Analyze this version before building its bill of materials.", 422);

  try {
    let bom: Bom | undefined;
    const saved = await updateVersion(found.project.id, found.version.number, (v) => {
      bom = applyBomEdit(v.bom, body.data.items, v.bom?.process ?? process!, context());
      return { ...v, bom };
    });
    return saved && bom ? ok(bom) : fail("This version was removed.", 404);
  } catch (err) {
    console.error("[api/bom] failed to save edits", err);
    return fail("Couldn't save the bill of materials. Please try again.", 500);
  }
}
