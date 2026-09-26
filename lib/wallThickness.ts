import { BufferAttribute, BufferGeometry, DoubleSide, Ray, Vector3 } from "three";
import { MeshBVH } from "three-mesh-bvh";

// Shared by the server (sampled, for GeometryStats) and the browser (every
// triangle, for the thin-wall overlay), so both agree on what "thin" means.

/** Start rays just inside the surface so they don't hit their own face. */
const RAY_OFFSET_MM = 1e-3;

export type TriangleMeasure = { signedVolume: number; area: number; normal: Vector3; centroid: Vector3 };

/** Geometry of triangle t in a flat, non-indexed position array (9 floats per triangle). */
export function measureTriangle(p: ArrayLike<number>, t: number): TriangleMeasure {
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

/** +1 when triangle normals point outward, -1 for inverted winding. */
export function outwardSign(p: ArrayLike<number>): number {
  let volume = 0;
  for (let t = 0; t < p.length / 9; t++) volume += measureTriangle(p, t).signedVolume;
  return volume < 0 ? -1 : 1;
}

export type ThicknessSample = { triangle: number; thickness: number; area: number };

/**
 * Material thickness under a triangle: cast a ray inward from its centroid and
 * measure how far it travels before leaving the part. Samples every
 * `stride`-th triangle; triangles whose ray escapes (open meshes) or that have
 * zero area are omitted.
 */
export function sampleWallThickness(p: Float32Array, sign: number, stride = 1): ThicknessSample[] {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(p.slice(), 3));
  const bvh = new MeshBVH(geometry);
  const samples: ThicknessSample[] = [];
  for (let t = 0; t < p.length / 9; t += stride) {
    const { area, normal, centroid } = measureTriangle(p, t);
    if (area === 0) continue;
    const inward = normal.multiplyScalar(-sign);
    const origin = centroid.addScaledVector(inward, RAY_OFFSET_MM);
    const hit = bvh.raycastFirst(new Ray(origin, inward), DoubleSide);
    if (hit) samples.push({ triangle: t, thickness: hit.distance + RAY_OFFSET_MM, area });
  }
  geometry.dispose();
  return samples;
}
