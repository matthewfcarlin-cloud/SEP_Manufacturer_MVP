import { describe, expect, test } from "vitest";
import { analyzeStl, StlParseError } from "./geometry";
import { box, openShell, toAsciiStl, toBinaryStl, type Triangle } from "./meshes";

const encoder = new TextEncoder();
const ascii = (tris: Triangle[]) => encoder.encode(toAsciiStl(tris)).buffer as ArrayBuffer;

describe("analyzeStl on a 100 × 50 × 20 mm box", () => {
  const stats = analyzeStl(toBinaryStl(box(100, 50, 20)));

  test("bounding box in mm", () => {
    expect(stats.boundingBoxMm).toEqual({ x: 100, y: 50, z: 20 });
  });

  test("volume in cm³", () => {
    expect(stats.volumeCm3).toBeCloseTo(100, 3); // 100 000 mm³
  });

  test("surface area in cm²", () => {
    // 2(100·50 + 100·20 + 50·20) = 16 000 mm²
    expect(stats.surfaceAreaCm2).toBeCloseTo(160, 3);
  });

  test("triangle count and watertightness", () => {
    expect(stats.triangleCount).toBe(12);
    expect(stats.isWatertight).toBe(true);
  });

  test("no thin-wall warning for a solid block", () => {
    expect(stats.thinWallWarning).toBe(false);
  });
});

describe("analyzeStl on an enclosure shell", () => {
  test("volume is outer minus cavity, and it is watertight", () => {
    // 122 × 66 × 39.5 minus 117 × 61 × 37 = 53 985 mm³
    const stats = analyzeStl(toBinaryStl(openShell(122, 66, 39.5, 2.5)));
    expect(stats.volumeCm3).toBeCloseTo(53.985, 2);
    expect(stats.isWatertight).toBe(true);
    expect(stats.thinWallWarning).toBe(false);
  });

  test("flags walls thinner than 1 mm", () => {
    const stats = analyzeStl(toBinaryStl(openShell(122, 66, 39.5, 0.6)));
    expect(stats.thinWallWarning).toBe(true);
  });
});

describe("analyzeStl input handling", () => {
  test("ASCII and binary STL give the same stats", () => {
    const tris = openShell(80, 40, 30, 2);
    expect(analyzeStl(ascii(tris))).toEqual(analyzeStl(toBinaryStl(tris)));
  });

  test("inverted normals still give a positive volume", () => {
    const flipped = box(10, 10, 10).map(([a, b, c]) => [a, c, b] as Triangle);
    expect(analyzeStl(toBinaryStl(flipped)).volumeCm3).toBeCloseTo(1, 5);
  });

  test("a mesh with a missing face is not watertight", () => {
    const openBox = box(10, 10, 10).slice(2);
    expect(analyzeStl(toBinaryStl(openBox)).isWatertight).toBe(false);
  });

  test("offset geometry reports size, not position", () => {
    const moved = box(10, 20, 30).map(
      (tri) => tri.map(([x, y, z]) => [x + 500, y - 40, z + 7] as const) as unknown as Triangle,
    );
    expect(analyzeStl(toBinaryStl(moved)).boundingBoxMm).toEqual({ x: 10, y: 20, z: 30 });
  });

  test("rejects a file with no triangles", () => {
    expect(() => analyzeStl(toBinaryStl([]))).toThrow(StlParseError);
  });

  test("rejects a file that is not an STL", () => {
    const junk = encoder.encode("definitely not a mesh").buffer as ArrayBuffer;
    expect(() => analyzeStl(junk)).toThrow(StlParseError);
  });
});
