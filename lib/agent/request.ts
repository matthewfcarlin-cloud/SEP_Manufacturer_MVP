import { z } from "zod";
import type { AgentMessage } from "../types";
import { AGENT_PAGES } from "./pages";

export const MAX_AGENT_MESSAGE_CHARS = 4000;
/** Keeps a conversation's cost bounded; the panel says when to start fresh. */
export const MAX_AGENT_TURNS = 24;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(MAX_AGENT_MESSAGE_CHARS),
}) satisfies z.ZodType<AgentMessage>;

const conversationSchema = z
  .array(messageSchema)
    .min(1)
    .max(MAX_AGENT_TURNS)
    .refine((ms) => ms.every((m, i) => m.role === (i % 2 === 0 ? "user" : "assistant")), {
      message: "Messages must alternate, starting with the user.",
    })
    .refine((ms) => ms.at(-1)?.role === "user", { message: "The last message must be the user's." });

export const agentRequestSchema = z.object({
  projectId: z.string(),
  version: z.number().int().positive().optional(),
  /** The product page the creator is on, so answers start from it. */
  page: z.enum(AGENT_PAGES).optional(),
  messages: conversationSchema,
});

/** Ask Moko's full page: a conversation not tied to a product. */
export const generalAgentRequestSchema = z.object({ messages: conversationSchema });
