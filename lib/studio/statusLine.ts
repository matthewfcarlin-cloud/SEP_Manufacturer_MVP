import type { Project } from "../types";
import { latestVersion } from "../versions";
import { stageProgress } from "./stage";

/**
 * One plain-English line for a product card: where it is and what's waiting,
 * e.g. "5 quotes waiting" or "Ready to sell". Derived from the same stage
 * logic as the rail, so the two never disagree.
 */
export function statusLine(project: Project): string {
  const version = latestVersion(project);
  const { current, statuses } = stageProgress(project);
  if (statuses[current] === "done") return "Ready to sell";
  switch (current) {
    case "idea":
    case "design":
      return "Ready to see how it's made";
    case "make": {
      const quotes = version.outreach?.quotes.length ?? 0;
      if (quotes > 0) return `${quotes} quote${quotes === 1 ? "" : "s"} waiting`;
      return "Ready to get quotes";
    }
    case "money":
      return "Ready to set a price";
    case "launch":
      return "Ready to plan the launch";
    case "sell":
      return "Ready to write the listing";
  }
}

export type StatusTone = "green" | "accent" | "neutral";

/** The pill color for a status line: green when ready to sell, orange when something is waiting on the creator. */
export function statusTone(status: string): StatusTone {
  if (/^Ready to sell/.test(status)) return "green";
  if (/waiting|Ready to get quotes|Ready to see/.test(status)) return "accent";
  return "neutral";
}
