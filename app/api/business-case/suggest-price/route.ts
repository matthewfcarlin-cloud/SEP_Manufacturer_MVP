import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { DEFAULT_QUANTITY_TIERS, DEFAULT_REVENUE_SHARE } from "@/lib/businessCase";
import { callClaudePrice, isClaudeConfigured } from "@/lib/analysis/claude";
import { aiFailure } from "@/lib/analysis/errors";
import { buildPriceBrief, runPriceSuggestion } from "@/lib/analysis/price";
import { updateVersion } from "@/lib/projectStore";
import type { BusinessCaseInputs, PriceSuggestion } from "@/lib/types";
import { findVersion } from "@/lib/versionLookup";

export const maxDuration = 60;

const bodySchema = z.object({ projectId: z.string(), version: z.number().int().positive() });

/** A first business case built around the AI's price, used when the version has none yet. */
function startingInputs(suggestion: PriceSuggestion): BusinessCaseInputs {
  return {
    retailPriceUsd: suggestion.suggested,
    priceSource: "ai",
    quantityTiers: [...DEFAULT_QUANTITY_TIERS],
    revenueShare: DEFAULT_REVENUE_SHARE,
    priceSuggestion: suggestion,
  };
}

/**
 * Asks the AI for a retail price and saves it on the version. A price the
 * user already set is kept; only the suggestion is replaced.
 */
export async function POST(request: Request): Promise<Response> {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "projectId": "...", "version": 1 }.', 400);

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;
  if (!isClaudeConfigured()) {
    return fail("AI pricing isn't set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server. You can still enter a price yourself.", 503);
  }

  try {
    const suggestion = await runPriceSuggestion(callClaudePrice, buildPriceBrief(found.project, found.version));
    const saved = await updateVersion(found.project.id, found.version.number, (v) => ({
      ...v,
      businessCase: v.businessCase ? { ...v.businessCase, priceSuggestion: suggestion } : startingInputs(suggestion),
    }));
    const businessCase = saved?.versions.find((v) => v.number === found.version.number)?.businessCase;
    if (!businessCase) return fail("This version was removed while it was being priced.", 404);
    return ok(businessCase);
  } catch (err) {
    return aiFailure(err, "api/business-case/suggest-price");
  }
}
