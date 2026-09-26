import { describe, expect, test, vi } from "vitest";
import bracket from "@/demo/bracket-project.json";
import { buildPitchBrief } from "./analysis/pitch";
import { buildPriceBrief } from "./analysis/price";
import { buildProjectBrief } from "./analysis/prompt";
import { imagesToSend, resolveAiInputs, WITHHELD } from "./aiInputs";
import type { Project } from "./types";

const project = bracket as Project;
const [v1, v2] = project.versions;
const noNotes = { includePhotos: true, includeNotes: false };
const withheld = (v: typeof v2) => ({ ...v, aiInputs: noNotes });
const projectWithheld: Project = { ...project, versions: [withheld(v1), withheld(v2)] };

describe("AI inputs", () => {
  test("default to sending everything", () => {
    expect(resolveAiInputs(v1)).toEqual({ includePhotos: true, includeNotes: true });
  });

  test("withheld notes and change notes never reach the analysis brief", () => {
    const brief = buildProjectBrief(projectWithheld, withheld(v2), 0);
    expect(brief).not.toContain(v2.notes.slice(0, 40));
    expect(brief).not.toContain(v2.changeNote!.slice(0, 40));
    expect(brief).toContain(WITHHELD);
    expect(buildProjectBrief(project, v2, 0)).toContain(v2.notes.slice(0, 40)); // control
  });

  test("withheld notes never reach the price or pitch briefs", () => {
    expect(buildPriceBrief(projectWithheld, withheld(v2))).not.toContain(v2.notes.slice(0, 40));
    const pitch = buildPitchBrief(projectWithheld, withheld(v2));
    expect(pitch).not.toContain(v2.notes.slice(0, 40));
    expect(pitch).not.toContain(v2.changeNote!.slice(0, 40));
  });

  test("withheld photos aren't even loaded", async () => {
    const load = vi.fn().mockResolvedValue([{ mediaType: "image/png", base64: "x" }]);
    expect(await imagesToSend({ ...v1, aiInputs: { includePhotos: false, includeNotes: true } }, load)).toEqual([]);
    expect(load).not.toHaveBeenCalled();
    expect(await imagesToSend(v1, load)).toHaveLength(1);
  });
});
