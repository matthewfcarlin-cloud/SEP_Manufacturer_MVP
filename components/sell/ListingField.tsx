import type { ReactNode } from "react";
import { CopyButton } from "@/components/sourcing/CopyButton";

/** One listing field with its copy button, labeled the way Etsy's form names it. */
export function ListingField({ label, hint, copyText, children }: { label: string; hint?: string; copyText: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="eyebrow text-[11px] text-muted">
          {label}
          {hint && <span className="ml-2 normal-case tracking-normal text-muted/80">{hint}</span>}
        </h3>
        <CopyButton text={copyText} label={`Copy ${label.toLowerCase()}`} />
      </div>
      {children}
    </section>
  );
}
