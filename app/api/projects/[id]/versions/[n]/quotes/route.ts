import { z } from "zod";
import { currentOwnerHash, getAccessibleProject } from "@/lib/access";
import { fail, ok } from "@/lib/api";
import { recordEvent } from "@/lib/learning/record";
import { matchVersion } from "@/lib/match";
import { buildSpecSheet } from "@/lib/outreach/specSheet";
import { simulateQuotes } from "@/lib/outreach/simulate";
import { updateVersion } from "@/lib/projectStore";
import { shareLevelSchema } from "@/lib/schemas";
import type { Outreach } from "@/lib/types";
import { getVersion, parseVersionParam } from "@/lib/versions";

const bodySchema = z.object({ shareLevel: shareLevelSchema });

/**
 * "Request quotes": builds the spec sheet (at the chosen privacy level) and
 * sends it to the top matched shops. The shops are fictional demo data, so
 * nothing leaves the app: their quotes are simulated inside the analysis
 * cost range and labeled "Demo quote". Replaces any earlier request.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/versions/[n]/quotes">): Promise<Response> {
  const { id, n } = await ctx.params;
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "shareLevel": "summary" }.', 400);
  const number = parseVersionParam(n);
  const found = number === null ? null : await getAccessibleProject(id);
  const version = found && number !== null ? getVersion(found.project, number) : undefined;
  if (!found || !version) return fail("Project not found.", 404);
  if (!version.analysis) return fail("Analyze this version before requesting quotes.", 422);

  const matches = matchVersion(version);
  if (matches.length === 0) return fail("No shops match this part yet, so there's no one to ask.", 422);

  const requestedAt = new Date().toISOString();
  const outreach: Outreach = {
    requestedAt,
    specSheet: buildSpecSheet(version, version.analysis.paths[0].process, body.data.shareLevel, requestedAt),
    quotes: simulateQuotes(id, version, matches, requestedAt),
  };
  const saved = await updateVersion(id, version.number, (v) => ({ ...v, outreach }));
  if (!saved) return fail("Version not found.", 404);
  await recordEvent({
    workspaceId: await currentOwnerHash(),
    projectId: id,
    version: version.number,
    access: found.access,
    type: "quote_requested",
    payload: { quoteCount: outreach.quotes.length, shareLevel: body.data.shareLevel },
    simulated: true,
  });
  return ok(outreach, 201);
}
