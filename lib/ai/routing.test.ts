import { describe, expect, test } from "vitest";
import type { AiTask } from "../types";
import { STRONGEST_MODEL, TASK_ROUTES } from "./routing";

const TASKS: AiTask[] = ["analyze", "agent_chat", "price", "pitch", "sourcing_plan", "negotiation", "order_draft"];

describe("routing table", () => {
  test("every task has a route with a model, token limit and budget action", () => {
    for (const task of TASKS) {
      const route = TASK_ROUTES[task];
      expect(route.model, task).toMatch(/^claude-/);
      expect(route.maxTokens, task).toBeGreaterThan(0);
      expect(route.budgetAction, task).toBeTruthy();
    }
    expect(Object.keys(TASK_ROUTES).sort()).toEqual([...TASKS].sort());
  });

  test("analysis and the agent get the strongest model with adaptive thinking", () => {
    expect(TASK_ROUTES.analyze).toMatchObject({ model: STRONGEST_MODEL, thinking: true });
    expect(TASK_ROUTES.agent_chat).toMatchObject({ model: STRONGEST_MODEL, thinking: true });
  });

  test("small structured answers keep the efforts they had before the gateway", () => {
    expect(TASK_ROUTES.price).toMatchObject({ effort: "low", thinking: false });
    expect(TASK_ROUTES.sourcing_plan).toMatchObject({ effort: "low", thinking: false });
    expect(TASK_ROUTES.pitch).toMatchObject({ effort: "medium", thinking: false });
    expect(TASK_ROUTES.negotiation).toMatchObject({ effort: "medium", thinking: false });
    expect(TASK_ROUTES.order_draft).toMatchObject({ effort: "low", thinking: false });
    expect(TASK_ROUTES.agent_chat.effort).toBe("medium");
  });
});
