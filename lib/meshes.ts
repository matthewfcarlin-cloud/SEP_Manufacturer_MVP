// Procedural meshes with known geometry. Used by tests (as fixtures with
// exact expected stats) and by scripts/make-demo-stl.ts (demo parts).
// Kept dependency-free so Node can run it directly with type stripping.

export type Vec3 = readonly [number, number, number];
export type Triangle = readonly [Vec3, Vec3, Vec3];

// Two triangles for a quad whose corners are given counter-clockwise as seen
// from the side the normal should point to.
function quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3): Triangle[] {
  return [
    [a, b, c],
    [a, c, d],
  ];
}

/** Closed box from (0,0,0) to (x,y,z), outward-facing normals. */
export function box(x: number, y: number, z: number): Triangle[] {
  const p = (i: number, j: number, k: number): Vec3 => [i * x, j * y, k * z];
  return [
    ...quad(p(0, 0, 0), p(0, 1, 0), p(1, 1, 0), p(1, 0, 0)), // bottom (-z)
    ...quad(p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)), // top (+z)
    ...quad(p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)), // front (-y)
    ...quad(p(0, 1, 0), p(0, 1, 1), p(1, 1, 1), p(1, 1, 0)), // back (+y)
    ...quad(p(0, 0, 0), p(0, 0, 1), p(0, 1, 1), p(0, 1, 0)), // left (-x)
    ...quad(p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)), // right (+x)
  ];
}

/**
 * Open-bottom shell, like a pedal enclosure lying lid-down: outer box
 * (x, y, z) minus an inner cavity inset by `wall` on the four sides and top,
 * open at z = 0. Closed and manifold.
 */
export function openShell(x: number, y: number, z: number, wall: number): Triangle[] {
  const o = (i: number, j: number, k: number): Vec3 => [i * x, j * y, k * z];
  const ix0 = wall, iy0 = wall, ix1 = x - wall, iy1 = y - wall, iz1 = z - wall;
  const n = (px: number, py: number, pz: number): Vec3 => [px, py, pz];

  const outer = [
    ...quad(o(0, 0, 1), o(1, 0, 1), o(1, 1, 1), o(0, 1, 1)), // top
    ...quad(o(0, 0, 0), o(1, 0, 0), o(1, 0, 1), o(0, 0, 1)), // front
    ...quad(o(0, 1, 0), o(0, 1, 1), o(1, 1, 1), o(1, 1, 0)), // back
    ...quad(o(0, 0, 0), o(0, 0, 1), o(0, 1, 1), o(0, 1, 0)), // left
    ...quad(o(1, 0, 0), o(1, 1, 0), o(1, 1, 1), o(1, 0, 1)), // right
  ];

  // Inner surfaces face into the cavity, i.e. opposite winding to the outer box.
  const inner = [
    ...quad(n(ix0, iy0, iz1), n(ix0, iy1, iz1), n(ix1, iy1, iz1), n(ix1, iy0, iz1)), // ceiling (-z)
    ...quad(n(ix0, iy0, 0), n(ix0, iy0, iz1), n(ix1, iy0, iz1), n(ix1, iy0, 0)), // front wall (+y)
    ...quad(n(ix0, iy1, 0), n(ix1, iy1, 0), n(ix1, iy1, iz1), n(ix0, iy1, iz1)), // back wall (-y)
    ...quad(n(ix0, iy0, 0), n(ix0, iy1, 0), n(ix0, iy1, iz1), n(ix0, iy0, iz1)), // left wall (+x)
    ...quad(n(ix1, iy0, 0), n(ix1, iy0, iz1), n(ix1, iy1, iz1), n(ix1, iy1, 0)), // right wall (-x)
  ];

  // Bottom rim (-z): four trapezoids between the outer and inner rectangles.
  const oa = o(0, 0, 0), ob = o(1, 0, 0), oc = o(1, 1, 0), od = o(0, 1, 0);
  const ia = n(ix0, iy0, 0), ib = n(ix1, iy0, 0), ic = n(ix1, iy1, 0), id = n(ix0, iy1, 0);
  const rim = [
    ...quad(oa, ia, ib, ob),
    ...quad(ob, ib, ic, oc),
    ...quad(oc, ic, id, od),
    ...quad(od, id, ia, oa),
  ];

  return [...outer, ...inner, ...rim];
}

function normalOf([a, b, c]: Triangle): Vec3 {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const nx = u[1] * v[2] - u[2] * v[1];
  const ny = u[2] * v[0] - u[0] * v[2];
  const nz = u[0] * v[1] - u[1] * v[0];
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len];
}

export function toBinaryStl(triangles: readonly Triangle[]): ArrayBuffer {
  const buffer = new ArrayBuffer(84 + triangles.length * 50);
  const view = new DataView(buffer);
  view.setUint32(80, triangles.length, true);
  triangles.forEach((tri, i) => {
    const values = [...normalOf(tri), ...tri.flat()];
    const base = 84 + i * 50;
    values.forEach((val, j) => view.setFloat32(base + j * 4, val, true));
  });
  return buffer;
}

export function toAsciiStl(triangles: readonly Triangle[], name = "part"): string {
  const facets = triangles.map((tri) => {
    const [nx, ny, nz] = normalOf(tri);
    const verts = tri.map((v) => `      vertex ${v[0]} ${v[1]} ${v[2]}`).join("\n");
    return `  facet normal ${nx} ${ny} ${nz}\n    outer loop\n${verts}\n    endloop\n  endfacet`;
  });
  return `solid ${name}\n${facets.join("\n")}\nendsolid ${name}\n`;
}
