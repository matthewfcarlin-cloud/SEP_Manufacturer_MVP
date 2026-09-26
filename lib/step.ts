import { createRequire } from "node:module";
import { toBinaryStl, type Triangle, type Vec3 } from "./meshes";

// Server-only. STEP is converted to an STL at upload time so the viewer,
// geometry analysis, and AI brief all keep working on a single format.
// OpenCascade (via occt-import-js, WASM) does the B-rep triangulation and
// converts the file's units to millimeters.

export class StepParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StepParseError";
  }
}

type OcctMesh = {
  attributes: { position: { array: number[] } };
  index: { array: number[] };
};
type OcctResult = { success: boolean; meshes: OcctMesh[] };
type Occt = { ReadStepFile: (content: Uint8Array, params: object | null) => OcctResult };

const TRIANGULATION = {
  linearUnit: "millimeter",
  // Chordal deviation as a share of the part's size: fine enough that curved
  // surfaces read as curved and volumes stay within a fraction of a percent.
  linearDeflectionType: "bounding_box_ratio",
  linearDeflection: 0.001,
  // ~11° per facet: a 90° fillet gets ~8 segments instead of looking faceted.
  angularDeflection: 0.2,
} as const;

let occtPromise: Promise<Occt> | undefined;
function loadOcct(): Promise<Occt> {
  // CommonJS package that locates its .wasm next to itself; kept out of the
  // bundle via serverExternalPackages in next.config.ts.
  const require = createRequire(import.meta.url);
  occtPromise ??= (require("occt-import-js") as () => Promise<Occt>)();
  return occtPromise;
}

function meshTriangles(mesh: OcctMesh): Triangle[] {
  const p = mesh.attributes.position.array;
  const idx = mesh.index.array;
  const vert = (i: number): Vec3 => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
  const tris: Triangle[] = [];
  for (let i = 0; i + 2 < idx.length; i += 3) tris.push([vert(idx[i]), vert(idx[i + 1]), vert(idx[i + 2])]);
  return tris;
}

/** Triangulates a STEP file into binary STL bytes (millimeters). */
export async function stepToStl(content: Uint8Array): Promise<ArrayBuffer> {
  const occt = await loadOcct();
  let result: OcctResult;
  try {
    result = occt.ReadStepFile(content, TRIANGULATION);
  } catch {
    throw new StepParseError("This file couldn't be read as a STEP file.");
  }
  if (!result.success) throw new StepParseError("This file couldn't be read as a STEP file.");

  const triangles = result.meshes.flatMap(meshTriangles);
  if (triangles.length === 0) throw new StepParseError("This STEP file has no solid geometry in it.");
  return toBinaryStl(triangles);
}
