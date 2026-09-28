import type { Metadata } from "next";
import { AskMokoPage } from "@/components/agent/AskMokoPage";
import { NewProductButton } from "@/components/shell/NewProductButton";

export const metadata: Metadata = { title: "Ask Moko" };

/** Questions that aren't about one product yet. */
export default function AskPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 page-pad py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="type-h1">Ask Moko</h1>
          <p className="mt-2 text-ink-2">Not sure where to start? Ask in your own words.</p>
        </div>
        <NewProductButton />
      </div>
      <AskMokoPage />
    </div>
  );
}
