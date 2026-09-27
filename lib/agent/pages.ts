// Which product page the creator is on, so Ask Moko can open knowing it and
// suggest questions in everyday words for that page.

export const AGENT_PAGES = ["design", "make", "plan", "pitch", "sell", "compare", "new_version"] as const;
export type AgentPage = (typeof AGENT_PAGES)[number];

export const AGENT_PAGE_LABELS: Record<AgentPage, string> = {
  design: "Design & money",
  make: "Make",
  plan: "Plan",
  pitch: "Pitch",
  sell: "Sell",
  compare: "Compare versions",
  new_version: "New version",
};

const DESIGN_QUESTIONS = ["Is this too expensive to make?", "How could I make it cheaper?", "What should I charge?"];

export const PAGE_STARTERS: Record<AgentPage, readonly string[]> = {
  design: DESIGN_QUESTIONS,
  make: ["Which quote should I pick?", "What should I ask a manufacturer?", "Should I make it nearby or overseas?"],
  plan: ["Is my launch date realistic?", "What could delay my launch?", "What should I do this week?"],
  pitch: ["How do I pitch this to a company?", "What will a buyer ask me?", "Is this worth licensing?"],
  sell: ["What price should I list it at?", "How do I get my first sales?", "Is my listing good enough?"],
  compare: ["Which version is better to make?", "Did my change save money?", "What should I try next?"],
  new_version: ["Which change should I try first?", "Will this change save money?", "What do I need to upload?"],
};

/** Questions for Ask Moko's full page, not tied to one product. */
export const GENERAL_STARTERS: readonly string[] = [
  "I have an idea for a phone stand. Where do I start?",
  "How do I find a manufacturer for my product?",
  "How much does it cost to make 100 of something?",
];

const TAB_PAGES: Record<string, AgentPage> = { make: "make", plan: "plan", pitch: "pitch", sell: "sell", compare: "compare", versions: "new_version" };

/** The product page for a path like /project/abc/make; the overview is "design". */
export function agentPageFor(pathname: string): AgentPage {
  const tab = pathname.match(/^\/project\/[^/]+\/([^/?#]+)/)?.[1];
  return (tab && TAB_PAGES[tab]) || "design";
}
