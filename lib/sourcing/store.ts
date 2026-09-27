import { randomBytes } from "node:crypto";
import { updateVersion } from "../projectStore";
import type { Sourcing } from "../types";
import { applySourcingOp, type OpContext, type OpResult } from "./ops";
import type { SourcingOp } from "./schemas";

export const newSourcingId = () => randomBytes(9).toString("base64url");

export const opContext = (): OpContext => ({ now: new Date().toISOString(), newId: newSourcingId });

type Change = (current: Sourcing | undefined) => OpResult;

/** Applies a change to a version's sourcing under the project lock. */
export async function changeSourcing(projectId: string, version: number, change: Change): Promise<OpResult> {
  let result: OpResult = { ok: false, error: "This version was removed.", status: 404 };
  await updateVersion(projectId, version, (v) => {
    result = change(v.sourcing);
    return result.ok ? { ...v, sourcing: result.sourcing } : v;
  });
  return result;
}

export const applyOp = (projectId: string, version: number, op: SourcingOp) =>
  changeSourcing(projectId, version, (current) => applySourcingOp(current, op, opContext()));
