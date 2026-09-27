import { describe, expect, test, vi } from "vitest";
import sample from "@/demo/sample-project.json";
import type { Project } from "./types";
import { generateListing } from "./listing";
import type { CallTextModel } from "./analysis/structured";

const project = sample as Project;
const version = project.versions[0];
const valid = {
  title: "Pre-drilled 125B pedal enclosure in aluminum",
  description: "An aluminum enclosure for a 125B-format guitar pedal.",
  tags: ["guitar pedal case", "fuzz pedal", "125b enclosure", "pedal enclosure", "aluminum pedal", "diy guitar pedal", "pedal parts", "boutique pedal", "pre drilled case", "effects pedal", "stompbox case", "guitar effects", "maker hardware"],
};

describe("generateListing", () => {
  test("uses a mocked model call and returns exactly 13 bounded tags", async () => {
    const call = vi.fn<CallTextModel>().mockResolvedValue({ stopReason: "end_turn", output: valid });
    const result = await generateListing(project, version, "owner-hash", call);
    expect(result).toEqual(valid);
    expect(call).toHaveBeenCalledTimes(1);
    expect(call.mock.calls[0][0]).toContain(`<<<\n${project.name}\n>>>`);
    expect(call.mock.calls[0][0]).toContain(`<<<\n${version.notes}\n>>>`);
    expect(call.mock.calls[0][0]).not.toContain(version.cadFileUrl);
    expect(call.mock.calls[0][0]).not.toContain(version.renders![0]);
  });

  test("withholds notes and retries a response that fails validation", async () => {
    const call = vi.fn<CallTextModel>()
      .mockResolvedValueOnce({ stopReason: "end_turn", output: { ...valid, tags: valid.tags.slice(1) } })
      .mockResolvedValueOnce({ stopReason: "end_turn", output: valid });
    const result = await generateListing(project, { ...version, aiInputs: { includePhotos: true, includeNotes: false } }, "owner-hash", call);
    expect(result).toEqual(valid);
    expect(call).toHaveBeenCalledTimes(2);
    expect(call.mock.calls[0][0]).toContain("(withheld by the inventor)");
    expect(call.mock.calls[0][0]).not.toContain(version.notes);
    expect(call.mock.calls[1][0]).toContain("exactly 13");
  });

  test("rejects overlong titles and tags after its single retry", async () => {
    const call = vi.fn<CallTextModel>().mockResolvedValue({ stopReason: "end_turn", output: { ...valid, title: "x".repeat(141) } });
    await expect(generateListing(project, version, "owner-hash", call)).rejects.toThrow(/didn't pass its checks/);
    expect(call).toHaveBeenCalledTimes(2);
  });
});
