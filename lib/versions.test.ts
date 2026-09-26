import { describe, expect, test } from "vitest";
import type { Project, ProjectVersion } from "./types";
import {
  appendVersion,
  getVersion,
  latestAnalyzedVersion,
  latestVersion,
  nextVersionNumber,
  parseVersionParam,
  replaceVersion,
  versionFileName,
} from "./versions";

const version = (number: number, extra: Partial<ProjectVersion> = {}): ProjectVersion => ({
  number,
  createdAt: new Date(2026, 0, number).toISOString(),
  notes: `v${number}`,
  targetQuantity: 100,
  imageUrls: [],
  ...extra,
});

const project: Project = {
  id: "abcdefghij",
  name: "Bracket",
  createdAt: new Date(2026, 0, 1).toISOString(),
  versions: [version(1), version(3)], // v2 was deleted
};

describe("versions", () => {
  test("latestVersion is the highest number", () => {
    expect(latestVersion(project).number).toBe(3);
  });

  test("latestAnalyzedVersion skips newer versions that aren't analyzed yet", () => {
    const analysis = {} as NonNullable<ProjectVersion["analysis"]>;
    const withAnalysis = { ...project, versions: [version(1, { analysis }), version(3)] };
    expect(latestAnalyzedVersion(withAnalysis)?.number).toBe(1);
    expect(latestAnalyzedVersion(project)).toBeUndefined();
  });

  test("getVersion finds by number, not by index", () => {
    expect(getVersion(project, 3)?.notes).toBe("v3");
    expect(getVersion(project, 2)).toBeUndefined();
  });

  test("nextVersionNumber never reuses a deleted number", () => {
    expect(nextVersionNumber(project)).toBe(4);
  });

  test("appendVersion returns a new project and leaves the original alone", () => {
    const next = appendVersion(project, version(4));
    expect(next.versions.map((v) => v.number)).toEqual([1, 3, 4]);
    expect(project.versions).toHaveLength(2);
  });

  test("replaceVersion swaps one version immutably", () => {
    const next = replaceVersion(project, { ...version(1), notes: "edited" });
    expect(getVersion(next, 1)?.notes).toBe("edited");
    expect(getVersion(project, 1)?.notes).toBe("v1");
    expect(() => replaceVersion(project, version(9))).toThrow(/no version 9/);
  });

  test("version 1 keeps legacy file names; later versions are prefixed", () => {
    expect(versionFileName(1, "model.stl")).toBe("model.stl");
    expect(versionFileName(2, "image-0.jpg")).toBe("v2-image-0.jpg");
  });

  test("parseVersionParam accepts only positive integers", () => {
    expect(parseVersionParam("2")).toBe(2);
    expect(parseVersionParam(["3", "4"])).toBe(3);
    expect(parseVersionParam(undefined)).toBeNull();
    expect(parseVersionParam("0")).toBeNull();
    expect(parseVersionParam("1.5")).toBeNull();
    expect(parseVersionParam("abc")).toBeNull();
  });
});
