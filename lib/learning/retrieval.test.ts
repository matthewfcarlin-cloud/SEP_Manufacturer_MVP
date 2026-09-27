import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { AgentMessage, Outcome, Project } from "../types";

// B2 done-when: analysis (and the agent) cite similar real products when
// they exist, and only from products whose owners opted in.

const ME = "1".repeat(64);
const THEM = "2".repeat(64);
const current = vi.hoisted(() => ({ owner: "1".repeat(64) }));

vi.mock("@/lib/access", async () => {
  const { getProject } = await import("@/lib/projectStore");
  const access = async (id: string) => {
    const project = await getProject(id);
    if (!project) return null;
    if (project.isExample) return { project, access: "example" as const };
    return project.owner?.keyHash === current.owner ? { project, access: "owner" as const } : null;
  };
  return {
    currentOwnerHash: async () => current.owner,
    getAccessibleProject: access,
    requireOwner: async (id: string) => {
      const found = await access(id);
      return found?.access === "owner" ? found.project : Response.json({ success: false }, { status: 404 });
    },
  };
});

const captured = vi.hoisted(() => ({ analysis: [] as { text: string; context?: string }[], agent: [] as string[] }));
vi.mock("@/lib/analysis/callers", async () => {
  const { sampleAnalysis } = await import("@/lib/analysis/fixtures");
  return {
    isAiConfigured: async () => true,
    analysisCaller: () => async (input: { text: string; context?: string }) => {
      captured.analysis.push(input);
      return { stopReason: "end_turn", output: { ...sampleAnalysis(), category: "enclosure" } };
    },
    streamAgentReply: async function* (input: { context: string; messages: AgentMessage[] }) {
      captured.agent.push(input.context);
      yield { type: "final", stopReason: "end_turn" };
    },
  };
});

const { similarProductsFor } = await import("./retrieval");
const learningRoute = await import("@/app/api/projects/[id]/learning/route");
const recomputeRoute = await import("@/app/api/learning/recompute/route");
const analyzeRoute = await import("@/app/api/analyze/route");
const agentRoute = await import("@/app/api/agent/route");
const projectRoute = await import("@/app/api/projects/[id]/route");
const { getProject } = await import("@/lib/projectStore");
const { buildProjectBrief } = await import("@/lib/analysis/prompt");

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "idlefit-b2-"));
  process.env.IDLEFIT_DATA_DIR = dir;
});
afterAll(async () => {
  delete process.env.IDLEFIT_DATA_DIR;
  await rm(dir, { recursive: true, force: true });
});

async function install(id: string, owner: string | null, contribute: boolean | undefined, outcomes: Outcome[] = []) {
  const sample = JSON.parse(await readFile("demo/sample-project.json", "utf8")) as Project;
  const project: Project = {
    ...sample,
    id,
    name: `Name of ${id}`,
    ...(owner ? { isExample: undefined, owner: { keyHash: owner } } : { isExample: true }),
    ...(contribute !== undefined && { learning: { contribute, updatedAt: "2026-09-27T00:00:00.000Z" } }),
    versions: sample.versions.map((v) => ({ ...v, analysis: v.analysis && { ...v.analysis, category: "enclosure" as const } })),
  };
  const folder = path.join(dir, "projects", id);
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, "project.json"), JSON.stringify(project));
  if (outcomes.length) await writeFile(path.join(folder, "outcomes.jsonl"), outcomes.map((o) => `${JSON.stringify(o)}\n`).join(""));
}

const realQuote = (projectId: string): Outcome => ({
  id: "q1", projectId, version: 1, kind: "real_quote", process: "cnc_milling", quantity: 250,
  estimateUsd: { low: 36, high: 60 }, actualUsd: 41.5, source: "real", createdAt: "2026-09-27T00:00:00.000Z",
});

