import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { MILESTONE_KEYS } from "../schemas";
import type { Project } from "../types";

// Builds 4 and 5 feed B1: drafting a plan or a listing leaves one event row.

const WS = "c".repeat(64);
const OWN = "OwnBracket";
const EXAMPLE = "ExBracket1";

vi.mock("@/lib/access", async () => {
  const { getProject } = await import("@/lib/projectStore");
  const access = async (id: string) => {
    const project = await getProject(id);
    return project ? { project, access: project.isExample ? ("example" as const) : ("owner" as const) } : null;
  };
  return { currentOwnerHash: async () => WS, getAccessibleProject: access, requireOwner: async (id: string) => (await access(id))?.project };
});
vi.mock("@/lib/usage/gate", () => ({ aiBudgetGate: async () => WS }));
vi.mock("@/lib/analysis/callers", () => ({ isAiConfigured: async () => true, textCaller: () => async () => ({}) }));
vi.mock("@/lib/analysis/plan", () => ({
  buildPlanBrief: () => "brief",
  runPlanDraft: async () => ({
    milestones: MILESTONE_KEYS.map((key) => ({ key, title: key, durationDays: 10, budgetLowUsd: 100, budgetHighUsd: 200, note: "n" })),
    warnings: [],
  }),
}));
vi.mock("@/lib/analysis/listing", () => ({
  buildListingBrief: () => "brief",
  runListingDraft: async () => ({ title: "Bracket", description: "A bracket.", tags: Array.from({ length: 13 }, (_, i) => `tag${i}`) }),
}));

const planRoute = await import("@/app/api/plan/route");
const listingRoute = await import("@/app/api/listing/route");
const { listEvents } = await import("@/lib/db/learningStore");

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "moko-generated-"));
  process.env.IDLEFIT_DATA_DIR = dir;
});
afterAll(async () => {
  delete process.env.IDLEFIT_DATA_DIR;
  await rm(dir, { recursive: true, force: true });
});

async function install(id: string, isExample: boolean) {
  const bracket = JSON.parse(await readFile("demo/bracket-project.json", "utf8")) as Project;
  const project: Project = { ...bracket, id, ...(isExample ? { isExample: true } : { isExample: undefined, owner: { keyHash: WS } }) };
  await mkdir(path.join(dir, "projects", id), { recursive: true });
  await writeFile(path.join(dir, "projects", id, "project.json"), JSON.stringify(project));
}

const post = (projectId: string) =>
  new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) });

beforeEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await install(OWN, false);
  await install(EXAMPLE, true);
});

describe("generated events", () => {
  test.each([
    ["plan_generated", planRoute],
    ["listing_generated", listingRoute],
  ] as const)("%s is logged once, as real data on the creator's own product", async (type, route) => {
    const res = await route.POST(post(OWN));
    expect(res.status).toBe(201);
    const events = await listEvents(OWN);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type, projectId: OWN, version: 2, source: "real", payload: {} });
  });

  test("on a shared example the event is marked demo", async () => {
    await planRoute.POST(post(EXAMPLE));
    const [event] = await listEvents(EXAMPLE);
    expect(event).toMatchObject({ type: "plan_generated", source: "demo" });
  });
});
