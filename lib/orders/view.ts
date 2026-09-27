import type { OrderCoordination, OrderLine, ProjectVersion } from "../types";
import { matchAssemblers, type AssemblerMatch } from "./assemblers";
import { orderLinesFor } from "./lines";
import { emptyOrder, planOrder, type OrderPlan } from "./plan";

/** Everything the order screen (and the agent) needs for one version: stored choices, the computed plan and assembler matches. */
export type OrderView = { order: OrderCoordination; lines: OrderLine[]; plan: OrderPlan; assemblers: AssemblerMatch[] };

export const ASSEMBLER_MATCHES_SHOWN = 4;

export function orderView(version: ProjectVersion): OrderView {
  const lines = orderLinesFor(version);
  const plan = planOrder(version, lines);
  const assemblers = plan.needsAssembly ? matchAssemblers(lines, plan.runQuantity).slice(0, ASSEMBLER_MATCHES_SHOWN) : [];
  return { order: version.order ?? emptyOrder(version), lines, plan, assemblers };
}
