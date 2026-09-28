import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "@/components/deck/deck.css";
import { Deck } from "@/components/deck/Deck";
import { outline } from "@/components/deck/script";
import { parsePosition } from "@/components/deck/timeline";
import { buildDeckFacts } from "@/lib/deckFacts";

// The deck's own display face; the app itself uses Bricolage Grotesque.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });

export const metadata: Metadata = { title: "Pitch", robots: { index: false } };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function PresentPage({ searchParams }: PageProps<"/present">) {
  const params = await searchParams;
  const initial = parsePosition(first(params.slide), first(params.beat), outline);
  return (
    <div className={`${archivo.variable} contents`}>
      <Deck initial={initial} facts={buildDeckFacts()} />
    </div>
  );
}
