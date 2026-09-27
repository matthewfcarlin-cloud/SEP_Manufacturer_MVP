import { buildBusinessCase } from "../businessCase";
import { matchVersion } from "../match";
import type { Project } from "../types";
import { scaleWarning } from "../units";
import { latestVersion } from "../versions";

export type NextStep = { title: string; detail: string; href: string; cta: string };

/**
 * The single next thing to do for a product, from simple rules checked in
 * journey order (not AI, so it's instant). Each rule links to the screen
 * that does it.
 */
export function nextStep(project: Project): NextStep {
  const v = latestVersion(project);
  const base = `/project/${project.id}`;
  const onVersion = `${base}?v=${v.number}`;

  const sizeWarning = v.geometry && scaleWarning(v.geometry.boundingBoxMm);
  if (sizeWarning) {
    return { title: "Fix the units", detail: sizeWarning, href: `${base}/versions/new?from=${v.number}`, cta: "Upload a new version" };
  }
  if (!v.analysis) {
    return {
      title: `Analyze v${v.number}`,
      detail: "See how it could be made, what it costs at your quantity, and which design tweaks make it cheaper. About 2 minutes.",
      href: `${onVersion}#analysis-heading`,
      cta: "Run the analysis",
    };
  }
  if (!v.businessCase) {
    return {
      title: "Set a price",
      detail: "Pick a retail price (or ask the AI for one) to see your margin and the run size where this makes money.",
      href: `${onVersion}#business-case-heading`,
      cta: "Open the business case",
    };
  }
  const verdict = buildBusinessCase(v.analysis.paths, v.businessCase).verdict;
  if (verdict.tone === "bad") {
    return {
      title: "Rework the design",
      detail: `${verdict.headline} Try the top design tweak as a new version.`,
      href: `${base}/versions/new?from=${v.number}&tweak=0.0`,
      cta: "Try a tweak",
    };
  }
  const matches = matchVersion(v);
  if (matches.length > 0) {
    const idle = matches.filter((m) => m.idleBoost).length;
    return {
      title: "Talk to a shop",
      detail: `${matches.length} demo shops can make it${idle ? `; ${idle} have machines idle this month` : ""}.`,
      href: `${onVersion}#shop-matches-heading`,
      cta: "See shop matches",
    };
  }
  if (!v.pitch) {
    return { title: "Write your pitch", detail: "Turn the analysis and numbers into a pitch for a company.", href: `${base}/pitch`, cta: "Open the pitch kit" };
  }
  return { title: "Share your pitch", detail: "Your pitch is ready. Create a private link to send it.", href: `${base}/pitch`, cta: "Open the pitch kit" };
}
