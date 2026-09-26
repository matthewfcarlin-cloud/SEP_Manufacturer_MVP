import type { ModelTurn } from "../analysis/run";
import { ACTION_ESTIMATE_USD, recordSpend, type AiAction } from "./budget";
import { costOfTurn } from "./pricing";

/**
 * Wraps a model call so each turn's real cost is charged to this browser.
 * When usage is unknown (the SDK couldn't parse a cut-off answer, which was
 * still billed), the action's conservative estimate is charged instead.
 */
export function metered<A>(call: (input: A) => Promise<ModelTurn>, ownerHash: string, action: AiAction): (input: A) => Promise<ModelTurn> {
  return async (input) => {
    const turn = await call(input);
    await recordSpend(ownerHash, turn.usage ? costOfTurn(turn.usage) : ACTION_ESTIMATE_USD[action]);
    return turn;
  };
}
