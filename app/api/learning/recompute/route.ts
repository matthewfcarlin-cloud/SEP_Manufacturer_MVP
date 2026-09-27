import { fail, ok } from "@/lib/api";
import { currentFeatureRows } from "@/lib/learning/retrieval";

/**
 * Dev button: runs the features job over current data and reports counts
 * only (never any product's data). Features aren't cached, so there's
 * nothing to rebuild yet; calibration (B3) and tweak stats (B4) join here.
 */
export async function POST(): Promise<Response> {
  try {
    const { projects, contributingProjects, rows } = await currentFeatureRows();
    return ok({ projects, contributingProjects, featureRows: rows.length });
  } catch (err) {
    console.error("[api/learning/recompute] failed", err);
    return fail("Couldn't run the learning jobs. Please try again.", 500);
  }
}
