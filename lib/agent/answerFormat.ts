// How Ask Moko's answers read in the panel (design/DESIGN.md §4): key numbers
// in bold, and one or two buttons to the screen the answer talks about.

export type Segment = { text: string; isBold: boolean };

const MONEY = String.raw`\$\d[\d,]*(?:\.\d+)?(?:\s?(?:–|-|to)\s?\$\d[\d,]*(?:\.\d+)?)?`;
const PERCENT = String.raw`\d+(?:\.\d+)?%`;
const QUANTITY = String.raw`\d[\d,]*(?:\.\d+)?\s?(?:units?|days?|weeks?|months?|mm|pieces?|pcs)\b`;
const KEY = new RegExp(String.raw`\*\*(.+?)\*\*|(${MONEY}|${PERCENT}|${QUANTITY})`, "g");

/** Splits an answer into plain and bold runs: **bold** from the model, plus prices, percentages and quantities. */
export function emphasize(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(KEY)) {
    const at = match.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), isBold: false });
    out.push({ text: match[1] ?? match[2], isBold: true });
    last = at + match[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), isBold: false });
  return out;
}

export type AnswerAction = { label: string; href: string };
export type AnswerContext = { projectId: string; version: number; hasTweaks: boolean; hasQuotes: boolean; hasAnalysis: boolean };

const MAX_ACTIONS = 2;

/** Buttons under an answer, for the screens it mentions and the product actually has. */
export function answerActions(text: string, ctx: AnswerContext): AnswerAction[] {
  const base = `/project/${ctx.projectId}`;
  const candidates: [boolean, AnswerAction][] = [
    [ctx.hasTweaks && /\btweak|redesign|design change/i.test(text), { label: "Apply this tweak", href: `${base}/versions/new?from=${ctx.version}&tweak=0.0` }],
    [ctx.hasQuotes && /\bquotes?\b/i.test(text), { label: "Open quotes", href: `${base}/make#quotes-heading` }],
    [ctx.hasAnalysis && /\b(price|charge|profit|margin|break[- ]even)/i.test(text), { label: "Open the numbers", href: `${base}/money?v=${ctx.version}#business-case-heading` }],
    [/\b(listing|etsy)\b/i.test(text), { label: "Open Sell", href: `${base}/sell` }],
  ];
  return candidates.filter(([isRelevant]) => isRelevant).map(([, action]) => action).slice(0, MAX_ACTIONS);
}
