import { buildBusinessCase } from "../businessCase";
import { matchVersion } from "../match";
import { processInSentence } from "../processes";
import { getShopById } from "../shops";
import { stageProgress } from "../studio/stage";
import type { Project, Stage } from "../types";
import { latestVersion } from "../versions";

/** Three starters for a given stage, built from this product's own numbers (no AI call). */
export function starterQuestionsForStage(stage: Stage, project: Project): string[] {
  const v = latestVersion(project);
  const best = v.analysis?.paths[0];
  const runner = v.analysis?.paths[1];
  const quantity = `${v.targetQuantity.toLocaleString("en-US")} units`;
  const topMatch = best ? matchVersion(v)[0] : undefined;
  const shop = topMatch ? getShopById(topMatch.shopId)?.name : undefined;
  const retail = v.businessCase ? `$${v.businessCase.retailPriceUsd}` : undefined;

  switch (stage) {
    case "idea":
    case "design":
      if (!best) {
        return [
          "What should I put in my notes to get a better analysis?",
          "Which manufacturing process is likely for a part like this?",
          "What should I check in my CAD file before I analyze it?",
        ];
      }
      return [
        `What design changes would cut the cost of ${processInSentence(best.process)} at ${quantity}?`,
        "Which of the risks in my analysis should I fix first?",
        runner
          ? `When would ${processInSentence(runner.process)} beat ${processInSentence(best.process)} for this part?`
          : "What would make this part easier to manufacture?",
      ];
    case "make":
      if (v.outreach?.quotes.length) {
        return [
          `Which of my ${v.outreach.quotes.length} demo quotes should I choose, and why?`,
          "What should I check on a first-article sample?",
          `What should I negotiate before ordering ${quantity}?`,
        ];
      }
      return [
        shop ? `What should I ask ${shop} before placing an order?` : "How do I find a shop that can make this?",
        best ? `What drives the ${processInSentence(best.process)} cost at ${quantity}?` : "What drives manufacturing cost for a part like this?",
        "Should I order a sample first, and what should I check on it?",
      ];
    case "money": {
      const verdict = best && v.businessCase ? buildBusinessCase(v.analysis!.paths, v.businessCase).verdict : undefined;
      return [
        retail ? `How can I make money sooner at ${retail} retail?` : "What should I sell this for?",
        `How does my margin change if I order more than ${quantity}?`,
        verdict?.tone === "good" ? "Where is the profit in this plan most at risk?" : "What would make this profitable at a smaller first run?",
      ];
    }
    case "launch":
      return [
        `What's a realistic timeline from here to launch for ${quantity}?`,
        "How do I build demand before I pay for tooling?",
        "What should be in my pitch to a company that could license this?",
      ];
    case "sell":
      return [
        "Where should I sell this first: Etsy, my own site, or retail?",
        retail ? `How do I write a listing that justifies ${retail}?` : "How should I price this online?",
        "What photos and details do buyers need to see?",
      ];
  }
}

/** Starters for the product's current journey stage. */
export function starterQuestions(project: Project): string[] {
  return starterQuestionsForStage(stageProgress(project).current, project);
}
