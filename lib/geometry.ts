import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { MIN_WALL_MM } from "./geometryLimits";
import { measureTriangle, sampleWallThickness } from "./wallThickness";
import { toBinaryStl, type Triangle, type Vec3 } from "./meshes";
import type { GeometryStats } from "./types";

// Everything here works in millimeters. STL files carry no units, so the
// upload says which unit a file was exported in and scaleStl() converts it
// first (lib/units.ts); millimeters is the default.

/** Warn when more than this share of the surface sits over a thin wall. */
const THIN_AREA_FRACTION = 0.05;
/** Cap on faces ray-tested for wall thickness; keeps big meshes fast. */
const MAX_THICKNESS_SAMPLES = 4000;
/** Vertex-weld tolerance for the watertight check. */
const WELD_EPS_MM = 1e-3;

export class StlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StlParseError";
  }
}

function parsePositions(data: ArrayBuffer): Float32Array {
  let positions: ArrayLike<number> | undefined;
  try {
    positions = new STLLoader().parse(data).getAttribute("position")?.array;
  } catch {
    throw new StlParseError("This file couldn't be read as an STL.");
  }
  if (!positions || positions.length < 9) {
    throw new StlParseError("This STL has no triangles in it.");
  }
  for (let i = 0; i < positions.length; i++) {
    if (!Number.isFinite(positions[i])) {
      throw new StlParseError("This STL contains invalid coordinates.");
    }
  }
  return Float32Array.from(positions);
}

function boundingBox(p: Float32Array): GeometryStats["boundingBoxMm"] {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], p[i + axis]);
      max[axis] = Math.max(max[axis], p[i + axis]);
    }
  }
  return { x: max[0] - min[0], y: max[1] - min[1], z: max[2] - min[2] };
}

/** Every edge shared by exactly two faces once coincident vertices are welded. */
function isWatertight(p: Float32Array): boolean {
  const vertexIds = new Map<string, number>();
  const idOf = (i: number) => {
    const key = `${Math.round(p[i] / WELD_EPS_MM)},${Math.round(p[i + 1] / WELD_EPS_MM)},${Math.round(p[i + 2] / WELD_EPS_MM)}`;
    let id = vertexIds.get(key);
    if (id === undefined) {
      id = vertexIds.size;
      vertexIds.set(key, id);
    }
    return id;
  };

  const edgeCounts = new Map<string, number>();
  for (let i = 0; i < p.length; i += 9) {
    const ids = [idOf(i), idOf(i + 3), idOf(i + 6)];
    for (let e = 0; e < 3; e++) {
      const a = ids[e];
      const b = ids[(e + 1) % 3];
      if (a === b) continue; // degenerate sliver edge
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
  }
  for (const count of edgeCounts.values()) {
    if (count !== 2) return false;
  }
  return edgeCounts.size > 0;
}

type WallMeasurement = { thinWallWarning: boolean; typicalWallMm: number | undefined };

/** Area-weighted median of the sampled thicknesses. */
function weightedMedian(samples: { thickness: number; area: number }[]): number | undefined {
  if (samples.length === 0) return undefined;
  const sorted = [...samples].sort((a, b) => a.thickness - b.thickness);
  const half = sorted.reduce((sum, s) => sum + s.area, 0) / 2;
  let running = 0;
  for (const s of sorted) {
    running += s.area;
    if (running >= half) return s.thickness;
  }
  return sorted[sorted.length - 1].thickness;
}

/**
 * Casts a ray inward from a sample of faces and measures how far it travels
 * before leaving the part: that's the material thickness under that face.
 * Area-weighted, so a few tiny thin features don't trip the warning but a
 * thin shell does, and the median reflects what most of the part is like.
 */
function measureWalls(p: Float32Array, triangleCount: number, sign: number): WallMeasurement {
  const stride = Math.max(1, Math.floor(triangleCount / MAX_THICKNESS_SAMPLES));
  const samples = sampleWallThickness(p, sign, stride);

  const sampledArea = samples.reduce((sum, s) => sum + s.area, 0);
  const thinArea = samples.filter((s) => s.thickness < MIN_WALL_MM).reduce((sum, s) => sum + s.area, 0);
  const typical = weightedMedian(samples);
  return {
    thinWallWarning: sampledArea > 0 && thinArea / sampledArea > THIN_AREA_FRACTION,
    typicalWallMm: typical === undefined ? undefined : round(typical, 1),
  };
}

const round = (n: number, places: number) => Number(n.toFixed(places));

/** Parses an STL (binary or ASCII) and measures it. Throws StlParseError on bad input. */
/**
 * Returns the STL with every coordinate multiplied by `factor`, as binary
 * STL. Used to convert files exported in cm, m or inches to millimeters.
 */
export function scaleStl(data: ArrayBuffer, factor: number): ArrayBuffer {
  const p = parsePositions(data);
  const triangles: Triangle[] = [];
  for (let i = 0; i < p.length; i += 9) {
    const v = (j: number): Vec3 => [p[i + j] * factor, p[i + j + 1] * factor, p[i + j + 2] * factor];
    triangles.push([v(0), v(3), v(6)]);
  }
  return toBinaryStl(triangles);
}

export function analyzeStl(data: ArrayBuffer): GeometryStats {
  const positions = parsePositions(data);
  const triangleCount = positions.length / 9;

  let signedVolumeMm3 = 0;
  let areaMm2 = 0;
  for (let t = 0; t < triangleCount; t++) {
    const m = measureTriangle(positions, t);
    signedVolumeMm3 += m.signedVolume;
    areaMm2 += m.area;
  }

  const box = boundingBox(positions);
  const watertight = isWatertight(positions);
  // Inverted winding gives a negative signed volume; flip "outward" to match.
  const outwardSign = signedVolumeMm3 < 0 ? -1 : 1;

  return {
    boundingBoxMm: { x: round(box.x, 2), y: round(box.y, 2), z: round(box.z, 2) },
    volumeCm3: round(Math.abs(signedVolumeMm3) / 1000, 3),
    surfaceAreaCm2: round(areaMm2 / 100, 2),
    triangleCount,
    isWatertight: watertight,
    ...measureWalls(positions, triangleCount, outwardSign),
  };
}
