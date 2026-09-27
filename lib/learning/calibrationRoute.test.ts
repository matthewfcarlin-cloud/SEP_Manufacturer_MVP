import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { Project } from "../types";

// B3 done-when: entering real quotes shifts displayed ranges.

const ME = "3".repeat(64);
vi.mock("@/lib/access", async () => {
  const { getProject } = await import("@/lib/projectStore");
  const access = async (id: string) => {
    const project = await getProject(id);
    return project && project.owner?.keyHash === ME ? { project, access: "owner" as const } : null;
  };
  return { currentOwnerHash: async () => ME, getAccessibleProject: access, requireOwner: async (id: string) => (await access(id))?.project ?? Response.json({}, { status: 404 }) };
});

const calibrationRoute = await import("@/app/api/calibration/route");
const outcomesRoute = await import("@/app/api/outcomes/route");
const learningRoute = await import("@/app/api/projects/[id]/learning/route");
const { resetLearningLimits } = await import("./limits");

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "idlefit-b3-"));
  process.env.IDLEFIT_DATA_DIR = dir;
});
afterAll(async () => {
  delete process.env.IDLEFIT_DATA_DIR;
  await rm(dir, { recursive: true, force: true });
});
beforeEach(async () => {
  await rm(path.join(dir, "projects"), { recursive: true, force: true });
  const sample = JSON.parse(await readFile("demo/sample-project.json", "utf8")) as Project;
  const project: Project = { ...sample, id: "Calib00001", isExample: undefined, owner: { keyHash: ME }, learning: { contribute: true, updatedAt: "2026-09-27T00:00:00.000Z" } };
  await mkdir(path.join(dir, "projects", project.id), { recursive: true });
  await writeFile(path.join(dir, "projects", project.id, "project.json"), JSON.stringify(project));
  resetLearningLimits();
});

const json = (url: string, body: unknown, method = "POST") => new Request(`http://localhost${url}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const cnc = async () => {
  const res = await calibrationRoute.GET(new Request("http://localhost/api/calibration?projectId=Calib00001&version=1"));
  expect(res.status).toBe(200);
  return (await res.json()).data.paths.find((p: { process: string }) => p.process === "cnc_milling").unitCostUsd;
};

describe("GET /api/calibration", () => {
  test("with no real quotes, costs are shown as they are, labeled uncalibrated", async () => {
    expect(await cnc()).toMatchObject({ factor: 1, n: 0, label: "Uncalibrated estimate" });
  });

  test("real quotes below the estimate pull the displayed range down, and it says how many", async () => {
    const before = await cnc();
    for (let i = 0; i < 5; i++) {
      const res = await outcomesRoute.POST(json("/api/outcomes", { projectId: "Calib00001", version: 1, kind: "real_quote", process: "cnc_milling", quantity: 250, actualUsd: 24 }));
      expect(res.status).toBe(201);
    }
    const after = await cnc();
    expect(after.n).toBe(5);
    expect(after.label).toBe("Calibrated from 5 real quotes");
    expect(after.factor).toBeLessThan(1);
    expect(after.low).toBeLessThan(before.low);
    expect(after.high).toBeLessThan(before.high);
  });

  test("demo rows never calibrate, even on a contributing product", async () => {
    const demo = { id: "d1", projectId: "Calib00001", version: 1, kind: "real_quote", process: "cnc_milling", quantity: 250, estimateUsd: { low: 36, high: 60 }, actualUsd: 20, source: "demo", createdAt: "2026-09-27T00:00:00.000Z" };
    await writeFile(path.join(dir, "projects", "Calib00001", "outcomes.jsonl"), `${JSON.stringify(demo)}\n`);
    expect(await cnc()).toMatchObject({ n: 0, factor: 1 });
  });

  test("opting out removes the product's quotes from calibration at once", async () => {
    await outcomesRoute.POST(json("/api/outcomes", { projectId: "Calib00001", version: 1, kind: "real_quote", process: "cnc_milling", quantity: 250, actualUsd: 24 }));
    await learningRoute.PUT(json("/api/projects/Calib00001/learning", { contribute: false }, "PUT"), { params: Promise.resolve({ id: "Calib00001" }) } as never);
    expect(await cnc()).toMatchObject({ n: 0, factor: 1 });
  });
});
