import type { Metadata } from "next";
import { Deck } from "@/components/deck/Deck";
import { outline } from "@/components/deck/script";
import { parsePosition } from "@/components/deck/timeline";
import { buildDeckFacts } from "@/lib/deckFacts";

export const metadata: Metadata = { title: "Pitch", robots: { index: false } };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function PresentPage({ searchParams }: PageProps<"/present">) {
  const params = await searchParams;
  const initial = parsePosition(first(params.slide), first(params.beat), outline);
  return <Deck initial={initial} facts={buildDeckFacts()} />;
}
