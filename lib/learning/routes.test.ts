import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { Project } from "../types";

// B1 done-when: actions show up as rows with the right `source`.

const WS = "b".repeat(64);
const OWN = "OwnProj001";
const EXAMPLE = "ExamProj01";
const HIDDEN = "Hidden0001";

vi.mock("@/lib/access", async () => {
  const { getProject } = await import("@/lib/projectStore");
  const access = async (id: string) => {
    if (id === HIDDEN) return null;
    const project = await getProject(id);
    return project ? { project, access: project.isExample ? ("example" as const) : ("owner" as const) } : null;
  };
  return {
    currentOwnerHash: async () => WS,
    getAccessibleProject: access,
    requireOwner: async (id: string) => (await access(id))?.project ?? Response.json({}, { status: 404 }),
  };
});

const eventsRoute = await import("@/app/api/events/route");
const outcomesRoute = await import("@/app/api/outcomes/route");
const quotesRoute = await import("@/app/api/projects/[id]/versions/[n]/quotes/route");
const chooseRoute = await import("@/app/api/projects/[id]/versions/[n]/quotes/[quoteId]/choose/route");
const versionRoute = await import("@/app/api/projects/[id]/versions/[n]/route");
const { listEvents, listOutcomes } = await import("@/lib/db/learningStore");
const { resetLearningLimits } = await import("./limits");

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "idlefit-b1-"));
  process.env.IDLEFIT_DATA_DIR = dir;
});
afterAll(async () => {
  delete process.env.IDLEFIT_DATA_DIR;
  await rm(dir, { recursive: true, force: true });
});

async function install(id: string, isExample: boolean) {
  const sample = JSON.parse(await readFile("demo/sample-project.json", "utf8")) as Project;
  const v1 = sample.versions[0];
  const project: Project = {
    ...sample,
    id,
    ...(isExample ? { isExample: true } : { isExample: undefined, owner: { keyHash: WS } }),
    versions: [v1, { ...v1, number: 2, basedOn: 1 }],
  };
  await mkdir(path.join(dir, "projects", id), { recursive: true });
  await writeFile(path.join(dir, "projects", id, "project.json"), JSON.stringify(project));
}

beforeEach(async () => {
  await rm(path.join(dir, "projects"), { recursive: true, force: true });
  await install(OWN, false);
  await install(EXAMPLE, true);
  resetLearningLimits();
});

