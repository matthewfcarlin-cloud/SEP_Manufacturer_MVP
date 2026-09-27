import { z } from "zod";
import { requireOwner } from "@/lib/access";
import { fail, isJsonRequest, ok } from "@/lib/api";
import { updateProject } from "@/lib/projectStore";
import type { LearningConsent } from "@/lib/types";

const bodySchema = z.strictObject({ contribute: z.boolean() });

/**
 * Turns "help improve estimates" on or off for this product (owner only; off
 * by default). When on, its structured features (category, process, material
 * family, size, quantity, cost estimate, real-quote summary) may appear as a
 * "similar product" in other creators' AI prompts. Takes effect immediately.
 */
export async function PUT(request: Request, ctx: RouteContext<"/api/projects/[id]/learning">): Promise<Response> {
  const { id } = await ctx.params;
  if (!isJsonRequest(request)) return fail("Send JSON like { \"contribute\": true }.", 415);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "contribute": true }.', 400);
  const project = await requireOwner(id);
  if (project instanceof Response) return project;

  const learning: LearningConsent = { contribute: body.data.contribute, updatedAt: new Date().toISOString() };
  try {
    const saved = await updateProject(id, (p) => ({ ...p, learning }));
    return saved ? ok({ learning }) : fail("Project not found.", 404);
  } catch (err) {
    console.error("[api/projects/learning] couldn't save the setting", err);
    return fail("Couldn't save the setting. Please try again.", 500);
  }
}
