import { describe, expect, it } from "vitest";
import sampleProject from "@/demo/sample-project.json";
import { matchVersion } from "@/lib/match";
import type { Project, ProjectVersion } from "@/lib/types";

const sample: ProjectVersion = (sampleProject as Project).versions[0];

describe("matchVersion", () => {
  it("returns up to five sensible matches for the demo pedal", () => {
    const matches = matchVersion(sample);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThanOrEqual(5);
    expect(matches).toEqual([...matches].sort((a, b) => b.score - a.score || a.shopId.localeCompare(b.shopId) || a.matchedMachine.model.localeCompare(b.matchedMachine.model)));
    expect(matches.some((match) => match.idleBoost)).toBe(true);
    for (const match of matches) {
      const sorted = (d: { x: number; y: number; z: number }) => [d.x, d.y, d.z].sort((a, b) => a - b);
      const part = sorted(sample.geometry!.boundingBoxMm);
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
    const oversized: ProjectVersion = {
      ...sample,
      geometry: { ...sample.geometry!, boundingBoxMm: { x: 10_000, y: 10_000, z: 10_000 } },
    };
    expect(matchVersion(oversized)).toEqual([]);
  });

  it("lists each shop at most once, keeping its best machine", () => {
    // Several print farms own multiple FDM printers, so an FDM path would
    // otherwise let one shop take several of the five slots.
    const printed: ProjectVersion = {
      ...sample,
      targetQuantity: 100,
      analysis: {
        ...sample.analysis!,
        paths: [{ ...sample.analysis!.paths[0], process: "fdm_print", materials: ["PLA"] }],
      },
    };
    const ids = matchVersion(printed).map((m) => m.shopId);
    expect(ids.length).toBe(5);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("lets a part fit when rotated to match the machine envelope", () => {
    // 300 x 20 x 20 mm rod: fits a 320 mm-long Swiss lathe only lengthwise along z.
    const rod: ProjectVersion = {
      ...sample,
      geometry: { ...sample.geometry!, boundingBoxMm: { x: 300, y: 19, z: 19 } },
      analysis: {
        ...sample.analysis!,
        paths: [{ ...sample.analysis!.paths[0], process: "cnc_turning", materials: ["Brass 360"] }],
      },
    };
    const swiss = matchVersion(rod).find((m) => m.matchedMachine.model === "Citizen L20 Swiss");
    expect(swiss).toBeDefined();
    expect(swiss!.requiredTweaks.some((t) => t.startsWith("Split the part"))).toBe(false);
  });

  it("only marks the split as required; the design tweak is a suggestion", () => {
    for (const match of matchVersion(sample)) {
      expect(match.requiredTweaks.length).toBeLessThanOrEqual(2);
    }
  });

  it("keeps reasons in the order ShopMatches labels them", () => {
    // components/ShopMatches.tsx labels reasons by position:
    // Process, Part size, Material, Order size, Capacity (only when idle).
    const patterns = [/^Process matches/, /^Part (fits|exceeds)/, /^(Material match|No direct material)/, /^Target quantity/, /can start this week/];
    for (const match of matchVersion(sample)) {
      expect(match.reasons.length).toBe(match.idleBoost ? 5 : 4);
      match.reasons.forEach((reason, i) => expect(reason).toMatch(patterns[i]));
    }
  });
});
