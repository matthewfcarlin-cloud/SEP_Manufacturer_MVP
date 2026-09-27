import { fail, ok } from "@/lib/api";
import { etsyConfig } from "@/lib/sell/etsy";
import { storeWorkspaceOrFail } from "@/lib/sell/etsyRoutes";
import { deleteEtsyConnection, getEtsyConnection } from "@/lib/sell/etsyStore";

/** Whether Etsy is set up on this server, and which shop (if any) this browser connected. Never tokens. */
export async function GET(): Promise<Response> {
  const workspaceId = await storeWorkspaceOrFail();
  if (workspaceId instanceof Response) return workspaceId;
  const connection = await getEtsyConnection(workspaceId).catch(() => null);
  return ok({ configured: etsyConfig() !== null, connection: connection && { shopName: connection.shopName, connectedAt: connection.connectedAt } });
}

/** Forgets this browser's Etsy connection. `{ removed: boolean }`. */
export async function DELETE(): Promise<Response> {
  const workspaceId = await storeWorkspaceOrFail();
  if (workspaceId instanceof Response) return workspaceId;
  try {
    return ok({ removed: await deleteEtsyConnection(workspaceId) });
  } catch (err) {
    console.error("[api/stores/etsy] couldn't remove the connection", err instanceof Error ? err.name : typeof err);
    return fail("Couldn't disconnect Etsy. Please try again.", 500);
  }
}
