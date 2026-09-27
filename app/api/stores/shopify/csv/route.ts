import { fail } from "@/lib/api";
import { orderLinesFor } from "@/lib/orders/lines";
import { planOrder } from "@/lib/orders/plan";
import { productHandle, shopifyProductCsv, storeReadiness } from "@/lib/sell/stores";
import { findVersion } from "@/lib/versionLookup";

/**
 * The listing as a Shopify product CSV (a draft product), for Products >
 * Import in the creator's Shopify admin. Only once the order plan is signed off.
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const versionNumber = Number(params.get("version"));
  if (!params.get("projectId") || !Number.isInteger(versionNumber) || versionNumber < 1) return fail("Pass ?projectId=…&version=N.", 400);
  const found = await findVersion(params.get("projectId")!, versionNumber);
  if (found instanceof Response) return found;
  const { project, version } = found;
  const readiness = storeReadiness(project.id, version);
  if (!readiness.ready) return fail(readiness.message, 409);

  const plan = planOrder(version, orderLinesFor(version));
  const csv = shopifyProductCsv(version.listing!, { vendor: project.name, inventory: readiness.runQuantity, unitCostUsd: plan.totals.perUnitUsd.high });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${productHandle(version.listing!.title)}-shopify.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
