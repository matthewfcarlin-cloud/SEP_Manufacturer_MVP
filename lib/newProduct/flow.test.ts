import { describe, expect, test } from "vitest";
import { EMPTY_ANSWERS, formFields, loadingLines, parseDraft, quantityLabel, quantityValue, serializeDraft, STEPS, stepError, type Answers } from "./flow";

const answers = (patch: Partial<Answers>): Answers => ({ ...EMPTY_ANSWERS, ...patch });

describe("new product steps", () => {
  test("asks one question per screen, ending with the review", () => {
    expect(STEPS).toEqual(["what", "look", "howMany", "budget", "review"]);
  });

  test("the name is required on the first screen", () => {
    expect(stepError("what", answers({}), false)).toBe("Give the project a name.");
    expect(stepError("what", answers({ name: "Bike light clip" }), false)).toBeNull();
  });

  test("files are optional, but then a description is needed", () => {
    expect(stepError("look", answers({ name: "Clip" }), false)).toBe("Add a file, or go back and describe it in a sentence.");
    expect(stepError("look", answers({ name: "Clip", notes: "Holds a bike light" }), false)).toBeNull();
    expect(stepError("look", answers({ name: "Clip" }), true)).toBeNull();
  });

  test("a quantity tile must be picked, and an exact number must be valid", () => {
    expect(stepError("howMany", answers({ name: "Clip" }), false)).toBe("Pick one to continue.");
    expect(stepError("howMany", answers({ name: "Clip", quantity: { kind: "preset", value: 100 } }), false)).toBeNull();
    expect(stepError("howMany", answers({ name: "Clip", quantity: { kind: "exact", value: "0" } }), false)).toBe("Target quantity must be at least 1.");
  });

  test("the budget is optional but must be a positive number when given", () => {
    expect(stepError("budget", answers({ name: "Clip", budget: "" }), false)).toBeNull();
    expect(stepError("budget", answers({ name: "Clip", budget: "-5" }), false)).toBe("Budget must be more than $0.");
  });
});

describe("quantityValue", () => {
  test("maps each tile to the target quantity sent to the server", () => {
    expect(quantityValue({ kind: "preset", value: 1000 })).toBe("1000");
    expect(quantityValue({ kind: "unsure" })).toBe("100");
    expect(quantityValue({ kind: "exact", value: " 250 " })).toBe("250");
    expect(quantityValue(null)).toBe("");
  });
});

describe("quantityLabel", () => {
  test("says the choice in plain words for the review", () => {
    expect(quantityLabel({ kind: "preset", value: 1000 })).toBe("1,000 units");
    expect(quantityLabel({ kind: "unsure" })).toBe("Not sure yet (planning for 100)");
    expect(quantityLabel(null)).toBe("Not chosen");
  });
});

describe("formFields", () => {
  test("keeps every existing field of the upload form", () => {
    const fields = formFields(answers({ name: "Clip", notes: "n", materialHints: "ABS", quantity: { kind: "preset", value: 10 }, budget: "500" }));
    expect(fields).toEqual({ name: "Clip", notes: "n", materialHints: "ABS", targetQuantity: "10", budgetUsd: "500" });
  });
});

describe("drafts", () => {
  test("round-trip the text answers", () => {
    const a = answers({ name: "Clip", notes: "n", quantity: { kind: "unsure" }, budget: "50" });
    expect(parseDraft(serializeDraft(a))).toEqual(a);
  });

  test("ignore anything that isn't a draft", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("not json")).toBeNull();
    expect(parseDraft(JSON.stringify({ name: 5 }))).toBeNull();
  });
});

describe("loadingLines", () => {
  test("only mention the analysis when it will really run", () => {
    expect(loadingLines({ hasCad: true, willAnalyze: true })).toEqual(["Measuring your part…", "Finding ways to make it…", "Estimating costs…"]);
    expect(loadingLines({ hasCad: false, willAnalyze: false })).toEqual(["Saving your product…", "Getting your studio ready…"]);
  });
});
