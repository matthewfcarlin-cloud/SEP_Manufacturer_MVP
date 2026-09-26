import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { analyzeStl } from "./geometry";
import { StepParseError, stepToStl } from "./step";

const fixture = (name: string) => new Uint8Array(readFileSync(`test/fixtures/${name}`));

describe("stepToStl", () => {
  test("a 10 mm STEP cube becomes a watertight 10 mm STL", async () => {
    const stats = analyzeStl(await stepToStl(fixture("cube-10mm.stp")));
    expect(stats.boundingBoxMm).toEqual({ x: 10, y: 10, z: 10 });
    expect(stats.volumeCm3).toBeCloseTo(1, 3);
    expect(stats.isWatertight).toBe(true);
  });

  test("converts files authored in inches to millimeters", async () => {
    // Upstream fixture: a 1 m cube saved with inch units.
    const stats = analyzeStl(await stepToStl(fixture("cube-inch.step")));
    expect(stats.boundingBoxMm.x).toBeCloseTo(1000, 1);
  });

  test("triangulates curved surfaces into a closed mesh", async () => {
    const stats = analyzeStl(await stepToStl(fixture("rounded-cube.step")));
    const { x, y, z } = stats.boundingBoxMm;
    expect(stats.isWatertight).toBe(true);
    expect(stats.triangleCount).toBeGreaterThan(12); // a plain box is 12; fillets add facets
    expect(stats.volumeCm3 * 1000).toBeLessThan(x * y * z); // rounded edges remove material
  });

  test("rejects a file that isn't STEP", async () => {
    await expect(stepToStl(new TextEncoder().encode("not a step file"))).rejects.toBeInstanceOf(StepParseError);
  });
});
