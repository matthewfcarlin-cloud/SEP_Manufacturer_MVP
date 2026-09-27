import { fail, ok } from "../api";
import { getAccessibleProject } from "../access";
import { updateVersion } from "../projectStore";
import type { Outreach, ProjectVersion } from "../types";
import { getVersion, parseVersionParam } from "../versions";
import { PipelineError } from "./pipeline";

/**
 * Applies a pure edit to a version's outreach under the project lock and
 * returns the saved outreach, or the error response (404 / 400).
 */
export async function editOutreach(
  id: string,
  n: string,
  edit: (outreach: Outreach) => Outreach,
  after: (version: ProjectVersion) => ProjectVersion = (v) => v,
): Promise<Response> {
  const number = parseVersionParam(n);
  const found = number === null ? null : await getAccessibleProject(id);
  if (!found || number === null) return fail("Project not found.", 404);
  if (!getVersion(found.project, number)?.outreach) return fail("Request quotes for this version first.", 404);
  try {
    const saved = await updateVersion(id, number, (v) => (v.outreach ? after({ ...v, outreach: edit(v.outreach) }) : v));
    const outreach = saved && getVersion(saved, number)?.outreach;
    return outreach ? ok(outreach) : fail("Version not found.", 404);
  } catch (err) {
    if (err instanceof PipelineError) return fail(err.message, 400);
    console.error("[outreach] update failed", err);
    return fail("Couldn't update the quote. Please try again.", 500);
  }
}
