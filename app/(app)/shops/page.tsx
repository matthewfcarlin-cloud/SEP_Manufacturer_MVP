import type { Metadata } from "next";
import Link from "next/link";
import { DemoBadge } from "@/components/Badges";
import { PageHeader } from "@/components/PageHeader";
import { getShops } from "@/lib/shops";
import { ShopBrowser } from "./ShopBrowser";
import { NewProductButton } from "@/components/shell/NewProductButton";

export const metadata: Metadata = { title: "Manufacturers" };

/** A plain directory of the manufacturers Moko can match your product to. */
export default function ManufacturersPage() {
  const shops = getShops();
  return (
    <div className="mx-auto flex max-w-content flex-col gap-10 page-pad py-10">
      <PageHeader
        meta={
          <>
            <span>Los Angeles · {shops.length} local shops</span>
            <DemoBadge />
          </>
        }
        title="Manufacturers"
        description={
          <>
            Local shops that can make your product: what they make, how big an order they take, and how soon they can start. Moko matches
            your product to them and writes the request for you. For overseas suppliers, use Alibaba sourcing on a product&apos;s{" "}
            <Link href="/studio" className="font-medium text-blue-ink hover:underline">Make</Link> tab. All {shops.length} shops are fictional and exist only for this demo.
          </>
        }
        actions={<NewProductButton />}
      />
      <ShopBrowser shops={shops} />
    </div>
  );
}
