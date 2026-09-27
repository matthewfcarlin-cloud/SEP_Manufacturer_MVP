import { currentOwnerHash } from "@/lib/access";
import { fail, ok } from "@/lib/api";
import { budgetStatus } from "@/lib/usage/budget";

/** This browser's demo AI budget, for the header pill and settings page. */
export async function GET(): Promise<Response> {
  const ownerHash = await currentOwnerHash();
  if (!ownerHash) return fail("Enable cookies for this site.", 400);
  return ok(await budgetStatus(ownerHash));
}
