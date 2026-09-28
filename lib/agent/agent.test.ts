import { describe, expect, test } from "vitest";
import bracket from "@/demo/bracket-project.json";
import sample from "@/demo/sample-project.json";
import { WITHHELD } from "../aiInputs";
import type { Project } from "../types";
import { buildAgentContext } from "./context";
import { decodeAgentEvents, encodeAgentEvent } from "./protocol";
import { agentRequestSchema } from "./request";

const pedal = sample as Project;
const brackets = bracket as Project;

describe("buildAgentContext", () => {
  const context = buildAgentContext(pedal, pedal.versions[0]);

  test("carries this product's real numbers", () => {
    const v = pedal.versions[0];
    expect(context).toContain(pedal.name);
    expect(context).toContain("122 × 66 × 39.5 mm");
    expect(context).toContain(v.analysis!.topRecommendation);
    expect(context).toContain(v.analysis!.paths[0].designTweaks[0].change);
    expect(context).toMatch(/Business case \(estimate\): .*\$32 retail/);
  });

  test("labels shops as fictional demo data and costs as estimates", () => {
    expect(context).toMatch(/Shop matches \(fictional demo shops; nothing has been sent/);
    expect(context).toMatch(/AI estimates/);
  });

  test("includes the version history when there is one", () => {
    const withHistory = buildAgentContext(brackets, brackets.versions[1]);
    expect(withHistory).toContain("v1 → v2");
    expect(withHistory).toContain("Each one costs 14% less");
  });

  test("never includes notes the inventor withheld", () => {
    const v = { ...pedal.versions[0], aiInputs: { includePhotos: true, includeNotes: false } };
    const withheld = buildAgentContext({ ...pedal, versions: [v] }, v);
    expect(withheld).not.toContain(pedal.versions[0].notes.slice(0, 40));
    expect(withheld).toContain(WITHHELD);
  });

  test("says plainly when the version isn't analyzed", () => {
    const bare = { ...pedal.versions[0], analysis: undefined, businessCase: undefined };
    expect(buildAgentContext({ ...pedal, versions: [bare] }, bare)).toContain("Not analyzed yet");
  });
});

describe("buildAgentContext quotes", () => {
  test("lists the demo quotes, labeled, with the chosen one marked", () => {
    const v = pedal.versions[0];
    const q = { id: "q1", shopId: "breakwater-machine", machineModel: "Haas VF-4", process: "cnc_milling" as const, quantity: 250, unitPriceUsd: 28.4, toolingUsd: 310, leadTimeDays: 11, moq: 5, note: "", status: "quoted" as const, isDemo: true as const };
    const withQuotes = { ...v, outreach: { requestedAt: "2026-09-27T12:00:00.000Z", specSheet: {} as never, quotes: [q], chosenQuoteId: "q1" } };
    const context = buildAgentContext({ ...pedal, versions: [withQuotes] }, withQuotes);
    expect(context).toMatch(/Demo quotes \(simulated/);
    expect(context).toContain("Breakwater Machine");
    expect(context).toContain("$28.40/unit");
    expect(context).toContain("CHOSEN");
  });
});

describe("buildAgentContext stage", () => {
  test("tells the agent the current stage and the next step", () => {
    const context = buildAgentContext(pedal, pedal.versions[0]);
    expect(context).toMatch(/Current stage: Make/);
    expect(context).toMatch(/Next step the app suggests: 5 quotes waiting/);
  });
});

describe("agent protocol", () => {
  test("round-trips events across chunk boundaries", () => {
    const wire = encodeAgentEvent({ type: "text", text: "Hello\\nworld" }) + encodeAgentEvent({ type: "done" });
    const { events, rest } = decodeAgentEvents(wire.slice(0, 10));
    expect(events).toEqual([]);
    const second = decodeAgentEvents(rest + wire.slice(10));
    expect(second.events).toEqual([{ type: "text", text: "Hello\\nworld" }, { type: "done" }]);
    expect(second.rest).toBe("");
  });
});

describe("agentRequestSchema", () => {
  const ok = { projectId: "yAeM9-RDOE", messages: [{ role: "user", content: "How do I cut cost?" }] };

  test("accepts a conversation that alternates and ends with the user", () => {
    expect(agentRequestSchema.safeParse(ok).success).toBe(true);
    const longer = { ...ok, messages: [ok.messages[0], { role: "assistant", content: "Try X." }, { role: "user", content: "And Y?" }] };
    expect(agentRequestSchema.safeParse(longer).success).toBe(true);
  });

  test("rejects empty, overlong, out-of-order, or assistant-last conversations", () => {
    expect(agentRequestSchema.safeParse({ ...ok, messages: [] }).success).toBe(false);
    expect(agentRequestSchema.safeParse({ ...ok, messages: [{ role: "user", content: "x".repeat(4001) }] }).success).toBe(false);
    expect(agentRequestSchema.safeParse({ ...ok, messages: [{ role: "assistant", content: "hi" }] }).success).toBe(false);
    expect(agentRequestSchema.safeParse({ ...ok, messages: [ok.messages[0], ok.messages[0]] }).success).toBe(false);
  });
});
