import { ok } from "@/lib/api";
import { readKeyBody, testKeyOrFail, workspaceOrFail } from "@/lib/ai/keySettings";

export const maxDuration = 30;

/** Tests an Anthropic key with a tiny call, without saving it. */
export async function POST(request: Request): Promise<Response> {
  const workspaceId = await workspaceOrFail();
  if (workspaceId instanceof Response) return workspaceId;
  const body = await readKeyBody(request);
  if (body instanceof Response) return body;
  return (await testKeyOrFail(workspaceId, body.apiKey)) ?? ok({ valid: true });
}
