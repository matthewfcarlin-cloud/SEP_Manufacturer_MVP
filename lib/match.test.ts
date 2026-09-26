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
      const sorted = (d: { x: number; y: number; z: number }) => [d.x, d.y, d.z].sort((a, b) => a - b);
      const part = sorted((sampleProject as Project).geometry!.boundingBoxMm);
      const machine = sorted(match.matchedMachine.envelopeMm);
      const exceedsEnvelope = part.some((dim, i) => dim > machine[i]);
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

  it("lists each shop at most once, keeping its best machine", () => {
    // Several print farms own multiple FDM printers, so an FDM path would
    // otherwise let one shop take several of the five slots.
    const printed: Project = {
      ...(sampleProject as Project),
      targetQuantity: 100,
      analysis: {
        ...(sampleProject as Project).analysis!,
        paths: [{ ...(sampleProject as Project).analysis!.paths[0], process: "fdm_print", materials: ["PLA"] }],
      },
    };
    const ids = matchProject(printed).map((m) => m.shopId);
    expect(ids.length).toBe(5);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("lets a part fit when rotated to match the machine envelope", () => {
    // 300 x 20 x 20 mm rod: fits a 320 mm-long Swiss lathe only lengthwise along z.
    const rod: Project = {
      ...(sampleProject as Project),
      geometry: { ...(sampleProject as Project).geometry!, boundingBoxMm: { x: 300, y: 19, z: 19 } },
      analysis: {
        ...(sampleProject as Project).analysis!,
        paths: [{ ...(sampleProject as Project).analysis!.paths[0], process: "cnc_turning", materials: ["Brass 360"] }],
      },
    };
    const swiss = matchProject(rod).find((m) => m.matchedMachine.model === "Citizen L20 Swiss");
    expect(swiss).toBeDefined();
    expect(swiss!.requiredTweaks.some((t) => t.startsWith("Split the part"))).toBe(false);
  });

  it("only marks the split as required; the design tweak is a suggestion", () => {
    for (const match of matchProject(sampleProject as Project)) {
      expect(match.requiredTweaks.length).toBeLessThanOrEqual(2);
    }
  });
});
