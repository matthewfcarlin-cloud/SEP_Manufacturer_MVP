import { ok } from "@/lib/api";
import { etsyConfig } from "@/lib/sell/etsy";
import { etsySession, listShippingProfiles, sellerCategories } from "@/lib/sell/etsyClient";
import { etsyFailure, etsyNotConfigured, storeWorkspaceOrFail } from "@/lib/sell/etsyRoutes";

export const maxDuration = 30;

/** What the draft form picks from: Etsy's categories and the connected shop's shipping profiles. */
export async function GET(): Promise<Response> {
  const workspaceId = await storeWorkspaceOrFail();
  if (workspaceId instanceof Response) return workspaceId;
  const config = etsyConfig();
  if (!config) return etsyNotConfigured();
  try {
    const { connection, accessToken } = await etsySession(config, workspaceId);
    const [categories, shippingProfiles] = await Promise.all([sellerCategories(config), listShippingProfiles(config, accessToken, connection.shopId)]);
    return ok({ categories, shippingProfiles });
  } catch (err) {
    return etsyFailure(err, "api/stores/etsy/options");
  }
}
