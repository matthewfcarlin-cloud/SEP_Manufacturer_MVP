"use client";

import Link from "next/link";
import { GENERAL_STARTERS } from "@/lib/agent/pages";
import { AiUsageFooter } from "./AiUsageFooter";
import { ChatThread } from "./ChatThread";
import { useAgentChat } from "./useAgentChat";
import { buttonClasses } from "@/components/ui/classes";

const noExtra = () => ({});

/** Ask Moko's full page: general questions, with a way to start a new product. */
export function AskMokoPage() {
  const chat = useAgentChat("/api/ask", noExtra);
  const startProduct = (
    <Link href="/new" className={buttonClasses({ size: "sm" })}>
      Start a new product →
    </Link>
  );
  return (
    <section aria-label="Ask Moko" className="card flex h-[calc(100svh-14rem)] min-h-[28rem] flex-col overflow-hidden">
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
        footer={<AiUsageFooter />}
      />
    </section>
  );
}
