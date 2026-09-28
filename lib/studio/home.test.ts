import { describe, expect, test } from "vitest";
import sample from "@/demo/sample-project.json";
import type { Project, ProjectVersion } from "../types";
import { editedAgo, gettingStarted, greetingFor, initialsFor } from "./home";

const pedal = sample as Project;
const withLatest = (p: Project, patch: Partial<ProjectVersion>): Project => ({
  ...p,
  versions: [...p.versions.slice(0, -1), { ...p.versions[p.versions.length - 1], ...patch }],
});

describe("greetingFor", () => {
  test("follows the hour of the day", () => {
    expect(greetingFor(8)).toBe("Good morning");
    expect(greetingFor(14)).toBe("Good afternoon");
    expect(greetingFor(19)).toBe("Good evening");
    expect(greetingFor(2)).toBe("Good evening");
  });
});

describe("editedAgo", () => {
  const now = Date.parse("2026-09-27T12:00:00.000Z");
  test("uses plain relative words", () => {
    expect(editedAgo("2026-09-27T11:59:40.000Z", now)).toBe("Edited just now");
    expect(editedAgo("2026-09-27T11:45:00.000Z", now)).toBe("Edited 15m ago");
    expect(editedAgo("2026-09-27T10:00:00.000Z", now)).toBe("Edited 2h ago");
    expect(editedAgo("2026-09-25T12:00:00.000Z", now)).toBe("Edited 2d ago");
  });

  test("falls back to the date after a week", () => {
    expect(editedAgo("2026-08-01T12:00:00.000Z", now)).toBe("Edited Aug 1");
  });
});

describe("initialsFor", () => {
  test("takes up to two initials", () => {
    expect(initialsFor("Matthew Carlin")).toBe("MC");
    expect(initialsFor("  matthew ")).toBe("M");
    expect(initialsFor("")).toBe("");
  });
});

describe("gettingStarted", () => {
  test("with no product yet, only the first step is available and it starts a product", () => {
    // Act
    const guide = gettingStarted(undefined);
    // Assert
    expect(guide.steps).toHaveLength(5);
    expect(guide.doneCount).toBe(0);
    expect(guide.steps[0]).toMatchObject({ isDone: false, href: "/new" });
    expect(guide.isComplete).toBe(false);
  });

  test("ticks what the first product already has and links each open step to its screen", () => {
    const fresh = withLatest(pedal, { analysis: undefined, businessCase: undefined, outreach: undefined, sourcing: undefined, plan: undefined });
    const guide = gettingStarted(fresh);
    expect(guide.steps.map((s) => s.isDone)).toEqual([true, false, false, false, false]);
    expect(guide.steps[1].href).toBe(`/project/${pedal.id}?v=${fresh.versions.at(-1)!.number}#analysis-heading`);
    expect(guide.steps[2].href).toBe(`/project/${pedal.id}/make`);
    expect(guide.steps[3].href).toBe(`/project/${pedal.id}/money?v=${fresh.versions.at(-1)!.number}#business-case-heading`);
    expect(guide.steps[4].href).toBe(`/project/${pedal.id}/plan`);
  });

  test("is complete when all five are done", () => {
    const done = withLatest(pedal, {
      outreach: { requestedAt: "2026-09-27T12:00:00.000Z", specSheet: {} as never, quotes: [], chosenQuoteId: "a" },
      plan: {} as never,
    });
    const guide = gettingStarted(done);
    expect(guide.doneCount).toBe(5);
    expect(guide.isComplete).toBe(true);
  });
});