const json = (url: string, body: unknown, method = "POST") =>
  new Request(`http://localhost${url}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const params = <T extends object>(p: T) => ({ params: Promise.resolve(p) }) as never;

describe("POST /api/events", () => {
  const batch = (projectId: string) => ({
    events: [
      { projectId, version: 1, type: "tweak_rated", payload: { tweak: "1.0", rating: "up" } },
      { projectId, version: 2, type: "agent_rated", payload: { turnIndex: 1, rating: "down" } },
    ],
  });

  test("feedback on the creator's own project is stored as real, with the tweak resolved server-side", async () => {
    const res = await eventsRoute.POST(json("/api/events", batch(OWN)));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ accepted: 2, dropped: 0 });
    const events = await listEvents(OWN);
    expect(events).toEqual([
      expect.objectContaining({ workspaceId: WS, projectId: OWN, version: 1, type: "tweak_rated", source: "real", payload: { process: "sheet_metal", pathIndex: 1, tweakIndex: 0, rating: "up" } }),
      expect.objectContaining({ version: 2, type: "agent_rated", source: "real", payload: { turnIndex: 1, rating: "down" } }),
    ]);
  });

  test("the same feedback on a shared example is stored as demo", async () => {
    await eventsRoute.POST(json("/api/events", batch(EXAMPLE)));
    expect((await listEvents(EXAMPLE)).map((e) => e.source)).toEqual(["demo", "demo"]);
  });

  test("events for a project this browser can't see, or a version or tweak that doesn't exist, are dropped", async () => {
    const res = await eventsRoute.POST(
      json("/api/events", {
        events: [
          { projectId: HIDDEN, version: 1, type: "listing_copied", payload: { field: "title" } },
          { projectId: OWN, version: 9, type: "listing_copied", payload: { field: "title" } },
          { projectId: OWN, version: 1, type: "tweak_rated", payload: { tweak: "3.9", rating: "up" } },
          { projectId: OWN, version: 1, type: "listing_copied", payload: { field: "title" } },
        ],
      }),
    );
    expect((await res.json()).data).toEqual({ accepted: 1, dropped: 3 });
    expect(await listEvents(OWN)).toHaveLength(1);
  });

  test("server-only types and non-JSON bodies are refused", async () => {
    expect((await eventsRoute.POST(json("/api/events", { events: [{ projectId: OWN, version: 1, type: "analysis_run", payload: {} }] }))).status).toBe(400);
    const text = new Request("http://localhost/api/events", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" });
    expect((await eventsRoute.POST(text)).status).toBe(415);
    expect(await listEvents(OWN)).toEqual([]);
  });

  test("one browser can log at most 600 events per 10 minutes", async () => {
    const fifty = { events: Array(50).fill({ projectId: OWN, version: 1, type: "listing_copied", payload: { field: "tags" } }) };
    const statuses: number[] = [];
    for (let i = 0; i < 13; i++) statuses.push((await eventsRoute.POST(json("/api/events", fifty))).status);
    expect(statuses.slice(0, 12).every((s) => s === 200)).toBe(true);
    expect(statuses[12]).toBe(429);
    expect(await listEvents(OWN)).toHaveLength(600);
  });
});

describe("/api/outcomes", () => {
  const quote = (projectId: string) => ({ projectId, version: 1, kind: "real_quote", process: "cnc_milling", quantity: 100, actualUsd: 52.5 });

  test("a real quote on the creator's own project is stored as real and listed for its version", async () => {
    const res = await outcomesRoute.POST(json("/api/outcomes", quote(OWN)));
    expect(res.status).toBe(201);
    const saved = (await res.json()).data;
    expect(saved).toMatchObject({ kind: "real_quote", source: "real", estimateUsd: { low: 45, high: 75 }, actualUsd: 52.5 });
    expect(await listOutcomes(OWN)).toEqual([saved]);
    const listed = await outcomesRoute.GET(new Request(`http://localhost/api/outcomes?projectId=${OWN}&version=1`));
    expect((await listed.json()).data).toEqual({ outcomes: [saved] });
    const other = await outcomesRoute.GET(new Request(`http://localhost/api/outcomes?projectId=${OWN}&version=2`));
    expect((await other.json()).data).toEqual({ outcomes: [] });
  });

  test("the same quote on a shared example is stored as demo", async () => {
    const res = await outcomesRoute.POST(json("/api/outcomes", quote(EXAMPLE)));
    expect((await res.json()).data.source).toBe("demo");
  });

  test("a project this browser can't see is a 404 and nothing is stored", async () => {
    expect((await outcomesRoute.POST(json("/api/outcomes", quote(HIDDEN)))).status).toBe(404);
    expect((await outcomesRoute.GET(new Request(`http://localhost/api/outcomes?projectId=${HIDDEN}&version=1`))).status).toBe(404);
  });

  test("a bad request is a 400 with a message, and nothing is stored", async () => {
    const res = await outcomesRoute.POST(json("/api/outcomes", { ...quote(OWN), actualUsd: "fifty" }));
    expect(res.status).toBe(400);
    expect(await listOutcomes(OWN)).toEqual([]);
  });
});

describe("events logged by the server", () => {
  test("requesting and choosing quotes are logged as demo, because the quotes are simulated", async () => {
    const requested = await quotesRoute.POST(json(`/api/projects/${OWN}/versions/1/quotes`, { shareLevel: "summary" }), params({ id: OWN, n: "1" }));
    expect(requested.status).toBe(201);
    const outreach = (await requested.json()).data;
    const quote = outreach.quotes[0];
    await chooseRoute.POST(json(`/api/projects/${OWN}/versions/1/quotes/${quote.id}/choose`, {}), params({ id: OWN, n: "1", quoteId: quote.id }));

    const events = await listEvents(OWN);
    expect(events).toEqual([
      expect.objectContaining({ type: "quote_requested", source: "demo", version: 1, payload: { quoteCount: outreach.quotes.length, shareLevel: "summary" } }),
      expect.objectContaining({
        type: "quote_chosen",
        source: "demo",
        payload: { process: quote.process, quantity: quote.quantity, unitPriceUsd: quote.unitPriceUsd, leadTimeDays: quote.leadTimeDays },
      }),
    ]);
  });

  test("deleting a version deletes its events and outcomes too, as /privacy promises", async () => {
    await eventsRoute.POST(json("/api/events", { events: [1, 2].map((version) => ({ projectId: OWN, version, type: "listing_copied", payload: { field: "title" } })) }));
    await outcomesRoute.POST(json("/api/outcomes", { projectId: OWN, version: 2, kind: "units_sold", value: 5 }));
    const res = await versionRoute.DELETE(new Request(`http://localhost/api/projects/${OWN}/versions/2`, { method: "DELETE" }), params({ id: OWN, n: "2" }));
    expect(res.status).toBe(200);
    expect((await listEvents(OWN)).map((e) => e.version)).toEqual([1]);
    expect(await listOutcomes(OWN)).toEqual([]);
  });
});
