import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { readUploadedParts } from "./uploadForm";

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
