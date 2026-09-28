import type { EtsyListing, LaunchPlan } from "../types";

// Small display helpers for the stage screens (design/DESIGN.md §4–5). Pure.

const mid = (a: number, b: number) => (a + b) / 2;

/**
 * "Saves about $X each" from a tweak's impact text, but only when the text is
 * about cost: a before/after dollar amount, or a percentage off the unit
 * cost or price. Anything else (cycle time, setups) returns null, so the card
 * says the impact in words instead of inventing a number.
 */
export function tweakSaving(impact: string, unitCostMid: number): number | null {
  const fromTo = impact.match(/from\s*~?\$(\d+(?:\.\d+)?)\s*to\s*~?\$(\d+(?:\.\d+)?)/i);
  if (fromTo) {
    const saving = Number(fromTo[1]) - Number(fromTo[2]);
    return saving > 0 ? saving : null;
  }
  const pct =
    impact.match(/(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*%\s*(?:lower|less|cheaper|off|reduction in)\s+(?:the\s+)?(?:unit\s+|part\s+|landed\s+)?(?:cost|price)/i) ??
    impact.match(/(?:cuts?|reduces?|lowers?)\s+(?:the\s+)?(?:unit\s+|part\s+|landed\s+)?(?:cost|price)\s+(?:by\s+)?(?:about\s+|~)?(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*%/i);
  if (!pct) return null;
  const low = Number(pct[1]);
  const share = (pct[2] ? mid(low, Number(pct[2])) : low) / 100;
  return share > 0 && share < 1 ? share * unitCostMid : null;
}

const shortDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const whole = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export type TimelineRow = { key: string; date: string; endDate: string; title: string; cost: string; isPast: boolean };

/** The launch timeline: each milestone's end date, name and cost, plus where "Today" falls between them. */
export function timelineRows(plan: LaunchPlan, today: string): { rows: TimelineRow[]; todayIndex: number } {
  const rows = plan.milestones.map((m) => ({
    key: m.key,
    date: shortDate(m.endDate),
    endDate: m.endDate,
    title: m.title,
    cost: m.budgetUsd.high === 0 ? "No cost" : m.budgetUsd.low === m.budgetUsd.high ? whole(m.budgetUsd.low) : `${whole(m.budgetUsd.low)}–${whole(m.budgetUsd.high)}`,
    isPast: m.endDate < today,
  }));
  const next = rows.findIndex((r) => r.endDate >= today);
  return { rows, todayIndex: next === -1 ? rows.length : next };
}

const AVATAR_TONES = ["green", "amber", "blue", "accent"] as const;

/** A steady soft color for a shop's initials avatar, from its name. */
export function avatarTone(name: string): (typeof AVATAR_TONES)[number] {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

/** "Copy whole listing": title, price, description and tags, ready to paste into Etsy. */
export function listingCopyText(listing: EtsyListing): string {
  return [listing.title, `Price: $${listing.priceUsd.toFixed(2)}`, listing.description, `Tags: ${listing.tags.join(", ")}`].join("\n\n");
}
