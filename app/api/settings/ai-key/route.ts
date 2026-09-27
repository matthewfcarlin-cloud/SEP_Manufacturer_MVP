import { fail, ok } from "@/lib/api";
import { readKeyBody, testKeyOrFail, workspaceOrFail } from "@/lib/ai/keySettings";
import { deleteWorkspaceKey, getKeyInfo, saveWorkspaceKey } from "@/lib/ai/keyStore";

export const maxDuration = 30;

/** This browser's saved key, masked: `{ key: AiKeyInfo | null }`. */
export async function GET(): Promise<Response> {
  const workspaceId = await workspaceOrFail();
  if (workspaceId instanceof Response) return workspaceId;
  try {
    return ok({ key: await getKeyInfo(workspaceId) });
  } catch (err) {
    console.error("[api/settings/ai-key] couldn't read the saved key's details", err instanceof Error ? err.name : typeof err);
    return fail("Couldn't load your AI key settings. Please try again.", 500);
  }
}

/** Tests the key, then saves it encrypted (replacing any earlier key). Only a key that passes its test is saved. */
export async function POST(request: Request): Promise<Response> {
  const workspaceId = await workspaceOrFail();
  if (workspaceId instanceof Response) return workspaceId;
  const body = await readKeyBody(request);
  if (body instanceof Response) return body;

  const failed = await testKeyOrFail(workspaceId, body.apiKey);
  if (failed) return failed;
  try {
    return ok(await saveWorkspaceKey(workspaceId, body.apiKey));
  } catch (err) {
    console.error("[api/settings/ai-key] couldn't save the key", err instanceof Error ? err.name : typeof err);
    return fail("The key works, but it couldn't be saved. Please try again.", 500);
  }
}

/** Removes this browser's key; AI calls go back to the demo budget. `{ removed: boolean }`. */
export async function DELETE(): Promise<Response> {
  const workspaceId = await workspaceOrFail();
  if (workspaceId instanceof Response) return workspaceId;
  try {
    return ok({ removed: await deleteWorkspaceKey(workspaceId) });
  } catch (err) {
    console.error("[api/settings/ai-key] couldn't remove the key", err instanceof Error ? err.name : typeof err);
    return fail("Couldn't remove the key. Please try again.", 500);
  }
}
