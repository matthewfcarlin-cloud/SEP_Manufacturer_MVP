import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { Project } from "../types";
import { buildEvent, eventsRequestSchema, resolveClientEvent, sourceFor } from "./events";

const project = JSON.parse(readFileSync("demo/sample-project.json", "utf8")) as Project;
const version = project.versions[0];
const WS = "a".repeat(64);

describe("sourceFor", () => {
  test("only the creator's own project is real; shared examples are demo", () => {
    expect(sourceFor("owner")).toBe("real");
    expect(sourceFor("example")).toBe("demo");
  });
});

describe("client events", () => {
  const request = (events: unknown[]) => eventsRequestSchema.safeParse({ events });

  test("accepts the three client-side types", () => {
    const parsed = request([
      { projectId: "p1", version: 1, type: "tweak_rated", payload: { tweak: "1.0", rating: "up" } },
      { projectId: "p1", version: 1, type: "agent_rated", payload: { turnIndex: 3, rating: "down" } },
      { projectId: "p1", version: 1, type: "listing_copied", payload: { field: "tags" } },
    ]);
    expect(parsed.success).toBe(true);
  });

  test("rejects server-only types, so a browser can't fake an analysis or a chosen quote", () => {
    for (const type of ["analysis_run", "quote_chosen", "tweak_applied", "agent_question"]) {
      expect(request([{ projectId: "p1", version: 1, type, payload: {} }]).success, type).toBe(false);
    }
  });

  test("rejects free text: unknown payload keys, and strings outside each field's allowed values", () => {
    expect(request([{ projectId: "p1", version: 1, type: "agent_rated", payload: { turnIndex: 1, rating: "up", comment: "my secret idea" } }]).success).toBe(false);
    expect(request([{ projectId: "p1", version: 1, type: "agent_rated", payload: { turnIndex: 1, rating: "loved it" } }]).success).toBe(false);
    expect(request([{ projectId: "p1", version: 1, type: "listing_copied", payload: { field: "my notes" } }]).success).toBe(false);
    expect(request([{ projectId: "p1", version: 1, type: "tweak_rated", payload: { tweak: "add a draft angle", rating: "up" } }]).success).toBe(false);
  });

  test("caps a batch at 50 events and needs at least one", () => {
    const one = { projectId: "p1", version: 1, type: "listing_copied", payload: { field: "title" } };
    expect(request([]).success).toBe(false);
    expect(request(Array(50).fill(one)).success).toBe(true);
    expect(request(Array(51).fill(one)).success).toBe(false);
  });

  test("a tweak rating is resolved against the version's own analysis", () => {
    const resolved = resolveClientEvent({ type: "tweak_rated", payload: { tweak: "1.2", rating: "up" } }, version);
    expect(resolved).toEqual({ type: "tweak_rated", payload: { process: "sheet_metal", pathIndex: 1, tweakIndex: 2, rating: "up" } });
  });

  test("a tweak that isn't in the analysis resolves to nothing", () => {
    expect(resolveClientEvent({ type: "tweak_rated", payload: { tweak: "7.0", rating: "up" } }, version)).toBeNull();
    expect(resolveClientEvent({ type: "tweak_rated", payload: { tweak: "0.9", rating: "up" } }, version)).toBeNull();
    const unanalyzed = { ...version, analysis: undefined };
    expect(resolveClientEvent({ type: "tweak_rated", payload: { tweak: "0.0", rating: "up" } }, unanalyzed)).toBeNull();
  });
});

describe("buildEvent", () => {
  test("stamps id, time and source around a valid payload", () => {
    const event = buildEvent({ workspaceId: WS, projectId: "p1", version: 2, type: "quote_requested", payload: { quoteCount: 5, shareLevel: "summary" }, source: "demo" });
    expect(event).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      workspaceId: WS,
      projectId: "p1",
      version: 2,
      type: "quote_requested",
      payload: { quoteCount: 5, shareLevel: "summary" },
      source: "demo",
      createdAt: expect.any(String),
    });
  });

  test("refuses a server payload that doesn't match its type's schema", () => {
    expect(() => buildEvent({ workspaceId: WS, projectId: "p1", type: "analysis_run", payload: { notes: "free text" }, source: "real" })).toThrow();
  });
});
