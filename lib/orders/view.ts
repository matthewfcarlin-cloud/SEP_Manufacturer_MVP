import type { OrderCoordination, OrderLine, OrderRecipient, OrderSource, ProjectVersion } from "../types";
import { getAssemblerById, matchAssemblers, type AssemblerMatch } from "./assemblers";
import { orderLinesFor } from "./lines";
import { emptyOrder, planOrder, pricingGaps, type OrderPlan } from "./plan";
import { candidateSources, sameSource, termsFor } from "./sources";

/** Everything the order screen (and the agent) needs for one version: stored choices, the computed plan and assembler matches. */
export type OrderView = {
  order: OrderCoordination;
  lines: OrderLine[];
  plan: OrderPlan;
  assemblers: AssemblerMatch[];
  /** Sources each line can pick from, labeled. */
  options: Record<string, SourceOption[]>;
  /** Who can receive a purchase order under this plan (catalog vendors are ordered online, not by email). */
  poRecipients: { to: OrderRecipient; label: string; isDemo: boolean; email?: string }[];
  /** What the totals don't cover yet, so the screen can say "so far". */
  gaps: ReturnType<typeof pricingGaps>;
};

export type SourceOption = { source: OrderSource; label: string; isDemo: boolean };

export const ASSEMBLER_MATCHES_SHOWN = 4;

const usd = (n: number) => `$${n.toFixed(2)}`;

function optionFor(version: ProjectVersion, source: OrderSource): SourceOption {
  const t = termsFor(version, source);
  const where = source.kind === "local_quote" ? "local, demo quote" : source.kind === "alibaba" ? "Alibaba" : t.overseas ? "catalog, overseas" : "catalog";
  const price = t.unitUsd === null ? "no price yet" : `${usd(t.unitUsd)}/pc`;
  return { source, label: `${t.vendor} (${where}) · ${price}`, isDemo: t.isDemo };
}

export function orderView(version: ProjectVersion): OrderView {
  const lines = orderLinesFor(version);
  const plan = planOrder(version, lines);
  const assemblers = plan.needsAssembly ? matchAssemblers(lines, plan.runQuantity).slice(0, ASSEMBLER_MATCHES_SHOWN) : [];
  // Keep the chosen assembler visible even when it falls out of the top matches.
  if (plan.assembler && !assemblers.some((m) => m.assembler.id === plan.assembler!.id)) {
    const chosen = matchAssemblers(lines, plan.runQuantity, [plan.assembler])[0];
    if (chosen) assemblers.push(chosen);
  }

  const options: Record<string, SourceOption[]> = {};
  for (const p of plan.lines) {
    const list = candidateSources(version, p.line);
    if (p.source && !list.some((s) => sameSource(s, p.source!))) list.unshift(p.source);
    options[p.line.id] = list.map((s) => optionFor(version, s));
  }

  const poRecipients: OrderView["poRecipients"] = [];
  for (const p of plan.lines) {
    const s = p.source;
    if (!s || s.kind === "catalog" || poRecipients.some((r) => JSON.stringify(r.to) === JSON.stringify(s))) continue;
    // An Alibaba supplier's saved email (from sourcing) addresses the purchase order.
    const email = s.kind === "alibaba" ? version.sourcing?.suppliers.find((x) => x.id === s.supplierId)?.email : undefined;
    poRecipients.push({ to: s, label: p.terms?.vendor ?? "Supplier", isDemo: !!p.terms?.isDemo, ...(email && { email }) });
  }
  if (plan.assembler) poRecipients.push({ to: { kind: "assembler", assemblerId: plan.assembler.id }, label: getAssemblerById(plan.assembler.id)!.name, isDemo: true });

  return { order: version.order ?? emptyOrder(version), lines, plan, assemblers, options, poRecipients, gaps: pricingGaps(plan) };
}
