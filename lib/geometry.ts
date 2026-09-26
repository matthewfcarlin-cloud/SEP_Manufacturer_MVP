import { BufferAttribute, BufferGeometry, DoubleSide, Ray, Vector3 } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { MeshBVH } from "three-mesh-bvh";
import { MIN_WALL_MM } from "./geometryLimits";
import type { GeometryStats } from "./types";

// STL files carry no units. We assume millimeters, which is what nearly every
// CAD package exports by default; the UI says so next to the numbers.

/** Warn when more than this share of the surface sits over a thin wall. */
const THIN_AREA_FRACTION = 0.05;
/** Cap on faces ray-tested for wall thickness; keeps big meshes fast. */
const MAX_THICKNESS_SAMPLES = 4000;
/** Vertex-weld tolerance for the watertight check. */
const WELD_EPS_MM = 1e-3;
/** Start rays just inside the surface so they don't hit their own face. */
const RAY_OFFSET_MM = 1e-3;

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

type TriangleMeasure = { signedVolume: number; area: number; normal: Vector3; centroid: Vector3 };

function measureTriangle(p: Float32Array, t: number): TriangleMeasure {
  const i = t * 9;
  const a = new Vector3(p[i], p[i + 1], p[i + 2]);
  const b = new Vector3(p[i + 3], p[i + 4], p[i + 5]);
  const c = new Vector3(p[i + 6], p[i + 7], p[i + 8]);
  const cross = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
  return {
    signedVolume: a.dot(new Vector3().crossVectors(b, c)) / 6,
    area: cross.length() / 2,
    normal: cross.normalize(),
    centroid: a.add(b).add(c).divideScalar(3),
  };
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

/**
 * Casts a ray inward from a sample of faces and measures how far it travels
 * before leaving the part. Area-weighted, so a few tiny thin features don't
 * trip the warning but a thin shell does.
 */
function hasThinWalls(p: Float32Array, triangleCount: number, outwardSign: number): boolean {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(p.slice(), 3));
  const bvh = new MeshBVH(geometry);
  const stride = Math.max(1, Math.floor(triangleCount / MAX_THICKNESS_SAMPLES));

  let sampledArea = 0;
  let thinArea = 0;
  for (let t = 0; t < triangleCount; t += stride) {
    const { area, normal, centroid } = measureTriangle(p, t);
    if (area === 0) continue;
    const inward = normal.multiplyScalar(-outwardSign);
    const origin = centroid.addScaledVector(inward, RAY_OFFSET_MM);
    const hit = bvh.raycastFirst(new Ray(origin, inward), DoubleSide, 0, MIN_WALL_MM);
    sampledArea += area;
    if (hit) thinArea += area;
  }
  geometry.dispose();
  return sampledArea > 0 && thinArea / sampledArea > THIN_AREA_FRACTION;
}

const round = (n: number, places: number) => Number(n.toFixed(places));

/** Parses an STL (binary or ASCII) and measures it. Throws StlParseError on bad input. */
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
    thinWallWarning: hasThinWalls(positions, triangleCount, outwardSign),
  };
}
