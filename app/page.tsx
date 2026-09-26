import Link from "next/link";
import { getShops, summarizeShops } from "@/lib/shops";

const STEPS = [
  {
    title: "Upload",
    body: "Drop in an STL, a few photos or sketches, and what you know: quantity, budget, materials.",
  },
  {
    title: "Understand",
    body: "See your part in 3D with real dimensions, volume, and wall-thickness warnings.",
  },
  {
    title: "Choose a path",
    body: "Compare 2–4 ways to make it, with cost ranges, lead times, and the design tweaks that make each one cheaper.",
  },
  {
    title: "Match and pitch",
    body: "Find local shops with idle machines that fit, then share a pitch kit with renders, a cost card, and a storyboard.",
  },
];

export default function Home() {
  const stats = summarizeShops(getShops());

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-16 sm:px-6 sm:py-24">
      <section className="flex max-w-3xl flex-col gap-6">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">
          For independent inventors and small hardware teams
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Design around the machines that are already sitting idle.
        </h1>
        <p className="text-lg text-muted">
          A good design doesn&apos;t close the deal on its own. Whether it can be made cheaply does.
          Idlefit shows you how your product could be made, which nearby shops have open capacity
          for it, and what small changes bring the cost down.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/new"
            className="rounded-lg bg-accent px-5 py-3 font-medium text-accent-ink hover:opacity-90"
          >
            Start a project
          </Link>
          <Link
            href="/shops"
            className="rounded-lg border border-line bg-surface px-5 py-3 font-medium hover:border-ink"
          >
            Browse {stats.shops} shops · {stats.idleMachines} idle machines
          </Link>
        </div>
      </section>

      <section aria-labelledby="how-it-works" className="flex flex-col gap-6">
        <h2 id="how-it-works" className="text-sm font-medium uppercase tracking-widest text-muted">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5">
              <span className="font-mono text-sm text-accent">0{i + 1}</span>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
