// Generates the demo parts in demo/ with manifold-3d, whose boolean
// operations always produce closed, manifold meshes (so the app's
// watertight check passes). Run with: npm run demo:stl
// Units are millimeters; Z is up (the STL convention the app assumes).
import { writeFileSync } from "node:fs";
import Module from "manifold-3d/manifold";
import { toBinaryStl, type Triangle, type Vec3 } from "../lib/meshes.ts";

const wasm = await Module();
wasm.setup();
const { Manifold } = wasm;
type Solid = InstanceType<typeof Manifold>;

const SEGMENTS = 48;

/** Box spanning [x0,x1] × [y0,y1] × [z0,z1]. */
const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Solid =>
  Manifold.cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0]);

/** Through-hole cutter along Z (vertical), centered at (x, y, z). */
const holeZ = (r: number, len: number, x: number, y: number, z: number): Solid =>
  Manifold.cylinder(len, r, r, SEGMENTS, true).translate([x, y, z]);

/** Cutter along Y (through the long side walls). */
const holeY = (r: number, len: number, x: number, y: number, z: number): Solid =>
  Manifold.cylinder(len, r, r, SEGMENTS, true).rotate([90, 0, 0]).translate([x, y, z]);

/** Cutter along X (through the end walls). */
const holeX = (r: number, len: number, x: number, y: number, z: number): Solid =>
  Manifold.cylinder(len, r, r, SEGMENTS, true).rotate([0, 90, 0]).translate([x, y, z]);

/**
 * Boutique fuzz pedal enclosure, 125B-style footprint: 122 × 66 × 39.5 mm,
 * 2.5 mm walls, rounded vertical corners and top edges, open flat bottom at
 * z = 0. Footswitch + two pots on top, in/out jacks on the long sides, DC
 * jack on the top end, four M3 corner bosses inside for the bottom plate.
 */
function pedalEnclosure(): Solid {
  const L = 122, W = 66, H = 39.5, WALL = 2.5, R = 4;
  const cx = L / 2 - R, cy = W / 2 - R;
  const corners = [[cx, cy], [-cx, cy], [cx, -cy], [-cx, -cy]] as const;

  // Rounded top edges (spheres) over straight rounded-corner sides (cylinders), flat bottom.
  const outer = Manifold.hull(
    corners.flatMap(([x, y]) => [
      Manifold.sphere(R, SEGMENTS).translate([x, y, H - R]),
      Manifold.cylinder(1, R, R, SEGMENTS).translate([x, y, 0]),
    ]),
  );
  const cavityTop = H - WALL;
  let body = outer.subtract(box(-L / 2 + WALL, L / 2 - WALL, -W / 2 + WALL, W / 2 - WALL, -1, cavityTop));

  const bx = L / 2 - WALL - 4, by = W / 2 - WALL - 4;
  const bosses = [[bx, by], [-bx, by], [bx, -by], [-bx, -by]] as const;
  body = Manifold.union([body, ...bosses.map(([x, y]) => Manifold.cylinder(cavityTop + 0.5, 3.5, 3.5, SEGMENTS).translate([x, y, 0]))]);

  return body.subtract(
    Manifold.union([
      ...bosses.map(([x, y]) => holeZ(1.25, 24, x, y, 0)), // M3 pilot holes, 12 mm deep
      holeZ(6, 10, -32, 0, H), // 12 mm footswitch
      holeZ(3.75, 10, 30, -14, H), // 7.5 mm pots
      holeZ(3.75, 10, 30, 14, H),
      holeY(4.75, 10, 18, W / 2, 22), // 9.5 mm input jack
      holeY(4.75, 10, 18, -W / 2, 22), // 9.5 mm output jack
      holeX(6, 10, L / 2, 0, 26), // 12 mm DC jack on the top end
    ]),
  );
}

/**
 * Wall-mount bracket for an e-bike charger, drawn the way a molded part
 * would be: 80 mm wide 3 mm L-section (60 mm base, 50 mm upright), two
 * triangular gussets, four mounting holes. The gussets are what make it a
 * molded part; a formed sheet-metal bracket with a stiffening bead does the
 * same job without a mold.
 */
function chargerBracket(): Solid {
  const WIDTH = 80, BASE = 60, UP = 50, T = 3, GUSSET = 30;
  const base = box(-WIDTH / 2, WIDTH / 2, 0, BASE, 0, T);
  const upright = box(-WIDTH / 2, WIDTH / 2, 0, T, 0, UP);

  // Triangular prism in the inside corner: hull of its six corner points.
  const gusset = (x0: number) =>
    Manifold.hull(
      [x0, x0 + T].flatMap((x): [number, number, number][] => [
        [x, T - 0.01, T - 0.01],
        [x, T + GUSSET, T - 0.01],
        [x, T - 0.01, T + GUSSET],
      ]),
    );

  const body = Manifold.union([base, upright, gusset(-26 - T / 2), gusset(26 - T / 2)]);
  return body.subtract(
    Manifold.union([
      holeZ(3.25, 10, -25, 42, T / 2), // 6.5 mm wall-mount holes in the base
      holeZ(3.25, 10, 25, 42, T / 2),
      holeY(2.25, 10, -25, T / 2, 38), // 4.5 mm charger screws in the upright
      holeY(2.25, 10, 25, T / 2, 38),
    ]),
  );
}

function toTriangles(solid: Solid): Triangle[] {
  const mesh = solid.getMesh();
  const { numProp, vertProperties: v, triVerts: t } = mesh;
  const vert = (i: number): Vec3 => [v[i * numProp], v[i * numProp + 1], v[i * numProp + 2]];
  const tris: Triangle[] = [];
  for (let i = 0; i < t.length; i += 3) tris.push([vert(t[i]), vert(t[i + 1]), vert(t[i + 2])]);
  return tris;
}

function writeStl(solid: Solid, file: string): void {
  writeFileSync(file, new Uint8Array(toBinaryStl(toTriangles(solid))));
  console.log(`wrote ${file} (${solid.numTri()} triangles, genus ${solid.genus()})`);
}

writeStl(pedalEnclosure(), "demo/pedal-enclosure.stl");
writeStl(chargerBracket(), "demo/charger-bracket.stl");
