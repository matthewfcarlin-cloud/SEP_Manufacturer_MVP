import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AiBudgetNote } from "@/components/AiBudgetNote";
import { PageHeader } from "@/components/PageHeader";
import { ListingField } from "@/components/sell/ListingField";
import { WriteListingButton } from "@/components/sell/WriteListingButton";
import { getAccessibleProject } from "@/lib/access";
import { ETSY_TAG_COUNT, ETSY_TITLE_MAX } from "@/lib/schemas";
import { etsySale } from "@/lib/sell/fees";
import { latestVersion } from "@/lib/versions";

export async function generateMetadata(props: PageProps<"/project/[id]/sell">): Promise<Metadata> {
  const { id } = await props.params;
  const project = (await getAccessibleProject(id))?.project;
  return { title: project ? `Sell · ${project.name}` : "Project not found" };
}

const usd = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(n).toFixed(2)}`;

/** The Sell stage: an Etsy-ready listing to copy in, field by field. */
export default async function SellPage(props: PageProps<"/project/[id]/sell">) {
  const { id } = await props.params;
  const project = (await getAccessibleProject(id))?.project;
  if (!project) notFound();
  const version = latestVersion(project);
  const listing = version.listing;
  const best = version.analysis?.paths[0];
  const chosen = version.outreach?.quotes.find((q) => q.id === version.outreach?.chosenQuoteId);
  const unitCost = chosen ? { low: chosen.unitPriceUsd, high: chosen.unitPriceUsd } : best?.unitCostUsd;
  const sale = listing ? etsySale(listing.priceUsd, unitCost) : undefined;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader
        eyebrow={
          <>
            <span>Stage 6 · Sell</span>
            <span aria-hidden>·</span>
            <span>v{version.number}</span>
          </>
        }
        title="Sell"
        description="An Etsy-ready listing: copy each field into Etsy's listing form. Direct publishing comes later."
        actions={
          <div className="flex flex-wrap gap-2">
            {["Connect Etsy shop", "Shopify"].map((label) => (
              <button key={label} type="button" disabled title="Coming soon" className="flex items-center gap-2 border border-line px-3 py-2 text-sm text-muted">
                {label}
                <span className="eyebrow border border-line px-1.5 py-0.5 text-[9px]">Coming soon</span>
              </button>
            ))}
          </div>
        }
      />

      {!version.analysis || !version.businessCase ? (
        <div className="flex flex-col items-start gap-3 border border-dashed border-line p-8">
          <p className="font-semibold">{!version.analysis ? `Analyze v${version.number} first` : "Set a retail price first"}</p>
          <p className="max-w-lg text-sm text-muted">The listing uses the analysis for what the product is and the business case for its price.</p>
          <Link
            href={`/project/${project.id}?v=${version.number}#${!version.analysis ? "analysis-heading" : "business-case-heading"}`}
            className="bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
          >
            {!version.analysis ? "Go to the analysis" : "Open the business case"}
          </Link>
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3 border border-line bg-surface p-5">
            <WriteListingButton projectId={project.id} version={version.number} hasListing={Boolean(listing)} />
            <AiBudgetNote />
          </section>

          {listing ? (
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="flex flex-col gap-4">
                <ListingField label="Title" hint={`${listing.title.length}/${ETSY_TITLE_MAX}`} copyText={listing.title}>
                  <p className="text-lg font-medium">{listing.title}</p>
                </ListingField>
                <ListingField label="Description" copyText={listing.description}>
                  <p className="whitespace-pre-line text-sm leading-relaxed">{listing.description}</p>
                </ListingField>
                <ListingField label="Tags" hint={`${listing.tags.length}/${ETSY_TAG_COUNT}`} copyText={listing.tags.join(", ")}>
                  <ul className="flex flex-wrap gap-1.5">
                    {listing.tags.map((t) => (
                      <li key={t} className="border border-line bg-bg px-2 py-1 font-mono text-xs">{t}</li>
                    ))}
                  </ul>
                </ListingField>
              </div>
              <div className="flex flex-col gap-4">
                <ListingField label="Price" copyText={listing.priceUsd.toFixed(2)}>
                  <p className="display-type text-4xl tabular-nums">{usd(listing.priceUsd)}</p>
                  {sale && (
                    <dl className="mt-2 text-sm">
                      {[
                        ["Etsy fees, approx.", usd(-sale.feesUsd)],
                        ["You receive per sale", usd(sale.afterFeesUsd)],
                        ...(sale.profitUsd ? [[chosen ? "Profit per sale after the chosen quote" : "Profit per sale after unit cost, est.", sale.profitUsd.low === sale.profitUsd.high ? usd(sale.profitUsd.low) : `${usd(sale.profitUsd.low)} to ${usd(sale.profitUsd.high)}`]] : []),
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5 last:border-0">
                          <dt className="text-muted">{k}</dt>
                          <dd className={`font-mono ${v.startsWith("−") && k.startsWith("Profit") ? "text-accent" : ""}`}>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <p className="text-xs text-muted">From your business case. Etsy fees: $0.20 listing + 6.5% transaction + 3% + $0.25 payment processing (US, approx.; shipping and ads not included).</p>
                </ListingField>
                <section className="flex flex-col gap-3 border border-line bg-surface p-5">
                  <h3 className="eyebrow text-[11px] text-muted">Photos · from your studio renders</h3>
                  {listing.photos.length ? (
                    <ul className="grid grid-cols-2 gap-2">
                      {listing.photos.map((src, i) => (
                        <li key={src} className="flex flex-col gap-1">
                          {/* eslint-disable-next-line @next/next/no-img-element -- saved render served by our own API */}
                          <img src={src} alt={`${project.name}, listing photo ${i + 1}`} className="aspect-square w-full border border-line object-cover" />
                          <a href={src.split("?")[0]} download={`${project.name}-photo-${i + 1}.png`} className="text-xs underline">
                            Download
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">
                      No renders yet. <Link href={`/project/${project.id}/pitch`} className="underline">Open the pitch kit</Link> to capture them, then rewrite the listing.
                    </p>
                  )}
                </section>
              </div>
            </div>
          ) : (
            <p className="border border-dashed border-line p-6 text-sm text-muted">No listing yet. One click writes the title, description and 13 tags.</p>
          )}
          <p className="text-xs text-muted">Etsy&apos;s API lets an app publish drafts to its own shop; publishing for other sellers needs Etsy&apos;s commercial review, so for now you copy the listing in.</p>
        </>
      )}
    </div>
  );
}
