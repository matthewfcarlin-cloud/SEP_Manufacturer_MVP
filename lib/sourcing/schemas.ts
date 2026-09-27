import { z } from "zod";
import { MAX_MESSAGE_CHARS, SUPPLIER_STATUSES, processSchema, supplierQuoteSchema } from "../schemas";

// AI output schemas (structural for the model, plus rules that trigger one
// retry) and the edit operations the sourcing panel may send.

export const SEARCH_TERMS = { min: 3, max: 5 } as const;
export const SUPPLIER_CHECKS = { min: 4, max: 8 } as const;
export const RFQ_WORD_LIMIT = 220;
export const DRAFT_WORD_LIMIT = 200;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export const sourcingPlanOutputSchema = z.object({
  searchTerms: z
    .array(z.string())
    .describe(`${SEARCH_TERMS.min}-${SEARCH_TERMS.max} short phrases (2-6 words) a buyer would type into Alibaba.com's search box to find factories that make this part with the chosen process. Most specific first. English, no quotes or operators.`),
  supplierChecks: z
    .array(z.string())
    .describe(`${SUPPLIER_CHECKS.min}-${SUPPLIER_CHECKS.max} concrete things to check on a listing or supplier profile before shortlisting, specific to this part and process (e.g. 'Shows in-house die-casting, not just trading: look for machine photos'). One sentence each.`),
  rfq: z
    .string()
    .describe(`A request for quotation under ${RFQ_WORD_LIMIT} words, ready to paste into Alibaba's message box or RFQ form. Spec-level facts only. Ask for unit price at the target quantity and one higher tier, MOQ, tooling/mold cost and who owns the mold, sample cost and lead time, production lead time, and FOB port. Plain text, no placeholders in brackets except [Your name].`),
});

export const sourcingPlanAnswerSchema = sourcingPlanOutputSchema.superRefine((p, ctx) => {
  if (p.searchTerms.length < SEARCH_TERMS.min || p.searchTerms.length > SEARCH_TERMS.max) {
    ctx.addIssue({ code: "custom", path: ["searchTerms"], message: `need ${SEARCH_TERMS.min}-${SEARCH_TERMS.max} phrases, got ${p.searchTerms.length}` });
  }
  p.searchTerms.forEach((t, i) => {
    if (words(t) < 1 || words(t) > 8) ctx.addIssue({ code: "custom", path: ["searchTerms", i], message: "keep each phrase to 2-6 words" });
  });
  if (p.supplierChecks.length < SUPPLIER_CHECKS.min || p.supplierChecks.length > SUPPLIER_CHECKS.max) {
    ctx.addIssue({ code: "custom", path: ["supplierChecks"], message: `need ${SUPPLIER_CHECKS.min}-${SUPPLIER_CHECKS.max} checks, got ${p.supplierChecks.length}` });
  }
  const rfqWords = words(p.rfq);
  if (rfqWords < 40) ctx.addIssue({ code: "custom", path: ["rfq"], message: "write a complete quote request" });
  if (rfqWords > RFQ_WORD_LIMIT * 1.25) ctx.addIssue({ code: "custom", path: ["rfq"], message: `keep it under ${RFQ_WORD_LIMIT} words (got ${rfqWords})` });
});

export const supplierDraftOutputSchema = z.object({
  message: z.string().describe(`The next message to send this supplier, under ${DRAFT_WORD_LIMIT} words, plain text, in the buyer's voice. Never state the walk-away price.`),
  rationale: z.string().describe("One or two sentences for the buyer only (never sent): why this message, and what to watch for in the reply."),
});

export const supplierDraftAnswerSchema = supplierDraftOutputSchema.superRefine((d, ctx) => {
  const n = words(d.message);
  if (n < 15) ctx.addIssue({ code: "custom", path: ["message"], message: "write a complete message" });
  if (n > DRAFT_WORD_LIMIT * 1.25) ctx.addIssue({ code: "custom", path: ["message"], message: `keep it under ${DRAFT_WORD_LIMIT} words (got ${n})` });
  if (words(d.rationale) < 5) ctx.addIssue({ code: "custom", path: ["rationale"], message: "explain the move in a real sentence" });
});

export type SupplierDraft = z.infer<typeof supplierDraftOutputSchema>;

const messageText = z.string().trim().min(1, "The message is empty.").max(MAX_MESSAGE_CHARS, `Keep messages under ${MAX_MESSAGE_CHARS} characters.`);

/** Only http(s) links are stored, so a pasted `javascript:` URL can never become a link. */
const listingUrl = z
  .string()
  .trim()
  .max(500, "That link is too long.")
  .refine((u) => {
    try {
      return ["http:", "https:"].includes(new URL(u).protocol);
    } catch {
      return false;
    }
  }, "Paste the full listing link, starting with https://.");

export const supplierFieldsSchema = z.object({
  name: z.string().trim().min(1, "Give the supplier a name.").max(120, "Keep the name under 120 characters."),
  listingUrl: listingUrl.optional(),
  quote: supplierQuoteSchema.optional(),
  notes: z.string().trim().max(1000, "Keep notes under 1,000 characters.").optional(),
});

const supplierId = z.string().regex(/^[A-Za-z0-9_-]{8,16}$/);

export const sourcingOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("addSupplier"), supplier: supplierFieldsSchema }),
  // `supplier` replaces all editable fields at once, so leaving one out clears it.
  z.object({ op: z.literal("updateSupplier"), supplierId, supplier: supplierFieldsSchema.optional(), status: z.enum(SUPPLIER_STATUSES).optional() }),
  z.object({ op: z.literal("removeSupplier"), supplierId }),
  z.object({ op: z.literal("addReply"), supplierId, text: messageText }),
  z.object({ op: z.literal("saveDraft"), supplierId, text: messageText }),
  z.object({ op: z.literal("markSent"), supplierId, messageId: supplierId }),
  z.object({ op: z.literal("discardDraft"), supplierId }),
]);

export type SourcingOp = z.infer<typeof sourcingOpSchema>;

export const planRequestSchema = z.object({ projectId: z.string(), version: z.number().int().positive(), process: processSchema.optional() });
