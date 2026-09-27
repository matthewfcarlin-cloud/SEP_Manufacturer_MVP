import { z } from "zod";
import { MAX_RUN_QUANTITY, orderMessagePurposeSchema, orderRecipientSchema, orderSourceSchema } from "../schemas";

// The edits the order panel may send, and the AI draft's output schema.

export const ORDER_DRAFT_WORD_LIMIT = 260;
export const MAX_ORDER_MESSAGE_CHARS = 6000;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

const messageId = z.string().regex(/^[A-Za-z0-9_-]{8,16}$/);
const lineId = z.string().min(1).max(64);

export const orderOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("setRun"), runQuantity: z.number().int().positive("Build at least one unit.").max(MAX_RUN_QUANTITY, `Keep a run to ${MAX_RUN_QUANTITY.toLocaleString("en-US")} units or fewer.`) }),
  z.object({ op: z.literal("assign"), lineId, source: orderSourceSchema }),
  z.object({ op: z.literal("unassign"), lineId }),
  z.object({ op: z.literal("chooseAssembler"), assemblerId: z.string().regex(/^[a-z0-9-]+$/).nullable() }),
  z.object({
    op: z.literal("saveDraft"),
    to: orderRecipientSchema,
    purpose: orderMessagePurposeSchema,
    subject: z.string().trim().min(1, "Add a subject line.").max(200, "Keep the subject under 200 characters."),
    text: z.string().trim().min(1, "The message is empty.").max(MAX_ORDER_MESSAGE_CHARS, `Keep messages under ${MAX_ORDER_MESSAGE_CHARS.toLocaleString("en-US")} characters.`),
  }),
  z.object({ op: z.literal("discardDraft"), messageId }),
  z.object({ op: z.literal("markSent"), messageId }),
  z.object({ op: z.literal("signOff") }),
  z.object({ op: z.literal("withdrawSignOff") }),
]);

export type OrderOp = z.infer<typeof orderOpSchema>;

export const orderDraftRequestSchema = z.object({
  projectId: z.string(),
  version: z.number().int().positive(),
  to: orderRecipientSchema,
  purpose: orderMessagePurposeSchema,
});

export const orderDraftOutputSchema = z.object({
  subject: z.string().describe("Email subject line, under 12 words, specific (part and quantity, or 'assembly quote'). No product name."),
  message: z.string().describe(`The email body, under ${ORDER_DRAFT_WORD_LIMIT} words, plain text, in the buyer's voice. Placeholders allowed only as [Your name] and [Ship-to address].`),
  rationale: z.string().describe("One or two sentences for the buyer only (never sent): what this message commits to or asks for, and what to check in the reply."),
});

export const orderDraftAnswerSchema = orderDraftOutputSchema.superRefine((d, ctx) => {
  const n = words(d.message);
  if (n < 30) ctx.addIssue({ code: "custom", path: ["message"], message: "write a complete message" });
  if (n > ORDER_DRAFT_WORD_LIMIT * 1.25) ctx.addIssue({ code: "custom", path: ["message"], message: `keep it under ${ORDER_DRAFT_WORD_LIMIT} words (got ${n})` });
  if (words(d.subject) < 2 || words(d.subject) > 16) ctx.addIssue({ code: "custom", path: ["subject"], message: "write a short, specific subject line" });
  if (words(d.rationale) < 5) ctx.addIssue({ code: "custom", path: ["rationale"], message: "explain it in a real sentence" });
  const brackets = [...d.message.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
  const stray = brackets.filter((b) => b !== "Your name" && b !== "Ship-to address");
  if (stray.length) ctx.addIssue({ code: "custom", path: ["message"], message: `fill in or remove the placeholders ${stray.map((b) => `[${b}]`).join(", ")}` });
});

export type OrderDraft = z.infer<typeof orderDraftOutputSchema>;
