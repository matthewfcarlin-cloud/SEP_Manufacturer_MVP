import { describe, expect, test } from "vitest";
import sample from "@/demo/sample-project.json";
import { specSummaryFor } from "./specSummary";
import type { Project } from "./types";

const version = (sample as Project).versions[0];

describe("specSummaryFor", () => {
  test("is only size, material, quantity and process: never the design itself", () => {
    const summary = specSummaryFor(version, "cnc_milling");
    expect(summary).toEqual({
      size: "122 × 66 × 39.5 mm",
      material: version.analysis!.paths.find((p) => p.process === "cnc_milling")!.materials[0],
      quantity: "250 units",
      process: "CNC milling",
    });
    const text = JSON.stringify(summary);
    expect(text).not.toContain(version.notes.slice(0, 30));
    expect(text).not.toContain("/api/files");
  });
});
