import { describe, expect, test } from "vitest";
import bracket from "@/demo/bracket-project.json";
import sample from "@/demo/sample-project.json";
import { buildIterationStory } from "./iterationStory";
import type { Project } from "./types";

const twoVersions = bracket as Project;

describe("buildIterationStory", () => {
  test("is empty for a single version", () => {
    expect(buildIterationStory(sample as Project)).toEqual([]);
  });

  test("describes each analyzed step with its reason and the measured change", () => {
    const [step] = buildIterationStory(twoVersions);
    expect(step.from).toBe(1);
    expect(step.to).toBe(2);
    expect(step.change).toBe(twoVersions.versions[1].appliedTweak!.change);
    expect(step.summary).toMatch(/^Each one costs 14% less/);
  });

  test("skips versions that aren't analyzed yet, instead of inventing deltas", () => {
    const pending = { ...twoVersions.versions[1], number: 3, analysis: undefined };
    const story = buildIterationStory({ ...twoVersions, versions: [...twoVersions.versions, pending] });
    expect(story.map((s) => s.to)).toEqual([2]);
  });

  test("uses the change note when no AI tweak was applied", () => {
    const [v1, v2] = twoVersions.versions;
    const own = { ...v2, appliedTweak: undefined, changeNote: "Thinner walls" };
    expect(buildIterationStory({ ...twoVersions, versions: [v1, own] })[0].change).toBe("Thinner walls");
  });
});
