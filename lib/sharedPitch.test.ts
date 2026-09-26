import { describe, expect, test } from "vitest";
import bracket from "@/demo/bracket-project.json";
import { isSharedFile, type SharedPitch } from "./sharedPitch";
import type { Analysis, Project } from "./types";

const project = bracket as Project;
const v2 = project.versions[1];
const shared: SharedPitch = {
  project,
  version: { ...v2, analysis: v2.analysis as Analysis, renders: v2.renders!.map((u) => u.replace(`/api/files/${project.id}/`, "/api/share/TOKEN/")) },
};

describe("isSharedFile", () => {
  test("allows only the pitched version's renders", () => {
    expect(isSharedFile(shared, "v2-render-0.png")).toBe(true);
    expect(isSharedFile(shared, "v2-model.stl")).toBe(false);
    expect(isSharedFile(shared, "model.stl")).toBe(false);
    expect(isSharedFile(shared, "image-0.jpg")).toBe(false);
    expect(isSharedFile(shared, "render-0.png")).toBe(false); // v1's, not pitched
    expect(isSharedFile(shared, "../project.json")).toBe(false);
  });
});
