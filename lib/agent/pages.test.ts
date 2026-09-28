import { describe, expect, test } from "vitest";
import { AGENT_PAGES, agentPageFor, GENERAL_STARTERS, PAGE_STARTERS } from "./pages";

describe("Ask Moko pages", () => {
  test("knows the product page from the path", () => {
    expect(agentPageFor("/project/abc123defg")).toBe("design");
    expect(agentPageFor("/project/abc123defg/make")).toBe("make");
    expect(agentPageFor("/project/abc123defg/idea")).toBe("idea");
    expect(agentPageFor("/project/abc123defg/money")).toBe("money");
    expect(agentPageFor("/project/abc123defg/sell")).toBe("sell");
    expect(agentPageFor("/project/abc123defg/versions/new")).toBe("new_version");
    expect(agentPageFor("/project/abc123defg/unknown")).toBe("design");
  });

  test("every page has three short, everyday questions", () => {
    for (const page of AGENT_PAGES) {
      expect(PAGE_STARTERS[page]).toHaveLength(3);
      for (const q of PAGE_STARTERS[page]) expect(q.length).toBeLessThan(45);
    }
    expect(GENERAL_STARTERS).toHaveLength(3);
  });
});
