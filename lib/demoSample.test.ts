import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { projectSchema } from "./schemas";

// Codex's matching and pitch branches build against this file, so it must
// stay valid whenever the shared types change.
test("demo/sample-project.json is a valid Project with a real analysis", () => {
  const raw = JSON.parse(readFileSync("demo/sample-project.json", "utf8"));
  const parsed = projectSchema.safeParse(raw);
  expect(parsed.success, parsed.success ? "" : parsed.error.message).toBe(true);
  expect(raw.analysis.paths.length).toBeGreaterThanOrEqual(2);
  expect(raw.imageUrls).toEqual([]);
});
