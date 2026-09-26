import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { migrateProject } from "./projectMigration";
import { projectSchema } from "./schemas";

// A real pre-Phase-6 project.json (the bracket demo as it was saved), kept so
// the migration path stays covered after the demo files move to the new shape.
const legacy = JSON.parse(readFileSync("test/fixtures/legacy-project.json", "utf8"));

describe("migrateProject", () => {
  test("turns a flat legacy project into a valid project with one version", () => {
    const migrated = projectSchema.parse(migrateProject(legacy));
    expect(migrated.id).toBe(legacy.id);
    expect(migrated.name).toBe(legacy.name);
    expect(migrated.versions).toHaveLength(1);
    const [v1] = migrated.versions;
    expect(v1.number).toBe(1);
    expect(v1.createdAt).toBe(legacy.createdAt);
    expect(v1.notes).toBe(legacy.notes);
    expect(v1.targetQuantity).toBe(legacy.targetQuantity);
    expect(v1.analysis).toEqual(legacy.analysis);
  });

  test("keeps v1's file URLs exactly as they were", () => {
    const [v1] = projectSchema.parse(migrateProject(legacy)).versions;
    expect(v1.cadFileUrl).toBe(legacy.cadFileUrl);
    expect(v1.imageUrls).toEqual(legacy.imageUrls);
  });

  test("leaves no version fields behind at the top level", () => {
    const migrated = migrateProject(legacy) as Record<string, unknown>;
    expect(Object.keys(migrated).sort()).toEqual(["createdAt", "id", "name", "versions"]);
  });

  test("returns an already-versioned project unchanged", () => {
    const migrated = migrateProject(legacy);
    expect(migrateProject(migrated)).toBe(migrated);
  });

  test("does not mutate its input", () => {
    const copy = structuredClone(legacy);
    migrateProject(copy);
    expect(copy).toEqual(legacy);
  });

  test("passes non-objects through for the schema to reject", () => {
    expect(migrateProject(null)).toBeNull();
    expect(migrateProject("x")).toBe("x");
  });
});
