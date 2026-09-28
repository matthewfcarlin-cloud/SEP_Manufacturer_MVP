import Image from "next/image";
import { Reveal } from "./Reveal";

const STEPS = [
  {
    title: "Describe it",
    body: "Upload a 3D file or photos, or just tell Moko what you want to make.",
    image: "/landing/step-describe.jpg",
    alt: "The new product screen, asking what you want to make",
  },
  {
    title: "See how to make it",
    body: "Get the best way to make it, what each one costs, and quotes from real shops.",
    image: "/landing/step-make.jpg",
    alt: "A product in the studio, with the best way to make it and what it costs",
  },
  {
    title: "Start selling",
    body: "Pick a price that pays, plan the launch, and copy your listing into Etsy.",
    image: "/landing/step-sell.jpg",
    alt: "An Etsy-style listing preview with photos, title and price",
  },
] as const;

/** Three steps (§4), each shown with a real screenshot of the app. */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="py-12">
      <div className="mx-auto flex max-w-content flex-col gap-8 page-pad">
        <h2 id="how-heading" className="type-h1">How it works</h2>
        <ol className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={i * 0.08} className="flex flex-col gap-4">
                <div className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-border">
                  <Image src={step.image} alt={step.alt} width={1200} height={900} sizes="(min-width: 768px) 360px, 100vw" className="aspect-[4/3] w-full object-cover object-top" />
                </div>
                <div className="flex items-start gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-pill bg-accent-soft text-[14px] font-semibold text-accent-ink">{i + 1}</span>
                  <div>
                    <h3 className="type-h3">{step.title}</h3>
                    <p className="mt-1 text-ink-2">{step.body}</p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