const json = (url: string, body: unknown, method = "POST") =>
  new Request(`http://localhost${url}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const params = <T extends object>(p: T) => ({ params: Promise.resolve(p) }) as never;

beforeEach(async () => {
  await rm(path.join(dir, "projects"), { recursive: true, force: true });
  await install("MyProduct1", ME, undefined);
  await install("Sharing001", THEM, true, [realQuote("Sharing001")]);
  await install("Private001", THEM, false);
  await install("NoChoice01", THEM, undefined);
  await install("Example001", null, true);
  current.owner = ME;
  captured.analysis = [];
  captured.agent = [];
});

async function mine() {
  const project = (await getProject("MyProduct1"))!;
  return { project, version: project.versions[0] };
}

describe("similarProductsFor", () => {
  test("cites only products whose owners opted in: not private ones, not examples, not my own", async () => {
    const { project, version } = await mine();
    const block = await similarProductsFor(project, version);
    expect(block).toContain("1 real supplier quote: median $41.50/unit at 250 units");
    expect(block!.match(/^- /gm)).toHaveLength(1);
    expect(block).not.toMatch(/Name of|Sharing001|Private001|Example001/);
  });

  test("nothing to cite means no block", async () => {
    await rm(path.join(dir, "projects", "Sharing001"), { recursive: true });
    const { project, version } = await mine();
    expect(await similarProductsFor(project, version)).toBeNull();
  });
});

describe("PUT /api/projects/[id]/learning", () => {
  test("the owner can opt out, and it takes effect on the very next prompt", async () => {
    current.owner = THEM;
    const res = await learningRoute.PUT(json("/api/projects/Sharing001/learning", { contribute: false }, "PUT"), params({ id: "Sharing001" }));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ learning: { contribute: false, updatedAt: expect.any(String) } });
    current.owner = ME;
    const { project, version } = await mine();
    expect(await similarProductsFor(project, version)).toBeNull();
  });

  test("the owner can opt in", async () => {
    current.owner = THEM;
    await learningRoute.PUT(json("/api/projects/Private001/learning", { contribute: true }, "PUT"), params({ id: "Private001" }));
    current.owner = ME;
    const { project, version } = await mine();
    expect((await similarProductsFor(project, version))!.match(/^- /gm)).toHaveLength(2);
  });

  test("only the owner can change it; examples and other creators' products are 404", async () => {
    expect((await learningRoute.PUT(json("/api/projects/Sharing001/learning", { contribute: false }, "PUT"), params({ id: "Sharing001" }))).status).toBe(404);
    expect((await learningRoute.PUT(json("/api/projects/Example001/learning", { contribute: true }, "PUT"), params({ id: "Example001" }))).status).toBe(404);
    expect((await getProject("Sharing001"))!.learning?.contribute).toBe(true);
  });

  test("needs a JSON body with a boolean", async () => {
    const text = new Request("http://localhost/api/projects/MyProduct1/learning", { method: "PUT", headers: { "Content-Type": "text/plain" }, body: "{}" });
    expect((await learningRoute.PUT(text, params({ id: "MyProduct1" }))).status).toBe(415);
    expect((await learningRoute.PUT(json("/api/projects/MyProduct1/learning", { contribute: "yes" }, "PUT"), params({ id: "MyProduct1" }))).status).toBe(400);
  });
});

describe("deleting a contributing product", () => {
  test("removes it from everyone's similar products at once", async () => {
    current.owner = THEM;
    const res = await projectRoute.DELETE(new Request("http://localhost/api/projects/Sharing001", { method: "DELETE" }), params({ id: "Sharing001" }));
    expect(res.status).toBe(200);
    current.owner = ME;
    const { project, version } = await mine();
    expect(await similarProductsFor(project, version)).toBeNull();
  });
});

describe("prompts", () => {
  test("analysis gets the similar products as separate context, leaving the brief (and 'What the AI sees') unchanged", async () => {
    const res = await analyzeRoute.POST(json("/api/analyze", { projectId: "MyProduct1", version: 1 }));
    expect(res.status).toBe(200);
    const { project, version } = await mine();
    expect(captured.analysis[0].text).toBe(buildProjectBrief(project, version, 0));
    expect(captured.analysis[0].context).toContain("SIMILAR PRODUCTS");
  });

  test("the agent's context includes the similar products", async () => {
    await agentRoute.POST(json("/api/agent", { projectId: "MyProduct1", messages: [{ role: "user", content: "How do I make this cheaper?" }] })).then((r) => r.text());
    expect(captured.agent[0]).toContain("SIMILAR PRODUCTS");
  });

  test("with nothing similar, prompts carry no similar-products context", async () => {
    await rm(path.join(dir, "projects", "Sharing001"), { recursive: true });
    await analyzeRoute.POST(json("/api/analyze", { projectId: "MyProduct1", version: 1 }));
    expect(captured.analysis[0].context).toBeUndefined();
  });
});

describe("POST /api/learning/recompute", () => {
  test("reports counts only, never any product's data", async () => {
    const res = await recomputeRoute.POST();
    const body = await res.json();
    // Only Sharing001: the example is flagged too, but examples never contribute.
    expect(body.data).toEqual({ projects: 5, contributingProjects: 1, featureRows: 1 });
    expect(JSON.stringify(body)).not.toMatch(/Sharing001|cnc_milling/);
  });
});
