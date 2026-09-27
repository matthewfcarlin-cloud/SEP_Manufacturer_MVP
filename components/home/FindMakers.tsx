import Link from "next/link";
import { Reveal } from "./Reveal";

const STEPS = [
  {
    label: "Local shops",
    title: "Matched to your product",
    body: "Moko checks what each shop makes, the size it can handle and the order sizes it takes, then lists the best fits for your product.",
  },
  {
    label: "Overseas suppliers",
    title: "Found on Alibaba, with you",
    body: "Moko plans the search and writes each email for you. You send it from your own inbox, and Moko helps with every reply.",
  },
  {
    label: "Request and compare",
    title: "Quotes side by side",
    body: "One click sends a clear request to your top matches. Compare price, setup cost and timing, pick one, and plan the order.",
  },
];

/** How Moko finds and contacts the people who can make your product. */
export function FindMakers({ localShops }: { localShops: number }) {
  return (
    <section aria-labelledby="makers-heading" className="border-t border-line py-24 sm:py-32">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 sm:px-6">
        <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow text-muted">Stage 3 · Make</p>
            <h2 id="makers-heading" className="display-type mt-4 text-[clamp(2.6rem,6vw,5.5rem)]">
              Find who can
              <br />
              make it
            </h2>
          </div>
          <p className="max-w-sm text-muted">
            The hard part of a first product is finding a manufacturer and knowing what to ask. Moko does the finding and the writing; you
            make the call.
          </p>
        </Reveal>

        <ol className="grid gap-px overflow-hidden border border-line bg-line md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.label} className="bg-surface">
              <Reveal delay={i * 0.06} className="flex h-full flex-col gap-4 p-6">
                <span className="eyebrow text-accent">
                  {String(i + 1).padStart(2, "0")} · {s.label}
                </span>
                <h3 className="display-type text-3xl">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{s.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>

        <Link href="/shops" className="eyebrow self-start text-muted underline-offset-4 hover:text-ink hover:underline">
          Browse {localShops} local manufacturers (demo data) →
        </Link>
      </div>
    </section>
  );
}
