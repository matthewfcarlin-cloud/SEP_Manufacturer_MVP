import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { addVersion, createProject, getProject, listProjects, readProjectFile, RenderError, saveVersionRenders, updateVersion } from "./projectStore";
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
    expect(created.versions).toHaveLength(1);
    const [v1] = created.versions;
    expect(v1.number).toBe(1);
    expect(v1.cadFileUrl).toBe(`/api/files/${created.id}/model.stl`);
    expect(v1.imageUrls).toEqual([`/api/files/${created.id}/image-0.jpg`]);
    expect(v1).not.toHaveProperty("budgetUsd");
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

  test("reads a legacy flat project.json as version 1", async () => {
    const legacy = JSON.parse(await readFile("test/fixtures/legacy-project.json", "utf8"));
    await mkdir(path.join(dir, "projects", legacy.id), { recursive: true });
    await writeFile(path.join(dir, "projects", legacy.id, "project.json"), JSON.stringify(legacy));

    const project = await getProject(legacy.id);
    expect(project?.versions.map((v) => v.number)).toEqual([1]);
    expect(project?.versions[0].cadFileUrl).toBe(legacy.cadFileUrl);
  });

  test("adds a version with prefixed files and leaves version 1 untouched", async () => {
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 1]);
    const created = await createProject({
      fields: { name: "Bracket", notes: "molded", targetQuantity: 500, materialHints: [] },
      stl: new Uint8Array([1]),
      geometry,
      images: [{ type: "jpg", bytes: jpg }],
    });
    const result = await addVersion(created.id, {
      fields: { notes: "bent", targetQuantity: 500, materialHints: [], changeNote: "Sheet metal" },
      stl: new Uint8Array([2]),
      geometry: { ...geometry, volumeCm3: 2 },
      images: [],
      basedOn: 1,
      keepPhotosFrom: created.versions[0],
    });

    expect(result?.version.number).toBe(2);
    expect(result?.version.cadFileUrl).toBe(`/api/files/${created.id}/v2-model.stl`);
    expect(result?.version.imageUrls).toEqual([`/api/files/${created.id}/v2-image-0.jpg`]);
    expect(result?.version.changeNote).toBe("Sheet metal");
    expect(Array.from((await readProjectFile(created.id, "v2-model.stl"))!.bytes)).toEqual([2]);
    expect(Array.from((await readProjectFile(created.id, "v2-image-0.jpg"))!.bytes)).toEqual(Array.from(jpg));

    const saved = await getProject(created.id);
    expect(saved?.versions[0]).toEqual(created.versions[0]);
    expect(Array.from((await readProjectFile(created.id, "model.stl"))!.bytes)).toEqual([1]);
  });

  test("returns null when adding a version to a missing project", async () => {
    const result = await addVersion("AAAAAAAAAA", {
      fields: { notes: "", targetQuantity: 1, materialHints: [], changeNote: "x" },
      stl: new Uint8Array([1]),
      geometry,
      images: [],
      basedOn: 1,
    });
    expect(result).toBeNull();
  });

  test("a slow update doesn't overwrite a version added while it ran", async () => {
    const created = await createProject({
      fields: { name: "Race", notes: "", targetQuantity: 1, materialHints: [] },
      stl: new Uint8Array([1]),
      geometry,
      images: [],
    });
    // Mimics /api/analyze: a long-running update to v1 while v2 is being added.
    const slowUpdate = updateVersion(created.id, 1, (v) => ({ ...v, notes: "analyzed" }));
    const add = addVersion(created.id, {
      fields: { notes: "", targetQuantity: 1, materialHints: [], changeNote: "v2" },
      stl: new Uint8Array([2]),
      geometry,
      images: [],
      basedOn: 1,
    });
    await Promise.all([slowUpdate, add]);

    const saved = await getProject(created.id);
    expect(saved?.versions.map((v) => v.number)).toEqual([1, 2]);
    expect(saved?.versions[0].notes).toBe("analyzed");
  });

  test("updateVersion returns null for a missing version", async () => {
    const created = await createProject({
      fields: { name: "X", notes: "", targetQuantity: 1, materialHints: [] },
      stl: new Uint8Array([1]),
      geometry,
      images: [],
    });
    expect(await updateVersion(created.id, 7, (v) => v)).toBeNull();
  });

  test("saves four PNG renders per version with cache-busting URLs", async () => {
    const created = await createProject({ fields: { name: "R", notes: "", targetQuantity: 1, materialHints: [] }, stl: new Uint8Array([1]), geometry, images: [] });
    const png = (n: number) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, n]);
    const version = await saveVersionRenders(created.id, 1, [png(0), png(1), png(2), png(3)]);

    expect(version?.renders).toHaveLength(4);
    expect(version?.renders?.[2]).toMatch(new RegExp(`^/api/files/${created.id}/render-2\\.png\\?v=\\d+$`));
    expect(Array.from((await readProjectFile(created.id, "render-3.png"))!.bytes)).toEqual(Array.from(png(3)));
    expect((await readProjectFile(created.id, "render-3.png"))!.contentType).toBe("image/png");
    expect((await getProject(created.id))?.versions[0].renders).toEqual(version?.renders);
  });

  test("refuses renders that aren't four PNGs, and unknown versions", async () => {
    const created = await createProject({ fields: { name: "R", notes: "", targetQuantity: 1, materialHints: [] }, stl: new Uint8Array([1]), geometry, images: [] });
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await expect(saveVersionRenders(created.id, 1, [png])).rejects.toThrow(RenderError);
    await expect(saveVersionRenders(created.id, 1, [png, png, png, new Uint8Array([0xff, 0xd8, 0xff])])).rejects.toThrow(/PNG/);
    expect(await saveVersionRenders(created.id, 9, [png, png, png, png])).toBeNull();
    expect(await readProjectFile(created.id, "v9-render-0.png")).toBeNull();
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
