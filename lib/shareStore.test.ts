import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createProject, getProject } from "./projectStore";
import { resolveShare, rotateShare, setSharing } from "./shareStore";
import type { GeometryStats } from "./types";

const geometry: GeometryStats = { boundingBoxMm: { x: 1, y: 1, z: 1 }, volumeCm3: 1, surfaceAreaCm2: 1, triangleCount: 12, isWatertight: true };
const newProject = () =>
  createProject({ fields: { name: "Shared", notes: "", targetQuantity: 1, materialHints: [] }, stl: new Uint8Array([1]), geometry, images: [], ownerKeyHash: "b".repeat(64) });

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "idlefit-share-"));
  process.env.IDLEFIT_DATA_DIR = dir;
});
afterAll(async () => {
  delete process.env.IDLEFIT_DATA_DIR;
  await rm(dir, { recursive: true, force: true });
});

describe("share links", () => {
  test("projects are not shared until the owner turns it on", async () => {
    const project = await newProject();
    expect(project.share).toBeUndefined();
  });

  test("turning sharing on makes an unguessable link that resolves to the project", async () => {
    const { id } = await newProject();
    const share = await setSharing(id, true);
    expect(share?.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect((await resolveShare(share!.token))?.id).toBe(id);
  });

  test("turning it off stops the link; turning it back on restores the same link", async () => {
    const { id } = await newProject();
    const on = await setSharing(id, true);
    await setSharing(id, false);
    expect(await resolveShare(on!.token)).toBeNull();
    const again = await setSharing(id, true);
    expect(again?.token).toBe(on!.token);
    expect((await resolveShare(on!.token))?.id).toBe(id);
  });

  test("rotating revokes the old link and issues a new one", async () => {
    const { id } = await newProject();
    const old = await setSharing(id, true);
    const fresh = await rotateShare(id);
    expect(fresh?.token).not.toBe(old!.token);
    expect(await resolveShare(old!.token)).toBeNull();
    expect((await resolveShare(fresh!.token))?.id).toBe(id);
    expect((await getProject(id))?.share?.token).toBe(fresh!.token);
  });

  test("malformed and unknown tokens resolve to nothing", async () => {
    expect(await resolveShare("../../etc/passwd")).toBeNull();
    expect(await resolveShare("A".repeat(22))).toBeNull();
  });
});
