import Link from "next/link";
import { CopyButton } from "@/components/sourcing/CopyButton";
import { amazonFields, type StoreReadiness } from "@/lib/sell/stores";
import type { EtsyListing, StoreListing } from "@/lib/types";
import { EtsyStoreCard } from "./EtsyStoreCard";
import { StoreCard } from "./StoreCard";

/**
 * "Put it in a store": Etsy (live connection, drafts only), Shopify (CSV
 * import) and Amazon (guided, by hand). Locked until the product is confirmed.
 */
export function StoreChannels({
  projectId,
  version,
  readiness,
  listing,
  etsy,
  drafts,
  connectResult,
}: {
  projectId: string;
  version: number;
  readiness: StoreReadiness;
  listing: EtsyListing | undefined;
  etsy: { configured: boolean; shopName: string | null };
  drafts: StoreListing[];
  connectResult?: string;
}) {
  return (
    <section aria-labelledby="stores-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="eyebrow text-[11px] text-muted">Once the order is confirmed</p>
        <h2 id="stores-heading" className="display-type text-[clamp(1.8rem,3.5vw,2.6rem)]">
          Put it in a store
        </h2>
        <p className="max-w-2xl text-sm text-muted">
          The same listing goes to each store. Moko only ever creates drafts or files for you to review: nothing goes live until you publish it in the store yourself.
        </p>
      </div>

      {!readiness.ready ? (
        <div className="flex flex-col items-start gap-3 border border-dashed border-line p-6">
          <p className="font-semibold">Stores unlock when the product is confirmed</p>
          <p className="max-w-lg text-sm text-muted">{readiness.message}</p>
          <Link href={readiness.cta.href} className="bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90">
            {readiness.cta.label}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <EtsyStoreCard
            projectId={projectId}
            version={version}
            configured={etsy.configured}
            shopName={etsy.shopName}
            runQuantity={readiness.runQuantity}
            drafts={drafts.filter((d) => d.channel === "etsy")}
            connectResult={connectResult}
          />

          <StoreCard name="Shopify" status="CSV import">
            <p className="text-sm text-muted">
              Download the listing as a Shopify product file, then import it in your Shopify admin under Products, Import. It arrives as a draft with the price, tags and
              {` ${readiness.runQuantity.toLocaleString("en-US")}`} units in stock (this run). Add the photos from above in Shopify&apos;s product editor.
            </p>
            <a href={`/api/stores/shopify/csv?projectId=${encodeURIComponent(projectId)}&version=${version}`} className="self-start bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90">
              Download Shopify CSV
            </a>
            <p className="text-xs text-muted">A direct Shopify connection needs an app in your store&apos;s Dev Dashboard; it isn&apos;t set up yet.</p>
          </StoreCard>

          {listing && <AmazonCard listing={listing} />}
        </div>
      )}
    </section>
  );
}

function AmazonCard({ listing }: { listing: EtsyListing }) {
  const fields = amazonFields(listing);
  return (
    <StoreCard name="Amazon" status="By hand">
      <p className="text-sm text-muted">
        Amazon needs a Professional seller account and, for a new product, a UPC barcode or a brand exemption. Then use Add a Product in Seller Central and paste these in.
      </p>
      <ul className="flex flex-col gap-2 text-sm">
        {[
          ["Product title", fields.title],
          ["Description", fields.description],
          ["Search terms", fields.searchTerms],
          ["Price", listing.priceUsd.toFixed(2)],
        ].map(([label, text]) => (
          <li key={label} className="flex items-center justify-between gap-2 border-b border-line pb-2 last:border-0">
            <span className="min-w-0 truncate">
              <span className="text-muted">{label}:</span> {text}
            </span>
            <CopyButton text={text} label="Copy" />
          </li>
        ))}
      </ul>
      <a href="https://sellercentral.amazon.com/product-search" target="_blank" rel="noopener noreferrer" className="self-start border border-line px-4 py-2 text-sm hover:border-ink">
        Open Seller Central
      </a>
      <p className="text-xs text-muted">Amazon&apos;s Selling Partner API needs a registered developer app; a direct connection isn&apos;t set up yet.</p>
    </StoreCard>
  );
}
