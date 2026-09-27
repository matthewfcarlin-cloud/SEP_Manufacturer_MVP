import { fail, ok } from "@/lib/api";
import { currentCalibrationCells } from "@/lib/learning/calibrationData";
import { currentFeatureRows } from "@/lib/learning/retrieval";

/**
 * Dev button: runs the features job over current data and reports counts
 * only (never any product's data). Features aren't cached, so there's
 * nothing to rebuild; this reports what the jobs see now.
 */
export async function POST(): Promise<Response> {
  try {
    const [{ projects, contributingProjects, rows }, cells] = await Promise.all([currentFeatureRows(), currentCalibrationCells()]);
    return ok({ projects, contributingProjects, featureRows: rows.length, calibrationCells: cells.length, calibrationQuotes: cells.reduce((sum, c) => sum + c.n, 0) });
  } catch (err) {
    console.error("[api/learning/recompute] failed", err);
    return fail("Couldn't run the learning jobs. Please try again.", 500);
  }
}
