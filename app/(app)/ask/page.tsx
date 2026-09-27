import type { Metadata } from "next";
import Link from "next/link";
import { AskMokoPage } from "@/components/agent/AskMokoPage";

export const metadata: Metadata = { title: "Ask Moko" };

/** Questions that aren't about one product yet. */
export default function AskPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display-type text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.9]">Ask Moko</h1>
          <p className="mt-2 text-muted">Not sure where to start? Ask in your own words.</p>
        </div>
        <Link href="/new" className="border border-line px-3 py-2 text-sm font-medium hover:border-ink">
          Start a new product
        </Link>
      </div>
      <AskMokoPage />
    </div>
  );
}
