/**
 * The deck's running order. A slide is a set of beats; each click moves one
 * beat. Scenes don't own slides: every scene stays mounted and animates to
 * whatever state the current beat asks for, so objects (the ring, the logo,
 * the cells, the pedal, the stage rail) travel between slides instead of
 * cutting.
 */
export const slides = [
  { id: "title", beats: ["title"] },
  { id: "problem", beats: ["pitched", "landed", "died"] },
  { id: "questions", beats: ["questions", "noYears"] },
  { id: "idle", beats: ["machines", "idle"] },
  { id: "reveal", beats: ["moko", "upload"] },
  { id: "journey", beats: ["design", "make", "money", "launch", "sell"] },
  { id: "iterate", beats: ["before", "after"] },
  { id: "why-now", beats: ["reshoring", "inflection"] },
  { id: "field", beats: ["field", "whole"] },
  { id: "model", beats: ["model"] },
  { id: "demo", beats: ["demo"] },
  { id: "close", beats: ["ask", "thanks"] },
] as const;

export type Beat = (typeof slides)[number]["beats"][number];

export const outline = slides.map((slide) => slide.beats.length);

const beatOrder: readonly Beat[] = slides.flatMap((slide) => slide.beats);

export function isAtOrAfter(beat: Beat, milestone: Beat): boolean {
  return beatOrder.indexOf(beat) >= beatOrder.indexOf(milestone);
}

export function inBeats(beat: Beat, beats: readonly Beat[]): boolean {
  return beats.includes(beat);
}

/** Speaker notes, one line per beat. Press N while presenting to show them. */
export const notes: Record<Beat, string> = {
  title: "Hi, we're the Moko team. Moko takes a product from idea to first sale.",
  pitched: "We started with a customer discovery call: a veteran model maker who's built for Lucasfilm, Mattel and Sega. He pitched about 250 ideas a year.",
  landed: "Two landed. Two out of two hundred and fifty.",
  died: "And the rest didn't die because the designs were bad. They died on manufacturing and tooling cost.",
  questions: "Every first-time creator hits the same five questions. Can this be made? What will it cost? Who makes it? Will it make money? How do I sell it?",
  noYears: "He learned the answers over decades on factory floors. First-timers don't have decades. They juggle five or six tools and still can't answer them.",
  machines: "Here's his biggest lesson. This is every machine in the Los Angeles shops in our demo.",
  idle: "The green ones are sitting idle this month. Design around the machines that are already running, and small runs get cheap and fast. (Demo shops are fictional.)",
  moko: "So we built Moko.",
  upload: "You bring an idea: a CAD file, photos, a sketch. Here's a real one, a fuzz pedal enclosure.",
  design: "Moko measures the part and gives you the ways to make it, each priced for your quantity, with design tweaks that make it cheaper.",
  make: "Then it matches you with local shops, and machines that are idle this month rank first.",
  money: "Then the business case. Molding looks cheap per part, but the tooling bill wipes it out at 250 units, and at $32 retail nothing here makes money yet. Moko says so in plain English, before you've spent anything.",
  launch: "It builds a licensing pitch with studio renders and a 30-second commercial storyboard.",
  sell: "And it drafts the Etsy listing, priced from the business case.",
  before: "Every design change is a new version, and every version is re-priced. Here's a wall bracket.",
  after: "Moko suggested a sheet-metal redesign. The creator applied it with one click, and the unit cost dropped.",
  reshoring: "Why now? Manufacturing is coming home. (Check this stat's source before presenting.)",
  inflection: "And AI can now read 3D. For the first time, someone with no hardware background can go from an idea to a makeable design, a price and a supplier in one sitting.",
  field: "Everyone else covers one piece. Design tools stop at the model. Quoting sites need finished CAD. Marketplaces start after the product exists.",
  whole: "Moko is the only one that connects the whole journey, from idea to first sale.",
  model: "Upload and analysis are free. Pro unlocks unlimited products, outreach, plans, listings and the agent. And we take a small fee on production orders.",
  demo: "Let's show you. (Switch to the live app.)",
  ask: "Next, we're signing ten real LA shops and putting Moko in front of real creators.",
  thanks: "Thank you.",
};
