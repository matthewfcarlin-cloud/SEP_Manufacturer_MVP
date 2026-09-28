import { Download } from "lucide-react";
import type { Metadata } from "next";
import { AiBudgetNote } from "@/components/AiBudgetNote";
import { StageShell } from "@/components/product/StageShell";
import { ListingPreview } from "@/components/sell/ListingPreview";
import { WriteListingButton } from "@/components/sell/WriteListingButton";
import { buttonClasses } from "@/components/ui/classes";
import { StatusPill } from "@/components/ui/StatusPill";
import { getAccessibleProject } from "@/lib/access";
import { ETSY_TAG_COUNT, ETSY_TITLE_MAX } from "@/lib/schemas";
import { etsySale } from "@/lib/sell/fees";
import { loadStage } from "@/lib/studio/loadStage";
import { stageHref } from "@/lib/studio/stageRoutes";

export async function generateMetadata(props: PageProps<"/project/[id]/sell">): Promise<Metadata> {
  const { id } = await props.params;
  const project = (await getAccessibleProject(id))?.project;
  return { title: project ? `Sell · ${project.name}` : "Project not found" };
}

const usd = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(n).toFixed(2)}`;

/**
 * The Sell stage: a preview that looks like the Etsy listing, ready to copy.
 * Fees, what you keep, Etsy's limits and the photo downloads are in the details.
 */
export default async function SellPage(props: PageProps<"/project/[id]/sell">) {
  const { id } = await props.params;
  const { project, access, version } = await loadStage(id);
  const listing = version.listing;
  const best = version.analysis?.paths[0];
  const chosen = version.outreach?.quotes.find((q) => q.id === version.outreach?.chosenQuoteId);
  const unitCost = chosen ? { low: chosen.unitPriceUsd, high: chosen.unitPriceUsd } : best?.unitCostUsd;
  const sale = listing ? etsySale(listing.priceUsd, unitCost) : undefined;
  const pitchHref = `/project/${project.id}/pitch`;

  return (
    <StageShell
      project={project}
      version={version}
      access={access}
      screen="sell"
      path={stageHref(project.id, "sell")}
      highlights={listing && <ListingPreview listing={listing} productName={project.name} pitchHref={pitchHref} />}
    >
      {!version.analysis || !version.businessCase ? (
        <p className="text-ink-2">The listing uses the analysis for what the product is and your price from Money, so it appears here once both are set.</p>
      ) : (
        <>
          {listing && sale && (
            <section aria-labelledby="sale-heading" className="card card-pad flex flex-col gap-3">
              <h2 id="sale-heading" className="type-h3">
                What you keep from each sale
              </h2>
              <dl className="text-[14px]">
                {[
                  ["Price", usd(listing.priceUsd)],
                  ["Etsy's fees, about", usd(-sale.feesUsd)],
                  ["You receive", usd(sale.afterFeesUsd)],
                  ...(sale.profitUsd
                    ? [[chosen ? "Profit after the chosen quote" : "Profit after the cost of making it, est.", sale.profitUsd.low === sale.profitUsd.high ? usd(sale.profitUsd.low) : `${usd(sale.profitUsd.low)} to ${usd(sale.profitUsd.high)}`]]
                    : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-border py-2 last:border-0">
                    <dt className="text-ink-2">{k}</dt>
                    <dd className={`font-mono ${v.startsWith("−") && k.startsWith("Profit") ? "text-red-ink" : ""}`}>{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="type-small text-muted">Etsy&apos;s fees: $0.20 to list, 6.5% of the sale, and 3% + $0.25 for payment processing (US, about; shipping and ads not included).</p>
            </section>
          )}
          {listing && (
            <section aria-labelledby="limits-heading" className="card card-pad flex flex-col gap-2">
              <h2 id="limits-heading" className="type-h3">
                Within Etsy&apos;s limits
              </h2>
              <p className="text-[14px] text-ink-2">
                Title: <span className="font-mono">{`${listing.title.length}/${ETSY_TITLE_MAX}`}</span> characters · Tags: <span className="font-mono">{`${listing.tags.length}/${ETSY_TAG_COUNT}`}</span>
              </p>
            </section>
          )}
          {listing && listing.photos.length > 0 && (
            <section aria-labelledby="photos-heading" className="flex flex-col gap-3">
              <h2 id="photos-heading" className="type-h3">
                Photos to upload
              </h2>
              <ul className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
                {listing.photos.map((src, i) => (
                  <li key={src} className="flex flex-col gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- saved render served by our own API */}
                    <img src={src} alt={`${project.name}, photo ${i + 1} to download`} className="aspect-square w-full rounded-control object-cover" />
                    <a href={src.split("?")[0]} download={`${project.name}-photo-${i + 1}.png`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                      <Download aria-hidden size={16} strokeWidth={1.75} />
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="card card-pad flex flex-col items-start gap-3">
            {listing && <WriteListingButton projectId={project.id} version={version.number} hasListing />}
            <AiBudgetNote />
            <div className="flex flex-wrap gap-2">
              {["Connect Etsy shop", "Shopify"].map((label) => (
                <button key={label} type="button" disabled title="Coming soon" className={buttonClasses({ variant: "secondary", size: "sm", className: "disabled:opacity-100 text-ink-2" })}>
                  {label}
                  <StatusPill>Coming soon</StatusPill>
                </button>
              ))}
            </div>
            <p className="type-small text-muted">
              Etsy lets an app publish drafts only to its own shop until Etsy reviews it, so for now you copy the listing in.
            </p>
          </section>
        </>
      )}
    </StageShell>
  );
}
