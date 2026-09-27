import { randomBytes } from "node:crypto";
import { updateVersion } from "../projectStore";
import type { OrderCoordination, ProjectVersion } from "../types";
import { orderLinesFor } from "./lines";
import { applyOrderOp, type OrderOpContext, type OrderOpResult } from "./ops";
import type { OrderOp } from "./schemas";

export const newOrderId = () => randomBytes(9).toString("base64url");

export const orderContext = (version: ProjectVersion): OrderOpContext => ({ now: new Date().toISOString(), newId: newOrderId, lines: orderLinesFor(version) });

type Change = (version: ProjectVersion) => OrderOpResult;

/** Applies a change to a version's order record under the project lock, against the version as it is now. */
export async function changeOrder(projectId: string, version: number, change: Change): Promise<OrderOpResult & { version?: ProjectVersion }> {
  let result: OrderOpResult = { ok: false, error: "This version was removed.", status: 404 };
  let saved: ProjectVersion | undefined;
  await updateVersion(projectId, version, (v) => {
    result = change(v);
    saved = result.ok ? { ...v, order: result.order as OrderCoordination } : v;
    return saved;
  });
  return { ...result, version: saved };
}

export const applyOp = (projectId: string, version: number, op: OrderOp) =>
  changeOrder(projectId, version, (v) => applyOrderOp(v, op, orderContext(v)));
