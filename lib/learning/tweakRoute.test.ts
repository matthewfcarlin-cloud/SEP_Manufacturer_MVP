import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { Project, TweakCategory } from "../types";

// B4 done-when: tweaks re-order by what actually worked.

const ME = "5".repeat(64);
vi.mock("@/lib/access", async () => {
  const { getProject } = await import("@/lib/projectStore");
  const access = async (id: string) => {
    const project = await getProject(id);
    return project && project.owner?.keyHash === ME ? { project, access: "owner" as const } : null;
  };
  return { currentOwnerHash: async () => ME, getAccessibleProject: access, requireOwner: async (id: string) => (await access(id))?.project ?? Response.json({}, { status: 404 }) };
});

const rankingRoute = await import("@/app/api/tweak-ranking/route");
const eventsRoute = await import("@/app/api/events/route");
const { resetLearningLimits } = await import("./limits");

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "idlefit-b4-"));
  process.env.IDLEFIT_DATA_DIR = dir;
});
afterAll(async () => {
  delete process.env.IDLEFIT_DATA_DIR;
  await rm(dir, { recursive: true, force: true });
});
beforeEach(async () => {
  await rm(path.join(dir, "projects"), { recursive: true, force: true });
  const sample = JSON.parse(await readFile("demo/sample-project.json", "utf8")) as Project;
  const categories: TweakCategory[] = ["add_draft", "split_part", "loosen_tolerances"];
  const project: Project = {
    ...sample,
    id: "Tweak00001",
    isExample: undefined,
    owner: { keyHash: ME },
    learning: { contribute: true, updatedAt: "2026-09-27T00:00:00.000Z" },
    versions: sample.versions.map((v) => ({
      ...v,
      analysis: v.analysis && { ...v.analysis, paths: v.analysis.paths.map((p) => ({ ...p, designTweaks: p.designTweaks.map((t, i) => ({ ...t, category: categories[i % 3] })) })) },
    })),
  };
  await mkdir(path.join(dir, "projects", project.id), { recursive: true });
  await writeFile(path.join(dir, "projects", project.id, "project.json"), JSON.stringify(project));
  resetLearningLimits();
});

const firstPathOrder = async () => {
  const res = await rankingRoute.GET(new Request("http://localhost/api/tweak-ranking?projectId=Tweak00001&version=1"));
  expect(res.status).toBe(200);
  return (await res.json()).data.paths[0].tweaks.map((t: { index: number }) => t.index);
};

describe("GET /api/tweak-ranking", () => {
  test("with no results, the AI's order stands; 👍 on a later tweak moves it to the top", async () => {
    expect(await firstPathOrder()).toEqual([0, 1, 2]);
    const res = await eventsRoute.POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: [{ projectId: "Tweak00001", version: 1, type: "tweak_rated", payload: { tweak: "0.2", rating: "up" } }] }),
      }),
    );
    expect((await res.json()).data.accepted).toBe(1);
    expect(await firstPathOrder()).toEqual([2, 0, 1]);
  });
});
