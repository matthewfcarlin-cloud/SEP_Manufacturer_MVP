import { describe, expect, test } from "vitest";
import sample from "@/demo/sample-project.json";
import type { Project, ProjectVersion } from "../types";
import { stageSummary } from "./stageSummary";

const pedal = sample as Project;
const v = (patch: Partial<ProjectVersion> = {}): ProjectVersion => ({ ...pedal.versions.at(-1)!, ...patch });
const link = (s: ReturnType<typeof stageSummary>) => (s.action.kind === "link" ? s.action.href : s.action.kind);

describe("stageSummary", () => {
  test("Idea: the part's size, and asks for a 3D file when there isn't one", () => {
    expect(stageSummary(pedal, v(), "idea")).toMatchObject({ tone: "good", title: "Your part measures 122 × 66 × 39.5 mm." });
    const noFile = stageSummary(pedal, v({ cadFileUrl: undefined, geometry: undefined }), "idea");
    expect(noFile.title).toBe("No 3D file yet, and that's fine.");
    expect(noFile.action).toEqual({ kind: "link", label: "Add a 3D file", href: `/project/${pedal.id}/versions/new?from=1` });
  });

  test("Design: runs the analysis first, then names the best way to make it and sends you to quotes", () => {
    expect(stageSummary(pedal, v({ analysis: undefined }), "design")).toMatchObject({ tone: "check", action: { kind: "analyze" } });
    const done = stageSummary(pedal, v(), "design");
    expect(done.tone).toBe("good");
    expect(done.title).toMatch(/^Here's the best way to make it: CNC milling, about \$[\d.]+–\$[\d.]+ each\.$/);
    expect(done.action).toMatchObject({ kind: "link", label: "Get quotes", href: `/project/${pedal.id}/make` });
  });

  test("Money: the verdict is the title, colored by whether it makes money", () => {
    const losing = stageSummary(pedal, v(), "money");
    expect(losing.tone).toBe("bad");
    expect(losing.title).toBe("At $32 you'd lose money on each sale.");
    expect(losing.explanation).toMatch(/^Try a design tweak, or raise the price to about \$\d+\.$/);
    expect(losing.action).toMatchObject({ label: "Try a design tweak", href: `/project/${pedal.id}/versions/new?from=1&tweak=0.0` });
    const profitable = stageSummary(pedal, v({ businessCase: { ...v().businessCase!, retailPriceUsd: 400 } }), "money");
    expect(profitable.tone).toBe("good");
    expect(profitable.action).toMatchObject({ label: "Change the price", href: `/project/${pedal.id}/money?v=1#business-case-heading` });
    expect(stageSummary(pedal, v({ businessCase: undefined }), "money")).toMatchObject({ tone: "check", action: { label: "Set a price" } });
  });

  test("Make: compare quotes when they're in, then plan once one is chosen", () => {
    const quotes = stageSummary(pedal, v(), "make");
    expect(quotes.tone).toBe("check");
    expect(quotes.action).toMatchObject({ label: "Compare your 5 quotes", href: `/project/${pedal.id}/make#quotes-heading` });
    const chosen = stageSummary(pedal, v({ outreach: { ...v().outreach!, chosenQuoteId: v().outreach!.quotes[0].id } }), "make");
    expect(chosen.tone).toBe("good");
    expect(link(chosen)).toBe(`/project/${pedal.id}/plan`);
  });

  test("Launch drafts a plan when there's none; Sell writes the listing when there's none", () => {
    expect(stageSummary(pedal, v({ plan: undefined }), "launch").action).toEqual({ kind: "draftPlan" });
    expect(link(stageSummary(pedal, v(), "launch"))).toBe(`/project/${pedal.id}/sell`);
    expect(stageSummary(pedal, v({ listing: undefined }), "sell").action).toEqual({ kind: "writeListing" });
    const ready = stageSummary(pedal, v(), "sell");
    expect(ready.action).toMatchObject({ label: "Open Etsy", isExternal: true });
    expect(ready.explanation).not.toMatch(/\$/); // the numbers are in the details
    expect(stageSummary(pedal, v({ businessCase: undefined }), "sell")).toMatchObject({ tone: "check", action: { label: "Set a price" } });
  });

  test("every stage waits for the analysis before it can help", () => {
    for (const stage of ["make", "money", "launch", "sell", "pitch"] as const) {
      const s = stageSummary(pedal, v({ analysis: undefined }), stage);
      expect(s.tone).toBe("check");
      expect(link(s)).toBe(`/project/${pedal.id}?v=1#analysis-heading`);
    }
  });
});
