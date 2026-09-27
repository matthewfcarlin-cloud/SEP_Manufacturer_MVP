import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { Outcome, ProductEvent } from "../types";
import { appendEvents, appendOutcome, listEvents, listOutcomes, removeVersionRecords } from "./learningStore";

let dir: string;
const ID = "Proj123456";
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "idlefit-learning-"));
  process.env.IDLEFIT_DATA_DIR = dir;
});
afterAll(async () => {
  delete process.env.IDLEFIT_DATA_DIR;
  await rm(dir, { recursive: true, force: true });
});
beforeEach(async () => {
  await rm(path.join(dir, "projects"), { recursive: true, force: true });
  await mkdir(path.join(dir, "projects", ID), { recursive: true });
});

const event = (version: number, n = 0): ProductEvent => ({
  id: `e-${version}-${n}`,
  workspaceId: "a".repeat(64),
  projectId: ID,
  version,
  type: "listing_copied",
  payload: { field: "title" },
  source: "real",
  createdAt: new Date().toISOString(),
});
const outcome = (version: number): Outcome => ({ id: `o-${version}`, projectId: ID, version, kind: "units_sold", value: 12, source: "real", createdAt: new Date().toISOString() });

describe("learning store", () => {
  test("appends events and outcomes to the project and lists them back in order", async () => {
    expect(await appendEvents(ID, [event(1, 0), event(1, 1)])).toBe(true);
    await appendEvents(ID, [event(2)]);
    const sold = outcome(1);
    expect(await appendOutcome(ID, sold)).toBe(true);
    expect((await listEvents(ID)).map((e) => e.id)).toEqual(["e-1-0", "e-1-1", "e-2-0"]);
    expect(await listOutcomes(ID)).toEqual([sold]);
  });

  test("a project with no records lists nothing", async () => {
    expect(await listEvents(ID)).toEqual([]);
    expect(await listOutcomes(ID)).toEqual([]);
  });

  test("never recreates a deleted project's folder: late writes are dropped", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await rm(path.join(dir, "projects", ID), { recursive: true });
    expect(await appendEvents(ID, [event(1)])).toBe(false);
    expect(await appendOutcome(ID, outcome(1))).toBe(false);
    expect(await readdir(path.join(dir, "projects"))).toEqual([]);
    warn.mockRestore();
  });

  test("removing a version prunes only that version's events and outcomes", async () => {
    await appendEvents(ID, [event(1), event(2), event(3)]);
    await appendOutcome(ID, outcome(2));
    await appendOutcome(ID, outcome(3));
    await removeVersionRecords(ID, 2);
    expect((await listEvents(ID)).map((e) => e.version)).toEqual([1, 3]);
    expect((await listOutcomes(ID)).map((o) => o.version)).toEqual([3]);
  });

  test("appends that race a prune are kept", async () => {
    await appendEvents(ID, [event(1), event(2)]);
    await Promise.all([removeVersionRecords(ID, 2), ...Array.from({ length: 20 }, (_, i) => appendEvents(ID, [event(1, i + 1)]))]);
    const events = await listEvents(ID);
    expect(events.filter((e) => e.version === 2)).toEqual([]);
    expect(events).toHaveLength(21);
  });

  test("rejects an invalid project id instead of touching an arbitrary path", async () => {
    await expect(appendEvents("../../etc", [event(1)])).rejects.toThrow();
    await expect(listOutcomes("../x")).rejects.toThrow();
  });
});
