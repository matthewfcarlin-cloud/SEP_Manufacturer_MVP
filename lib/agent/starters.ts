import { processInSentence } from "../processes";
import type { ProjectVersion } from "../types";

/** Three conversation starters built from this version's own numbers. */
export function starterQuestions(version: ProjectVersion, topShopName?: string): string[] {
  const best = version.analysis?.paths[0];
  if (!best) {
    return [
      "What should I put in my notes to get a better analysis?",
      "Which manufacturing process is likely for a part like this?",
      "How do first-time creators usually pay for a first production run?",
    ];
  }
  const quantity = version.targetQuantity.toLocaleString("en-US");
  return [
    `What design changes would cut the cost of ${processInSentence(best.process)} at ${quantity} units?`,
    topShopName ? `What should I ask ${topShopName} before placing an order?` : "How do I find a shop that can make this?",
    version.businessCase
      ? `How can I make money sooner at $${version.businessCase.retailPriceUsd} retail?`
      : "What should I sell this for, and where should I sell it first?",
  ];
}
