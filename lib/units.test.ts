import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { analyzeStl, scaleStl } from "./geometry";
import { parseStlUnit, scaleWarning } from "./units";

const bracket = () => {
  const bytes = readFileSync("demo/charger-bracket.stl"); // 80 × 60 × 50 mm, 28.085 cm³
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

describe("parseStlUnit", () => {
  test("defaults to millimeters and accepts the listed units", () => {
    expect(parseStlUnit("")).toBe("mm");
    expect(parseStlUnit("in")).toBe("in");
    expect(parseStlUnit("cm")).toBe("cm");
    expect(parseStlUnit("furlongs")).toBeNull();
  });
});

describe("scaleStl", () => {
  test("scales every coordinate, so size scales linearly and volume by the cube", () => {
    const inches = analyzeStl(scaleStl(bracket(), 25.4));
    expect(inches.boundingBoxMm).toEqual({ x: 2032, y: 1524, z: 1270 });
    expect(inches.volumeCm3).toBeCloseTo(28.085 * 25.4 ** 3, -2);
    expect(inches.isWatertight).toBe(true);
    expect(inches.typicalWallMm).toBeCloseTo(3 * 25.4, 0);
  });

  test("a factor of 1 leaves the part unchanged", () => {
    expect(analyzeStl(scaleStl(bracket(), 1))).toEqual(analyzeStl(bracket()));
  });
});

describe("scaleWarning", () => {
  test("flags a part too small to be real, suggesting inches or centimeters", () => {
    expect(scaleWarning({ x: 1.9, y: 1.9, z: 1 })).toMatch(/only 1\.9 mm across.*inches or centimeters/i);
  });

  test("flags a part too big to be real", () => {
    expect(scaleWarning({ x: 5000, y: 300, z: 200 })).toMatch(/5 m across/i);
  });

  test("says nothing for a normal part", () => {
    expect(scaleWarning({ x: 80, y: 60, z: 50 })).toBeNull();
  });
});
