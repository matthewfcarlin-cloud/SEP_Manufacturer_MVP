import { describe, expect, test } from "vitest";
import { detectCadFormat, detectImageType, parseProjectFields } from "./projectInput";

const valid = {
  name: "Fuzz pedal enclosure",
  notes: "Die-cast style enclosure for a fuzz pedal, two footswitches.",
  targetQuantity: "250",
  budgetUsd: "3000",
  materialHints: "aluminum, ABS ,, ",
};

describe("parseProjectFields", () => {
  test("parses and normalizes valid input", () => {
    const result = parseProjectFields(valid);
    expect(result).toEqual({
      success: true,
      data: {
        name: "Fuzz pedal enclosure",
        notes: valid.notes,
        targetQuantity: 250,
        budgetUsd: 3000,
        materialHints: ["aluminum", "ABS"],
      },
    });
  });

  test("budget and material hints are optional", () => {
    const result = parseProjectFields({ ...valid, budgetUsd: "", materialHints: "" });
    expect(result.success && result.data.budgetUsd).toBeUndefined();
    expect(result.success && result.data.materialHints).toEqual([]);
  });

  test.each([
    ["missing name", { name: "  " }, "name"],
    ["zero quantity", { targetQuantity: "0" }, "targetQuantity"],
    ["fractional quantity", { targetQuantity: "2.5" }, "targetQuantity"],
    ["non-numeric quantity", { targetQuantity: "lots" }, "targetQuantity"],
    ["negative budget", { budgetUsd: "-5" }, "budgetUsd"],
    ["overlong notes", { notes: "x".repeat(4001) }, "notes"],
  ])("rejects %s", (_label, patch, field) => {
    const result = parseProjectFields({ ...valid, ...patch });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.field).toBe(field);
      expect(result.error).toMatch(/\.$/); // a readable sentence, not a raw zod code
    }
  });

  test("rejects more than 10 material hints", () => {
    const hints = Array.from({ length: 11 }, (_, i) => `m${i}`).join(",");
    expect(parseProjectFields({ ...valid, materialHints: hints }).success).toBe(false);
  });
});

describe("detectImageType", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);

  test("recognizes JPEG, PNG and WebP by magic bytes", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpg");
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    expect(detectImageType(webp)).toBe("webp");
  });

  test("rejects anything else, whatever its extension claims", () => {
    expect(detectImageType(new TextEncoder().encode("<svg xmlns=...>"))).toBeNull();
    expect(detectImageType(new Uint8Array(2))).toBeNull();
  });
});

describe("detectCadFormat", () => {
  const bytes = (s: string) => new TextEncoder().encode(s);

  test("recognizes STEP by its header, whatever the extension", () => {
    expect(detectCadFormat("part.step", bytes("ISO-10303-21;\nHEADER;"))).toBe("step");
    expect(detectCadFormat("part.STP", bytes("  ISO-10303-21;"))).toBe("step");
    expect(detectCadFormat("renamed.stl", bytes("ISO-10303-21;"))).toBe("step");
  });

  test("treats other .stl files as STL and rejects unknown files", () => {
    expect(detectCadFormat("part.STL", new Uint8Array(84))).toBe("stl");
    expect(detectCadFormat("part.step", bytes("not really step"))).toBeNull();
    expect(detectCadFormat("model.obj", bytes("v 0 0 0"))).toBeNull();
  });
});
