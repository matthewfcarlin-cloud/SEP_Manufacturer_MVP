/**
 * The deck's running order. A slide is a set of beats; each click moves one
 * beat. Scenes don't own slides: every scene stays mounted and animates to
 * whatever state the current beat asks for, so objects (the ring, the logo,
 * the idea cells, the pedal, the stage rail) travel between slides instead of
 * cutting.
 *
 * Five minutes, built on the class brief's four sections, which the corner tag
 * names on every slide (`sections`): 01 problem and how we came to it, 02 tech
 * stack, 03 target market and distribution, 04 business plan. The product
 * walkthrough sits between 01 and 02 and replaces a live demo, which doesn't
 * fit in five minutes. Everything after "thanks" is appendix for the Q&A.
 */
export const slides = [
  { id: "title", beats: ["title"] },
  { id: "problem", beats: ["pitched", "landed", "died"] },
  { id: "first-timers", beats: ["questions", "tools"] },
  { id: "product", beats: ["moko", "idea", "design", "make", "outreach", "money", "sell"] },
  { id: "tech", beats: ["stack", "gateway", "learning"] },
  { id: "market", beats: ["market", "distribution", "traction"] },
  { id: "field", beats: ["field", "whole"] },
  { id: "business", beats: ["model", "margins"] },
  { id: "close", beats: ["roadmap", "ask", "thanks"] },
  { id: "appendix", beats: ["hard"] },
] as const;

export type SlideId = (typeof slides)[number]["id"];
export type Beat = (typeof slides)[number]["beats"][number];

/** Which section of the brief each slide answers, shown in the corner so the class can follow along. */
export const sections: Record<SlideId, string | null> = {
  title: null,
  problem: "01 · Problem & origin",
  "first-timers": "01 · Problem & origin",
  product: "What we built",
  tech: "02 · Tech stack",
  market: "03 · Market & distribution",
  field: "03 · Market & distribution",
  business: "04 · Business plan",
  close: null,
  appendix: "Appendix",
};

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
  title: "Hi, we're Moko. We help first-time product creators find the manufacturers who can actually make their idea, and reach out to them the right way.",
  pitched: "We came to this through a customer discovery call with Kendall, a veteran model maker who's built for Lucasfilm, Mattel and Sega. He pitches about 250 product ideas a year.",
  landed: "Two land. Two out of two hundred and fifty.",
  died: "And the rest mostly don't die because the design was bad. They die on manufacturing: nobody could make them at a price that worked. His advice: design around what real factories make, and find the one who can take your run early.",
  questions: "If that happens to a pro, imagine a first-timer. They hit the same wall: can this be made, who can make it, what do I even ask them, is the quote fair, and will it make money?",
  tools: "Today they piece it together from Google, Alibaba, supplier directories and Reddit threads, cold-email factories with a vague ask, and wait. Nothing tells them who's right for this part or what a fair price is.",
  moko: "So we built Moko. It takes an idea all the way to the right manufacturer, and then on to launch and a first sale.",
  idea: "You bring whatever you have: a CAD file, photos, notes. Here's a real one, a guitar pedal enclosure, 250 units.",
  design: "Moko measures the part and lays out every way to make it, priced for your quantity, with specific tweaks that make it cheaper to manufacture.",
  make: "Then the core: it finds the manufacturers who can make it, ranked by process, size, material, run size and how soon they can start. Local shops are fictional demo data today, and labeled that way.",
  outreach: "And it does the outreach. It writes a spec sheet that shares only what a shop needs, requests quotes, and compares them on all-in cost and lead time. For overseas suppliers it plans the Alibaba search and drafts each email; you send it yourself. Quotes here are simulated.",
  money: "Before you commit, the business case. At $32 retail it says plainly that this doesn't make money at 250 units yet. Better to learn that here than after a $10,000 tooling bill.",
  sell: "Then a dated launch plan and an Etsy-ready listing, priced from that business case.",
  stack: "The stack. Next.js 16 and React 19, 3D in the browser with three.js. We parse STL ourselves and STEP through OpenCascade compiled to WebAssembly, and measure volume and wall thickness with ray casts. Matching, quote ranking, negotiation targets and break-even are plain tested functions, no AI.",
  gateway: "Every AI call goes through one gateway. It picks the key, the creator's own, encrypted with AES-256-GCM, or our capped house budget; routes each task to a model; validates structured output against a schema with one retry; and meters tokens without storing any content.",
  learning: "And it learns from real results, only from creators who opt in, and never from files or notes. Real quotes calibrate the cost ranges, tweaks are ranked by what actually worked, and a 12-part eval harness scores every prompt change.",
  market: "Who it's for. Our beachhead is Etsy sellers who've outgrown print-on-demand and want a product that's really theirs. Then students and first-time founders, and hobby makers with a 3D printer. Manufacturers are the other side: they get clear, ready-to-quote requests instead of vague cold emails.",
  distribution: "Distribution: we go where first-timers already are. USC groups, the Iovine and Young Slack, Discord, maker subreddits. The hook is free: upload your idea and see who can make it in five minutes. Every request a creator sends introduces a shop to Moko.",
  traction: "Here's where we are today. (Read the numbers, or today's goal if they're not in yet.)",
  field: "Everyone else covers one piece. Design tools stop at the model. Alibaba and Thomasnet are directories: you still find, vet and write to suppliers yourself. Xometry and Craftcloud need finished CAD. Printify only does catalog products. Etsy and Shopify only sell.",
  whole: "We're the only one taking a first-timer from an idea to the right manufacturer, with manufacturability and profit checked before they spend.",
  model: "How we make money: free to find out if your idea can be made and who can make it. A Pro subscription for outreach, quotes, plans and listings. And once real shops are connected, a small fee on production orders routed through Moko, Printify's model for original products.",
  margins: "The margins hold because AI is our only real variable cost, and it's small: the whole trip from idea to first supplier email is about a dollar of AI at our conservative estimates. Creators can bring their own key, and the free budget is capped per browser and per day.",
  roadmap: "Next: sign our first ten real LA shops, send requests from inside Moko with the creator's approval, let real quotes feed the cost calibration, and add checkout and direct Etsy publishing.",
  ask: "Our ask: try it with your idea, and introduce us to anyone with a product they've never made, or a shop that wants small-run work.",
  thanks: "Thank you. Happy to take questions.",
  hard: "Backup for Q&A. Don't present this slide.",
};
