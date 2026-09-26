import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { DEMO_PROJECTS } from "./demoProjects";
import { projectSchema } from "./schemas";

// The seeded demo projects (and Codex's branches) build against these files,
// so they must stay valid whenever the shared types change.
describe.each(DEMO_PROJECTS)("demo project $json", (demo) => {
  const raw = JSON.parse(readFileSync(demo.json, "utf8"));

  test("is a valid Project with a real analysis", () => {
    const parsed = projectSchema.safeParse(raw);
    expect(parsed.success, parsed.success ? "" : parsed.error.message).toBe(true);
    expect(raw.analysis.paths.length).toBeGreaterThanOrEqual(2);
  });

  test("matches its manifest entry and points at its own model file", () => {
    expect(raw.id).toBe(demo.id);
    expect(raw.cadFileUrl).toBe(`/api/files/${demo.id}/model.stl`);
  });
});
