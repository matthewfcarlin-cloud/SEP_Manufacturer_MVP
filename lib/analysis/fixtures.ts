import type { Analysis } from "../types";

/** A valid analysis for tests and UI development. Not shown to users. */
export function sampleAnalysis(overrides: Partial<Analysis> = {}): Analysis {
  return {
    productSummary: "A die-cast-style enclosure for a boutique fuzz pedal.",
    detectedFeatures: ["Open-bottom shell", "2.5 mm walls", "Flat 122 × 66 mm top"],
    paths: [
      {
        process: "sheet_metal",
        fitScore: 64,
        unitCostUsd: { low: 9.5, high: 14.25 },
        toolingCostUsd: { low: 0, high: 400 },
        leadTimeDays: { low: 10, high: 15 },
        materials: ["Aluminum 5052-H32"],
        pros: ["No mold needed"],
        cons: ["Visible bend seams"],
        designTweaks: [{ change: "Split into U-channel + lid", why: "Bendable on a brake", impact: "Unlocks idle press brakes" }],
      },
      {
        process: "cnc_milling",
        fitScore: 82,
        unitCostUsd: { low: 18.333, high: 26.5 },
        toolingCostUsd: { low: 150.4, high: 500.6 },
        leadTimeDays: { low: 7.4, high: 12 },
        materials: ["Aluminum 6061-T6"],
        pros: ["Premium finish"],
        cons: ["Material waste from pocketing"],
        designTweaks: [{ change: "Increase inner corner radius to 3 mm", why: "Larger tool", impact: "~15% faster cycle" }],
      },
    ],
    topRecommendation: "Start with CNC for the first 250; revisit casting above 1,000.",
    risks: ["Wall thickness near jacks"],
    storyboard: [5, 5, 5, 5, 5, 5].map((seconds, i) => ({
      shot: i + 10,
      visual: `Shot ${i}`,
      voiceover: `Line ${i}`,
      seconds,
    })),
    ...overrides,
  };
}
