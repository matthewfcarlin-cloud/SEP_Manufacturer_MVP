import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createProject, getProject, listProjects, readProjectFile } from "./projectStore";
import type { GeometryStats } from "./types";

const geometry: GeometryStats = {
  boundingBoxMm: { x: 10, y: 10, z: 10 },
  volumeCm3: 1,
  surfaceAreaCm2: 6,
  triangleCount: 12,
  isWatertight: true,
  thinWallWarning: false,
};

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "idlefit-test-"));
  process.env.IDLEFIT_DATA_DIR = dir;
});
afterAll(async () => {
  delete process.env.IDLEFIT_DATA_DIR;
  await rm(dir, { recursive: true, force: true });
});

describe("projectStore", () => {
  test("round-trips a project and its files", async () => {
    const stl = new Uint8Array([1, 2, 3]);
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 9]);
    const created = await createProject({
      fields: { name: "Bracket", notes: "", targetQuantity: 50, materialHints: [] },
      stl,
      geometry,
      images: [{ type: "jpg", bytes: jpg }],
    });

    expect(created.id).toMatch(/^[A-Za-z0-9_-]{10}$/);
    expect(created.cadFileUrl).toBe(`/api/files/${created.id}/model.stl`);
    expect(created.imageUrls).toEqual([`/api/files/${created.id}/image-0.jpg`]);
    expect(created).not.toHaveProperty("budgetUsd");
    expect(await getProject(created.id)).toEqual(created);

    const file = await readProjectFile(created.id, "image-0.jpg");
    expect(file?.contentType).toBe("image/jpeg");
    expect(Array.from(file!.bytes)).toEqual(Array.from(jpg));
  });

  test("returns null for unknown or malformed ids", async () => {
    expect(await getProject("AAAAAAAAAA")).toBeNull();
    expect(await getProject("../../etc")).toBeNull();
  });

  test("refuses file names outside the allowlist", async () => {
    const { id } = await createProject({
      fields: { name: "X", notes: "", targetQuantity: 1, materialHints: [] },
      stl: new Uint8Array([1]),
      geometry,
      images: [],
    });
    expect(await readProjectFile(id, "project.json")).toBeNull();
    expect(await readProjectFile(id, "../model.stl")).toBeNull();
    expect(await readProjectFile(id, "image-0.jpg")).toBeNull(); // not uploaded
    expect(await readProjectFile(id, "model.stl")).not.toBeNull();
  });

  test("lists projects newest first and skips corrupt folders", async () => {
    const fields = { notes: "", targetQuantity: 1, materialHints: [] };
    const older = await createProject({ fields: { ...fields, name: "Older" }, stl: new Uint8Array([1]), geometry, images: [] });
    await new Promise((r) => setTimeout(r, 5));
    const newer = await createProject({ fields: { ...fields, name: "Newer" }, stl: new Uint8Array([1]), geometry, images: [] });
    await mkdir(path.join(dir, "projects", "BROKEN0000"), { recursive: true });
    await writeFile(path.join(dir, "projects", "BROKEN0000", "project.json"), "{not json");

    const ids = (await listProjects()).map((p) => p.id);
    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
    expect(ids).not.toContain("BROKEN0000");
  });
});
