import { describe, expect, test } from "vitest";
import bracket from "@/demo/bracket-project.json";
import sample from "@/demo/sample-project.json";
import type { Project, ProjectVersion } from "../types";
import { statusLine } from "./statusLine";

const withLatest = (project: Project, edit: (v: ProjectVersion) => ProjectVersion): Project => ({
  ...project,
  versions: [...project.versions.slice(0, -1), edit(project.versions[project.versions.length - 1])],
});
const full = bracket as Project;

describe("statusLine", () => {
  test("follows the product through every stage", () => {
    expect(statusLine(withLatest(full, (v) => ({ ...v, analysis: undefined })))).toBe("Ready to see how it's made");
    expect(statusLine(withLatest(full, (v) => ({ ...v, outreach: undefined, sourcing: undefined })))).toBe("Ready to get quotes");
    expect(statusLine(withLatest(full, (v) => ({ ...v, businessCase: undefined })))).toBe("Ready to set a price");
    expect(statusLine(withLatest(full, (v) => ({ ...v, plan: undefined, listing: undefined })))).toBe("Ready to plan the launch");
    expect(statusLine(withLatest(full, (v) => ({ ...v, listing: undefined })))).toBe("Ready to write the listing");
    expect(statusLine(full)).toBe("Ready to sell");
  });

  test("counts quotes that came back but aren't chosen yet", () => {
    const v = full.versions[1];
    const open = withLatest(full, (x) => ({ ...x, outreach: { ...v.outreach!, chosenQuoteId: undefined } }));
    expect(statusLine(open)).toBe(`${v.outreach!.quotes.length} quotes waiting`);
  });

  test("the pedal example reads naturally", () => {
    expect(statusLine(sample as Project)).toMatch(/^(Ready|\d+ quotes? waiting)/);
  });
});
