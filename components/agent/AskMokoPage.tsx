"use client";

import Link from "next/link";
import { GENERAL_STARTERS } from "@/lib/agent/pages";
import { ChatThread } from "./ChatThread";
import { useAgentChat } from "./useAgentChat";

const noExtra = () => ({});

/** Ask Moko's full page: general questions, with a way to start a new product. */
export function AskMokoPage() {
  const chat = useAgentChat("/api/ask", noExtra);
  const startProduct = (
    <Link href="/new" className="bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink hover:opacity-90">
      Start a new product →
    </Link>
  );
  return (
    <section aria-label="Ask Moko" className="flex h-[calc(100svh-3.5rem-9rem)] min-h-[28rem] flex-col border border-line bg-bg">
      <ChatThread
        chat={chat}
        inputId="ask-moko-page-input"
        autoFocus
        starters={GENERAL_STARTERS}
        afterAnswer={startProduct}
        greeting={
          <p>
            Hi, I&apos;m Moko. Tell me about your idea, or ask anything about making and selling a product: where to start, what it might cost, how to
            find a manufacturer.
          </p>
        }
        footer={
          <>
            Uses your AI budget ·{" "}
            <Link href="/settings" className="underline hover:text-ink">
              use your own key
            </Link>
          </>
        }
      />
    </section>
  );
}
