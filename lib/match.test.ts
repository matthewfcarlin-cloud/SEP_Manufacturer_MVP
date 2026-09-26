import { describe, expect, it } from "vitest";
import sampleProject from "@/demo/sample-project.json";
import { matchProject } from "@/lib/match";
import type { Project } from "@/lib/types";

describe("matchProject", () => {
  it("returns up to five sensible matches for the demo pedal", () => {
    const matches = matchProject(sampleProject as Project);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThanOrEqual(5);
    expect(matches).toEqual([...matches].sort((a, b) => b.score - a.score || a.shopId.localeCompare(b.shopId) || a.matchedMachine.model.localeCompare(b.matchedMachine.model)));
    expect(matches.some((match) => match.idleBoost)).toBe(true);
    for (const match of matches) {
      const exceedsEnvelope = (Object.keys(match.matchedMachine.envelopeMm) as ("x" | "y" | "z")[])
        .some((axis) => (sampleProject as Project).geometry!.boundingBoxMm[axis] > match.matchedMachine.envelopeMm[axis]);
      if (exceedsEnvelope) {
        expect(match.requiredTweaks.some((tweak) => tweak.startsWith("Split the part"))).toBe(true);
      } else {
        expect(match.reasons.join(" ")).toContain("fits within");
      }
      expect(match.requiredTweaks.length).toBeGreaterThan(0);
    }
  });

  it("never returns a machine that cannot fit even after a slight split", () => {
    const oversized: Project = {
      ...(sampleProject as Project),
      geometry: { ...(sampleProject as Project).geometry!, boundingBoxMm: { x: 10_000, y: 10_000, z: 10_000 } },
    };
    expect(matchProject(oversized)).toEqual([]);
  });

});
