import { describe, expect, test } from "vitest";
import { processInSentence } from "./processes";

describe("processInSentence", () => {
  test("lowercases plain labels and keeps acronyms", () => {
    expect(processInSentence("injection_molding")).toBe("injection molding");
    expect(processInSentence("cnc_milling")).toBe("CNC milling");
    expect(processInSentence("sls_print")).toBe("SLS printing");
  });
});
