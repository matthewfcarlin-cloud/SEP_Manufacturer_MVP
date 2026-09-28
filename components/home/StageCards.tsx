import { Factory, Lightbulb, PencilRuler, PiggyBank, Rocket, Store, type LucideIcon } from "lucide-react";
import { STAGES } from "@/lib/studio/stage";
import type { Stage } from "@/lib/types";

const CARDS: Record<Stage, { icon: LucideIcon; body: string }> = {
  idea: { icon: Lightbulb, body: "Say what it is, how many and your budget." },
  design: { icon: PencilRuler, body: "Small changes that make it cheaper to make." },
  make: { icon: Factory, body: "Quotes from shops, side by side." },
  money: { icon: PiggyBank, body: "A price, and what you'd make per sale." },
  launch: { icon: Rocket, body: "Dates and costs, step by step." },
  sell: { icon: Store, body: "A listing ready to paste into Etsy." },
};

/** The six stages every product moves through (§4), as a row of icon cards. */
export function StageCards() {
  return (
    <section aria-labelledby="stages-heading" className="py-12">
      <div className="mx-auto flex max-w-content flex-col gap-8 page-pad">
        <div className="flex flex-col gap-2">
          <h2 id="stages-heading" className="type-h1">Six steps from idea to first sale</h2>
          <p className="max-w-xl text-ink-2">Every product moves through the same six steps, and Moko always shows you what to do next.</p>
        </div>
        <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {STAGES.map(({ key, label }) => {
            const { icon: Icon, body } = CARDS[key];
            return (
              <li key={key} className="card flex flex-col gap-3 p-5">
                <span className="grid size-10 place-items-center rounded-control bg-accent-soft text-accent-ink">
                  <Icon aria-hidden size={20} strokeWidth={1.75} />
                </span>
                <h3 className="type-h3">{label}</h3>
                <p className="type-small text-ink-2">{body}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
