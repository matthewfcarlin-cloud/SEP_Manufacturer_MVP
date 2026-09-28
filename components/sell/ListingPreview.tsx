"use client";

import { ChevronLeft, ChevronRight, Copy, ImageOff } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/classes";
import { useToast } from "@/components/ui/Toast";
import { listingCopyText } from "@/lib/studio/stageDisplay";
import type { EtsyListing } from "@/lib/types";

type Props = { listing: EtsyListing; productName: string; pitchHref: string };

/** A field with a copy icon that appears on hover or keyboard focus. */
function Copyable({ label, text, children, className }: { label: string; text: string; children: ReactNode; className?: string }) {
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ message: "Copied" });
    } catch {
      toast({ message: "Couldn't copy. Select the text and copy it instead." });
    }
  };
  return (
    <div className={cx("group relative rounded-control pr-10", className)}>
      {children}
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="absolute right-0 top-0 grid h-8 w-8 place-items-center rounded-control text-ink-2 opacity-0 transition-opacity hover:bg-hover hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
      >
        <Copy aria-hidden size={16} strokeWidth={1.75} />
      </button>
    </div>
  );
}

/**
 * How the listing will look on Etsy (design/DESIGN.md §4 Sell): photos you can
 * flip through, title, price, shop and tags. Every field copies on its own,
 * and "Copy whole listing" takes it all at once.
 */
export function ListingPreview({ listing, productName, pitchHref }: Props) {
  const toast = useToast();
  const [photo, setPhoto] = useState(0);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const count = listing.photos.length;
  const price = `$${listing.priceUsd.toFixed(2)}`;

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(listingCopyText(listing));
      toast({ message: "Copied" });
    } catch {
      toast({ message: "Couldn't copy. Copy each field instead." });
    }
  };

  return (
    <section id="listing-heading" aria-label="Your Etsy listing" className="card scroll-mt-20 overflow-hidden">
      <div className="grid @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative aspect-square bg-sidebar" aria-roledescription="carousel" aria-label="Listing photos">
          {count > 0 ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- saved render served by our own API */}
              <img src={listing.photos[photo]} alt={`${productName}, listing photo ${photo + 1} of ${count}`} className="h-full w-full object-cover" />
              {count > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() => setPhoto((p) => (p - 1 + count) % count)}
                    className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-pill bg-surface/90 text-ink shadow-card hover:bg-surface"
                  >
                    <ChevronLeft aria-hidden size={18} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => setPhoto((p) => (p + 1) % count)}
                    className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-pill bg-surface/90 text-ink shadow-card hover:bg-surface"
                  >
                    <ChevronRight aria-hidden size={18} strokeWidth={1.75} />
                  </button>
                  <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                    {listing.photos.map((src, i) => (
                      <button
                        key={src}
                        type="button"
                        aria-label={`Photo ${i + 1}`}
                        aria-current={i === photo}
                        onClick={() => setPhoto(i)}
                        className={cx("h-2 w-2 rounded-pill transition-colors", i === photo ? "bg-ink" : "bg-ink/25")}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="grid h-full place-items-center p-6 text-center">
              <div className="flex flex-col items-center gap-2 text-ink-2">
                <ImageOff aria-hidden size={28} strokeWidth={1.5} />
                <p>No photos yet.</p>
                <Link href={pitchHref} className="text-[14px] font-semibold text-accent-ink hover:underline">
                  Make studio photos in the pitch kit
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 p-5 @3xl:p-6">
          <p className="type-small text-muted">Your Etsy shop</p>
          <Copyable label="title" text={listing.title}>
            <h2 className="type-h3 leading-snug">{listing.title}</h2>
          </Copyable>
          <Copyable label="price" text={listing.priceUsd.toFixed(2)}>
            <p className="type-price-lg">{price}</p>
          </Copyable>
          <Copyable label="description" text={listing.description}>
            <p className={cx("whitespace-pre-line text-[14px] leading-relaxed text-ink-2", !isDescriptionOpen && "line-clamp-4")}>{listing.description}</p>
            <button type="button" onClick={() => setIsDescriptionOpen((o) => !o)} className="mt-1 text-[13px] font-semibold text-accent-ink hover:underline">
              {isDescriptionOpen ? "Show less" : "Read the whole description"}
            </button>
          </Copyable>
          <Copyable label="tags" text={listing.tags.join(", ")}>
            <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
              {listing.tags.map((t) => (
                <li key={t} className="rounded-pill bg-hover px-3 py-1 text-[13px] text-ink-2">
                  {t}
                </li>
              ))}
            </ul>
          </Copyable>
          <div className="mt-auto pt-2">
            <Button icon={Copy} onClick={copyAll}>
              Copy whole listing
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
