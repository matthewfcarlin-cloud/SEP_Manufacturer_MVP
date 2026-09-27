import { buildBusinessCase, MIN_HEALTHY_MARGIN, retailNeededFor } from "../businessCase";
import { formatUnitCostRange } from "../format";
import { matchVersion } from "../match";
import { processInSentence } from "../processes";
import { etsySale } from "../sell/fees";
import { getShopById } from "../shops";
import type { ProjectVersion } from "../types";

// Plain-English summaries for everyday people: numbers become verdicts.
// The exact figures stay on the page, behind "Show details".

export type Tone = "good" | "warn" | "bad" | "neutral";
export type MoneyVerdict = { tone: Tone; text: string };

const dollars = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const price = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

/** Whether this version makes money at its target quantity, in one or two sentences. */
export function moneyVerdict(version: ProjectVersion): MoneyVerdict | null {
  if (!version.analysis) return null;
  const bc = version.businessCase;
  if (!bc) return { tone: "neutral", text: "Set a price to see whether it makes money." };
  const [tier] = buildBusinessCase(version.analysis.paths, { ...bc, quantityTiers: [version.targetQuantity] }).tiers;
  const at = `At ${price(bc.retailPriceUsd)}`;
  const fairPrice = dollars(retailNeededFor(tier.allIn.mid, bc.revenueShare));
  const perSale = bc.retailPriceUsd * bc.revenueShare - tier.allIn.mid;
  if (tier.margin.mid < 0) {
    return { tone: "bad", text: `${at} you'd lose money on each one. Try a design tweak, or raise the price to about ${fairPrice}.` };
  }
  if (tier.margin.mid < MIN_HEALTHY_MARGIN) {
    return { tone: "warn", text: `${at} you'd only just make money, about ${dollars(perSale)} on each one. A price near ${fairPrice} leaves room to spare.` };
  }
  return { tone: "good", text: `${at} you'd make about ${dollars(perSale)} on each one (est.).` };
}

export type TabKey = "design" | "make" | "plan" | "pitch" | "sell";

const longDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Each tab opens with two plain lines: where things stand, and what to do. */
export function tabSummary(version: ProjectVersion, tab: TabKey): [string, string] {
  const best = version.analysis?.paths[0];
  switch (tab) {
    case "design": {
      if (!best) return ["Moko hasn't looked at this design yet.", "Run the analysis to see how it could be made and what it would cost."];
      const verdict = moneyVerdict(version);
      return [
        `The best way to make it is ${processInSentence(best.process)}, about ${formatUnitCostRange(best.unitCostUsd)} each (est.) for ${version.targetQuantity.toLocaleString("en-US")}.`,
        verdict?.text ?? "Set a price to see whether it makes money.",
      ];
    }
    case "make": {
      const outreach = version.outreach;
      const chosen = outreach?.quotes.find((q) => q.id === outreach.chosenQuoteId);
      if (chosen) {
        return [`You picked ${getShopById(chosen.shopId)?.name ?? "a shop"} at ${price(chosen.unitPriceUsd)} each (demo quote).`, "Next, plan who supplies each part and what the whole order costs."];
      }
      if (outreach?.quotes.length) return [`${outreach.quotes.length} quotes came back (demo).`, "Compare them side by side and pick the one to go with."];
      const matches = best ? Math.min(matchVersion(version).length, 5) : 0;
      return matches
        ? [`${matches} local manufacturers can make this (demo data).`, "Send them a request, or look for overseas suppliers, and compare what they offer."]
        : ["No local manufacturer matches yet.", "Look for overseas suppliers, or try a design tweak that more shops can make."];
    }
    case "plan":
      return version.plan
        ? [`Launch day is ${longDate(version.plan.launchDate)} (est.).`, "Each step below has its dates and budget; they update if you change your quote."]
        : ["There's no launch plan yet.", "Moko can draft one from your chosen quote: every step from sample to launch day, with dates."];
    case "pitch":
      return version.pitch
        ? ["Your pitch is written.", "Read it through, then share a private link with a company."]
        : ["Pitch this product to a company that could make, license or stock it.", "Moko writes it from your analysis and numbers; you edit it."];
    case "sell": {
      if (!version.listing) return ["There's no listing yet.", "Moko writes an Etsy-ready title, description and tags, priced from your numbers."];
      const sale = etsySale(version.listing.priceUsd);
      return [`Your Etsy listing is ready at ${price(version.listing.priceUsd)}.`, `After Etsy's fees you'd keep about ${price(sale.afterFeesUsd)} per sale.`];
    }
  }
}
