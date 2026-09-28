import { formatDimensions, formatUnitCostRange } from "../format";
import { matchVersion } from "../match";
import { processInSentence } from "../processes";
import type { Project, ProjectVersion, Stage } from "../types";
import { scaleWarning } from "../units";
import { moneyVerdict, tabSummary } from "./plainSummary";
import { stageHref } from "./stageRoutes";

// The summary card at the top of each stage screen (design/DESIGN.md §3–4):
// one verdict sentence, one line of explanation, and ONE action.

export type SummaryTone = "good" | "check" | "bad";
export type SummaryAction =
  | { kind: "link"; label: string; href: string; /** Opens another site in a new tab. */ isExternal?: boolean }
  | { kind: "analyze" }
  | { kind: "draftPlan" }
  | { kind: "writeListing" };
export type StageSummary = { tone: SummaryTone; title: string; explanation: string; action: SummaryAction };

/** The pitch kit sits under Launch but gets its own summary. */
export type SummaryScreen = Stage | "pitch";

const link = (label: string, href: string): SummaryAction => ({ kind: "link", label, href });

/** Where a seller starts a new Etsy listing. */
export const ETSY_NEW_LISTING_URL = "https://www.etsy.com/your/shops/me/tools/listings/create";

/** "At $32 you'd lose money on each one. Try a tweak…" → the first sentence, and the rest. */
function splitSentence(text: string): [string, string] {
  const at = text.indexOf(". ");
  return at === -1 ? [text, ""] : [text.slice(0, at + 1), text.slice(at + 2)];
}

export function stageSummary(project: Project, version: ProjectVersion, screen: SummaryScreen): StageSummary {
  const id = project.id;
  const n = version.number;
  const analyzeFirst: StageSummary = {
    tone: "check",
    title: "See how it's made first.",
    explanation: "This step works from the analysis: how it gets made and what it costs. It takes about 2 minutes.",
    action: link("Go to the analysis", `${stageHref(id, "design", n)}#analysis-heading`),
  };
  const best = version.analysis?.paths[0];

  switch (screen) {
    case "idea": {
      const warning = version.geometry && scaleWarning(version.geometry.boundingBoxMm);
      const plan = `You're planning ${version.targetQuantity.toLocaleString("en-US")} units${version.budgetUsd !== undefined ? ` on a $${version.budgetUsd.toLocaleString("en-US")} budget` : ""}.`;
      const newVersion = `/project/${id}/versions/new?from=${n}`;
      if (warning) return { tone: "bad", title: "Check the units of your 3D file.", explanation: warning, action: link("Upload a new version", newVersion) };
      if (!version.geometry) return { tone: "check", title: "No 3D file yet, and that's fine.", explanation: `${plan} A 3D file gives exact sizes and costs.`, action: link("Add a 3D file", newVersion) };
      const title = `Your part measures ${formatDimensions(version.geometry.boundingBoxMm)}.`;
      return best
        ? { tone: "good", title, explanation: plan, action: link("Upload a new version", newVersion) }
        : { tone: "good", title, explanation: plan, action: link("See how to make it", stageHref(id, "design", n)) };
    }
    case "design": {
      if (!best) {
        const [title, explanation] = tabSummary(version, "design");
        return { tone: "check", title, explanation, action: { kind: "analyze" } };
      }
      const shops = Math.min(matchVersion(version).length, 5);
      const ways = version.analysis!.paths.length;
      return {
        tone: "good",
        title: `Here's the best way to make it: ${processInSentence(best.process)}, about ${formatUnitCostRange(best.unitCostUsd)} each.`,
        explanation: `${ways} ways to make it${shops ? `, and ${shops} local shops can make it (demo data)` : ""}. Estimates for ${version.targetQuantity.toLocaleString("en-US")} units.`,
        action: link("Get quotes", stageHref(id, "make")),
      };
    }
    case "money": {
      if (!best) return analyzeFirst;
      const verdict = moneyVerdict(version)!;
      const priceHref = `${stageHref(id, "money", n)}#business-case-heading`;
      if (verdict.tone === "neutral") {
        return { tone: "check", title: "Does it make money?", explanation: "Pick a retail price, or ask the AI for one, to see what you'd make on each sale.", action: link("Set a price", priceHref) };
      }
      const [title, explanation] = splitSentence(verdict.text);
      if (verdict.tone === "bad") return { tone: "bad", title, explanation, action: link("Try a design tweak", `/project/${id}/versions/new?from=${n}&tweak=0.0`) };
      return { tone: verdict.tone === "good" ? "good" : "check", title, explanation, action: link("Change the price", priceHref) };
    }
    case "make": {
      if (!best) return analyzeFirst;
      const [title, explanation] = tabSummary(version, "make");
      const makeHref = stageHref(id, "make");
      const outreach = version.outreach;
      if (outreach?.chosenQuoteId) return { tone: "good", title, explanation, action: link("Plan your launch", stageHref(id, "launch")) };
      if (outreach?.quotes.length) {
        const count = outreach.quotes.length;
        return { tone: "check", title, explanation, action: link(count === 1 ? "Look at your quote" : `Compare your ${count} quotes`, `${makeHref}#quotes-heading`) };
      }
      return matchVersion(version).length
        ? { tone: "check", title, explanation, action: link("Get quotes", `${makeHref}#request-heading`) }
        : { tone: "check", title, explanation, action: link("Find overseas suppliers", `${makeHref}#sourcing-heading`) };
    }
    case "launch": {
      if (!best) return analyzeFirst;
      const [title, explanation] = tabSummary(version, "plan");
      return version.plan ? { tone: "good", title, explanation, action: link("Get ready to sell", stageHref(id, "sell")) } : { tone: "check", title, explanation, action: { kind: "draftPlan" } };
    }
    case "pitch": {
      if (!best) return analyzeFirst;
      const [title, explanation] = tabSummary(version, "pitch");
      return version.pitch
        ? { tone: "good", title, explanation, action: link("Share a private link", "#share") }
        : { tone: "check", title, explanation, action: link("Write the pitch", "#pitch-tools") };
    }
    case "sell": {
      if (!best) return analyzeFirst;
      if (!version.businessCase) {
        return { tone: "check", title: "Set a price first.", explanation: "The listing is priced from your numbers.", action: link("Set a price", `${stageHref(id, "money", n)}#business-case-heading`) };
      }
      if (!version.listing) {
        const [title, explanation] = tabSummary(version, "sell");
        return { tone: "check", title, explanation, action: { kind: "writeListing" } };
      }
      return {
        tone: "good",
        title: tabSummary(version, "sell")[0],
        explanation: "Copy it below, then paste it into a new listing on Etsy.",
        action: { kind: "link", label: "Open Etsy", href: ETSY_NEW_LISTING_URL, isExternal: true },
      };
    }
  }
}
