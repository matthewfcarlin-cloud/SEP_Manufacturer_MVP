import { listOutcomes } from "../db/learningStore";
import { listProjects } from "../projectStore";
import type { CalibrationCell } from "../types";
import { getVersion } from "../versions";
import { calibrationCells, type CalibrationSample } from "./calibration";
import { isContributing } from "./features";
import { sizeBucket } from "./vocabulary";

/**
 * Current calibration cells from real quotes on contributing products
 * (source "real", opted in). Computed on every call, like similar products,
 * so an opt-out or a delete takes effect at once; that also covers "after
 * each new real quote".
 */
export async function currentCalibrationCells(): Promise<CalibrationCell[]> {
  const projects = (await listProjects()).filter(isContributing);
  const samples = await Promise.all(
    projects.map(async (project): Promise<CalibrationSample[]> =>
      (await listOutcomes(project.id)).flatMap((o) => {
        const geometry = getVersion(project, o.version)?.geometry;
        if (o.kind !== "real_quote" || o.source !== "real" || !o.process || !o.quantity || !o.actualUsd || !o.estimateUsd || !geometry) return [];
        const mid = (o.estimateUsd.low + o.estimateUsd.high) / 2;
        return mid > 0 ? [{ process: o.process, sizeBucket: sizeBucket(geometry.boundingBoxMm), quantity: o.quantity, ratio: o.actualUsd / mid }] : [];
      }),
    ),
  );
  return calibrationCells(samples.flat());
}
