import { ChevronDown } from "lucide-react";

const QUESTIONS = [
  {
    q: "Do I need a 3D file?",
    a: "No. A few photos, a sketch or a short description is enough to start. A 3D file just makes the costs more exact.",
  },
  {
    q: "Are the shops and quotes real?",
    a: "Not yet. The local shops and their quotes are made-up demo data, and they're marked that way. The costs and prices are AI estimates.",
  },
  {
    q: "What does it cost?",
    a: "Nothing to try. Each browser gets a small demo AI budget ($3). When it runs out, you can add your own Anthropic key in Settings.",
  },
  {
    q: "Is my idea private?",
    a: "Yes. Your products belong to your browser unless you choose to share a link. Your 3D file is measured here and is never sent to the AI.",
  },
  {
    q: "Will Moko order or pay for anything?",
    a: "Never. Moko drafts messages and plans, and you decide what to send, order and pay for.",
  },
  {
    q: "How do I start selling?",
    a: "Moko writes your listing: title, description, tags and photos. Copy it into Etsy when you're ready.",
  },
] as const;

/** Common questions (§4) as accordions; native details elements, so they work without JavaScript. */
export function Faq() {
  return (
    <section aria-labelledby="faq-heading" className="py-12">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 page-pad">
        <h2 id="faq-heading" className="type-h1">Questions</h2>
        <div className="card divide-y divide-border">
          {QUESTIONS.map(({ q, a }) => (
            <details key={q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-card px-5 py-4 type-h3 hover:bg-hover sm:px-6 [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown aria-hidden size={20} strokeWidth={1.75} className="shrink-0 text-ink-2 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <p className="px-5 pb-5 text-ink-2 sm:px-6">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
