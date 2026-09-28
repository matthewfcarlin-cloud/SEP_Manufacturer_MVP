import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { readProjectParts, readUploadedParts } from "./uploadForm";

const form = (units?: string) => {
  const data = new FormData();
  data.set("stl", new File([readFileSync("demo/charger-bracket.stl")], "bracket.stl"));
  if (units !== undefined) data.set("units", units);
  return data;
};

describe("readUploadedParts units", () => {
  test("reads STL as millimeters by default", async () => {
    const result = await readUploadedParts(form(), "test");
    expect(result.ok && result.data.geometry.boundingBoxMm).toEqual({ x: 80, y: 60, z: 50 });
  });

  test("scales an STL exported in centimeters to millimeters, and stores the scaled file", async () => {
    const result = await readUploadedParts(form("cm"), "test");
    expect(result.ok && result.data.geometry.boundingBoxMm).toEqual({ x: 800, y: 600, z: 500 });
    expect(result.ok && result.data.stl.byteLength).toBeGreaterThan(84); // a real binary STL
  });

  test("rejects an unknown unit", async () => {
    const result = await readUploadedParts(form("furlongs"), "test");
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  test("ignores the unit for STEP files, which carry their own", async () => {
    const data = new FormData();
    data.set("stl", new File([readFileSync("test/fixtures/cube-10mm.stp")], "cube.stp"));
    data.set("units", "in");
    const result = await readUploadedParts(data, "test");
    expect(result.ok && result.data.geometry.boundingBoxMm).toEqual({ x: 10, y: 10, z: 10 });
  });
});

describe("readProjectParts (new products)", () => {
  test("accepts a new product with no 3D file: photos only, no geometry", async () => {
    // Arrange
    const data = new FormData();
    // Act
    const result = await readProjectParts(data, "test");
    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.stl).toBeUndefined();
    expect(result.data.geometry).toBeUndefined();
    expect(result.data.images).toEqual([]);
  });

  test("still measures a 3D file when one is attached", async () => {
    const result = await readProjectParts(form(), "test");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.geometry?.boundingBoxMm.x).toBeGreaterThan(0);
  });

  test("still rejects a file that isn't STL or STEP", async () => {
    const data = new FormData();
    data.set("stl", new File(["hello"], "notes.txt"));
    expect((await readProjectParts(data, "test")).ok).toBe(false);
  });

  test("new versions still require a 3D file", async () => {
    expect((await readUploadedParts(new FormData(), "test")).ok).toBe(false);
  });
});
