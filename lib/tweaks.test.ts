import { describe, expect, test } from "vitest";
import legacy from "@/test/fixtures/legacy-project.json";
import { listTweaks, resolveTweak } from "./tweaks";
import type { Analysis, ProjectVersion } from "./types";

const version: ProjectVersion = {
  number: 3,
  createdAt: new Date().toISOString(),
  notes: "",
  targetQuantity: 500,
  imageUrls: [],
  analysis: legacy.analysis as Analysis,
};

describe("tweaks", () => {
  test("lists every tweak across every path", () => {
    const total = version.analysis!.paths.reduce((n, p) => n + p.designTweaks.length, 0);
    expect(listTweaks(version)).toHaveLength(total);
    expect(listTweaks(version)[0].key).toBe("0.0");
  });

  test("resolves a key to the tweak's real text and its version", () => {
    const second = version.analysis!.paths[1];
    expect(resolveTweak(version, "1.0")).toEqual({ fromVersion: 3, process: second.process, ...second.designTweaks[0] });
  });

  test("rejects keys that aren't in the analysis", () => {
    expect(resolveTweak(version, "9.9")).toBeUndefined();
    expect(resolveTweak(version, "0")).toBeUndefined();
    expect(resolveTweak({ ...version, analysis: undefined }, "0.0")).toBeUndefined();
  });
});
