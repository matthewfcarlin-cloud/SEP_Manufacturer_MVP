"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { AiErrorBanner } from "@/components/AiErrorBanner";
import { MAX_AGENT_MESSAGE_CHARS } from "@/lib/agent/request";
import type { AgentMessage } from "@/lib/types";
import type { useAgentChat } from "./useAgentChat";

export const TELL_ME_MORE = "Tell me more.";

type Props = {
  chat: ReturnType<typeof useAgentChat>;
  greeting: ReactNode;
  starters: readonly string[];
  /** Shown under an answer, e.g. "Start a new product" on the full page. */
  afterAnswer?: ReactNode;
  footer: ReactNode;
  inputId: string;
  autoFocus?: boolean;
};

function Bubble({ message, isStreaming }: { message: AgentMessage; isStreaming: boolean }) {
  const isUser = message.role === "user";
  return (
    <li className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isUser ? "rounded-br-md bg-ink text-bg" : "rounded-bl-md border border-line bg-surface"}`}>
        {message.content || (isStreaming ? <span className="text-muted">Thinking…</span> : null)}
      </div>
    </li>
  );
}

/** The conversation itself: greeting and suggested questions, streamed answers, "Tell me more", and the input. */
export function ChatThread({ chat, greeting, starters, afterAnswer, footer, inputId, autoFocus = false }: Props) {
  const { messages, isStreaming, isFull, error, ask, stop } = chat;
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastIsAnswer = !isStreaming && messages.at(-1)?.role === "assistant";

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const send = (text: string) => {
    void ask(text);
    setDraft("");
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(draft);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-4">
            <div className="text-sm leading-relaxed">{greeting}</div>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted">Try asking</p>
              <div className="flex flex-wrap gap-2">
              {starters.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-left text-sm hover:border-ink hover:bg-bg"
                >
                  {q}
                </button>
              ))}
              </div>
            </div>
          </div>
        ) : (
          <ol ref={listRef} className="flex flex-col gap-3" aria-live="polite">
            {messages.map((m, i) => (
              <Bubble key={i} message={m} isStreaming={isStreaming && i === messages.length - 1} />
            ))}
          </ol>
        )}
        {lastIsAnswer && !isFull && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => send(TELL_ME_MORE)} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:border-ink">
              Tell me more
            </button>
            {afterAnswer}
          </div>
        )}
        {error && (
          <div className="mt-3">
            <AiErrorBanner message={error.message} status={error.status} />
          </div>
        )}
        {isFull && <p className="mt-3 text-xs text-muted">This conversation is at its limit. Reload the page to start a new one.</p>}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-2 border-t border-line p-4">
        <label className="sr-only" htmlFor={inputId}>
          Your question
        </label>
        <textarea
          id={inputId}
          ref={inputRef}
          rows={2}
          maxLength={MAX_AGENT_MESSAGE_CHARS}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={isFull}
          placeholder="Ask in your own words…"
          className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted">{footer}</p>
          {isStreaming ? (
            <button type="button" onClick={stop} className="border border-line px-3 py-1.5 text-sm font-medium hover:border-ink">
              Stop
            </button>
          ) : (
            <button type="submit" disabled={!draft.trim() || isFull} className="bg-ink px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-40">
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
