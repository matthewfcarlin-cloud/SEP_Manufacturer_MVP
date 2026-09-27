/**
 * The deck's running order. A slide is a set of beats; each click moves one
 * beat. Scenes don't own slides: every scene stays mounted and animates to
 * whatever state the current beat asks for, so objects (the ring, the logo,
 * the idea cells, the flow cards, the pedal, the stage rail) travel between
 * slides instead of cutting.
 *
 * The four sections the pitch must answer: problem and how we came to it
 * (slides 2–4), tech stack (7), target market and distribution (8), business
 * plan (11). Everything after "thanks" is appendix for the Q&A.
 */
export const slides = [
  { id: "title", beats: ["title"] },
  { id: "problem", beats: ["pitched", "landed", "died"] },
  { id: "first-timers", beats: ["questions", "tools"] },
  { id: "printify", beats: ["printify", "original"] },
  { id: "journey", beats: ["moko", "idea", "design", "make", "money", "launch", "sell"] },
  { id: "demo", beats: ["demo"] },
  { id: "tech", beats: ["stack", "gateway", "learning"] },
  { id: "market", beats: ["market", "distribution", "traction"] },
  { id: "field", beats: ["field", "whole"] },
  { id: "why-now", beats: ["reshoring", "inflection"] },
  { id: "business", beats: ["model", "margins"] },
  { id: "close", beats: ["roadmap", "ask", "thanks"] },
  { id: "appendix", beats: ["hard"] },
] as const;

export type Beat = (typeof slides)[number]["beats"][number];

export const outline = slides.map((slide) => slide.beats.length);

const beatOrder: readonly Beat[] = slides.flatMap((slide) => slide.beats);

export function isAtOrAfter(beat: Beat, milestone: Beat): boolean {
  return beatOrder.indexOf(beat) >= beatOrder.indexOf(milestone);
}

/**
 * Today's traction. Fill these in before presenting: while they're null the
 * traction beat shows today's goal instead, so the deck never shows a made-up
 * number.
 */
export const traction: { signups: number | null; ideasRun: number | null; quote: string | null } = {
  signups: null,
  ideasRun: null,
  quote: null,
};

/** Speaker notes, one per beat. Press N while presenting to show them. About 5 minutes in total. */
export const notes: Record<Beat, string> = {
  title: "Hi, we're Moko: the all-in-one studio that takes first-time creators from an idea to their first sale.",
  pitched: "We came to this through a customer discovery call with Kendall, a veteran model maker who's built for Lucasfilm, Mattel and Sega. He pitches about 250 product ideas a year.",
  landed: "Two land. Two out of two hundred and fifty.",
  died: "And the rest mostly don't die because the design was bad. They die on manufacturing and tooling cost.",
  questions: "If that happens to a pro, imagine a first-timer. They hit five questions at once: can this be made, what will it cost, who makes it, will it make money, and how do I sell it?",
  tools: "Today they juggle six or more tools to answer them: CAD tools, print communities, quoting sites, storefronts. None of them talk to each other, and none says whether the idea is makeable or profitable.",
  printify: "There's a model that already works. Printify: a print provider makes a shirt for $8, you list it on Etsy for $25, a customer orders, and Printify routes the order to the provider, who ships it to your customer. You never touch the factory.",
  original: "But that only works for catalog products, blank shirts and mugs. Nobody does it for original physical products, where the factory is the hard part. That's what we're building.",
  moko: "So we built Moko: one guided journey in six stages, where each stage hands off to the next, so a first-timer never asks 'what do I do now?'",
  idea: "Idea: you bring whatever you have, a CAD file, photos, a sketch, notes. Here's a real one, a guitar pedal enclosure.",
  design: "Design: Moko measures the part and gives every way to make it, priced for your quantity, with specific tweaks that make it cheaper. Each tweak becomes a new version you can compare.",
  make: "Make: it matches you with local shops, idle machines first, and requests quotes. Quotes are simulated in the demo, and labeled that way.",
  money: "Money: the business case. At $32 retail, it tells you straight that nothing makes money at 250 units yet. Better to learn that here than after a $10,000 tooling bill.",
  launch: "Launch: a launch plan with dates and budget, studio renders, and a licensing pitch. A landing page with a waitlist is what we're building today.",
  sell: "Sell: an Etsy-ready listing priced from the business case. Copy-and-paste today, because connecting other sellers' Etsy shops needs Etsy's commercial review.",
  demo: "Let's show you the whole thing live with one product, from idea to launch page. (Switch to the app. Two minutes.)",
  stack: "The stack. Next.js 16 and React 19, 3D in the browser with three.js. We parse STL and STEP ourselves, STEP through OpenCascade compiled to WebAssembly, and measure volume and wall thickness with ray casts. Matching, cost curves and break-even are plain tested functions, no AI.",
  gateway: "Every AI call goes through one gateway. It picks the key, the creator's own (encrypted with AES-256-GCM) or our capped house budget, routes each task to a model, validates the structured output against a schema with one retry, and meters tokens without storing any content.",
  learning: "And it learns. We log what creators do and real outcomes, only real and opted-in data, never files or notes. Similar products are already fed into the analysis prompts. Next: calibrating cost ranges from real quotes.",
  market: "Who it's for. Our beachhead is Etsy sellers who've outgrown print-on-demand and want a product that's really theirs. Then students and first-time founders, and hobby makers with a 3D printer. Small shops are the supply side.",
  distribution: "Distribution: we go where first-timers already are. USC groups, the Iovine and Young Slack, Discord, X. Our own waitlist page is the funnel, and every creator's launch page brings the next creator.",
  traction: "Here's where we are today. (Read the numbers, or today's goal if they're not in yet.)",
  field: "Competition. Everyone covers one step. Design tools stop at the model. MakerWorld assumes you own a printer. Xometry and Craftcloud need finished CAD. Printify only does catalog products. Shopify, Etsy and Kickstarter only sell.",
  whole: "We're the only one connecting design, make and sell, with manufacturability built in from day one.",
  reshoring: "Why now? Manufacturing is coming home: 36% of manufacturers in the 2026 Reshoring Survey are moving production back to the US.",
  inflection: "And AI can finally read 3D. For the first time, someone with no hardware background can go from an idea to a makeable design, a price and a supplier in one sitting.",
  model: "How we make money: free to start, a Pro subscription for everything else, and a small fee on production orders routed to shops. Printify earns from subscriptions; the order fee is our own bet.",
  margins: "Our costs stay low. Creators can bring their own AI key, the house budget is capped per browser and per day, and every call is metered.",
  roadmap: "What's next: text-to-CAD design generation, real video, checkout and payments, direct Etsy publishing, and signing our first real LA shops.",
  ask: "Our ask: try it with your idea, and introduce us to anyone with a product they've never made.",
  thanks: "Thank you. Happy to take questions.",
  hard: "Backup for Q&A. Don't present this slide.",
};
