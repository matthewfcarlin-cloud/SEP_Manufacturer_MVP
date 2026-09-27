import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { unitCostAt } from "@/lib/businessCase";
import { calibrate } from "@/lib/learning/calibration";
import { currentCalibrationCells } from "@/lib/learning/calibrationData";
import { sizeBucket } from "@/lib/learning/vocabulary";
import { findVersion } from "@/lib/versionLookup";

const query = z.object({ projectId: z.string().min(1).max(64), version: z.coerce.number().int().positive() });

/**
 * Calibration for one version's displayed costs: the cells for its size
 * (so the page can calibrate any quantity with calibrate()), plus each
 * path's unit cost at the target quantity, already calibrated and labeled.
 */
export async function GET(request: Request): Promise<Response> {
  const params = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!params.success) return fail("Use ?projectId=...&version=1.", 400);
  const found = await findVersion(params.data.projectId, params.data.version);
  if (found instanceof Response) return found;
  const { version } = found;
  if (!version.analysis || !version.geometry) return fail("Analyze this version first.", 422);

  try {
    const size = sizeBucket(version.geometry.boundingBoxMm);
    const cells = (await currentCalibrationCells()).filter((c) => c.sizeBucket === size);
    const paths = version.analysis.paths.map((path) => ({
      process: path.process,
      quantity: version.targetQuantity,
      unitCostUsd: calibrate(unitCostAt(path, version.targetQuantity), cells, path.process, size, version.targetQuantity),
    }));
    return ok({ sizeBucket: size, cells, paths });
  } catch (err) {
    console.error("[api/calibration] failed", err);
    return fail("Couldn't load calibration. Please try again.", 500);
  }
}
