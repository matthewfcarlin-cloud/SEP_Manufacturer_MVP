"use client";

import { ArrowUp, Sparkles, Square } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { AiErrorBanner } from "@/components/AiErrorBanner";
import { buttonClasses, cx } from "@/components/ui/classes";
import { emphasize, type AnswerAction } from "@/lib/agent/answerFormat";
import { MAX_AGENT_MESSAGE_CHARS } from "@/lib/agent/request";
import type { AgentMessage } from "@/lib/types";
import type { useAgentChat } from "./useAgentChat";

export const TELL_ME_MORE = "Tell me more.";

/** The input grows with what's typed, up to five lines. */
const MAX_INPUT_LINES = 5;
const LINE_PX = 24;

type Props = {
  chat: ReturnType<typeof useAgentChat>;
  greeting: ReactNode;
  starters: readonly string[];
  /** Shown under an answer, e.g. "Start a new product" on the full page. */
  afterAnswer?: ReactNode;
  /** Buttons to the screens an answer talks about ("Apply this tweak", "Open quotes"). */
  actionsFor?: (answer: string) => readonly AnswerAction[];
  footer: ReactNode;
  inputId: string;
  autoFocus?: boolean;
};

function MokoAvatar() {
  return (
    <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-pill bg-accent text-white">
      <Sparkles size={13} strokeWidth={2} />
    </span>
  );
}

/** Three dots bouncing while Moko thinks. */
function Typing() {
  return (
    <span role="status" aria-label="Moko is typing" className="flex h-6 items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} aria-hidden className="h-1.5 w-1.5 rounded-pill bg-muted motion-safe:animate-[typing-bounce_1.2s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

function Message({ message, isStreaming }: { message: AgentMessage; isStreaming: boolean }) {
  if (message.role === "user") {
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-card rounded-br-[4px] bg-ink px-4 py-2.5 text-[15px] leading-relaxed text-bg">{message.content}</p>
      </li>
    );
  }
  return (
    <li className="flex gap-2.5">
      <MokoAvatar />
      {message.content ? (
        <p className="min-w-0 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
          {emphasize(message.content).map((part, i) => (part.isBold ? <strong key={i} className="font-semibold">{part.text}</strong> : <span key={i}>{part.text}</span>))}
        </p>
      ) : (
        isStreaming && <Typing />
      )}
    </li>
  );
}

/** The conversation: greeting and suggested questions, streamed answers with their next steps, and the input. */
export function ChatThread({ chat, greeting, starters, afterAnswer, actionsFor, footer, inputId, autoFocus = false }: Props) {
  const { messages, isStreaming, isFull, error, ask, stop } = chat;
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const last = messages.at(-1);
  const lastAnswer = !isStreaming && last?.role === "assistant" ? last.content : null;

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Auto-grow: one line to start, up to five, then scroll.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_LINES * LINE_PX)}px`;
  }, [draft]);

  const send = (text: string) => {
    void ask(text);
    setDraft("");
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (draft.trim()) send(draft);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (draft.trim() && !isStreaming) send(draft);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2.5">
              <MokoAvatar />
              <div className="min-w-0 text-[15px] leading-relaxed">{greeting}</div>
            </div>
            <div className="flex flex-wrap gap-2 pl-[34px]">
              {starters.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-pill border border-border bg-surface px-3.5 py-1.5 text-left text-[14px] text-ink transition-colors hover:bg-accent-soft"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol ref={listRef} className="flex flex-col gap-4" aria-live="polite">
            {messages.map((m, i) => (
              <Message key={i} message={m} isStreaming={isStreaming && i === messages.length - 1} />
            ))}
          </ol>
        )}
        {lastAnswer !== null && !isFull && (
          <div className="mt-3 flex flex-wrap items-center gap-2 pl-[34px]">
            {actionsFor?.(lastAnswer).map((a) => (
              <Link key={a.href} href={a.href} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                {a.label}
              </Link>
            ))}
            <button type="button" onClick={() => send(TELL_ME_MORE)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
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
        {isFull && <p className="type-small mt-3 text-muted">This conversation is at its limit. Reload the page to start a new one.</p>}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-2 border-t border-border p-4">
        <div className="flex items-end gap-2 rounded-[14px] border border-control-border bg-surface py-1.5 pl-3.5 pr-1.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)]">
          <label className="sr-only" htmlFor={inputId}>
            Your question
          </label>
          <textarea
            id={inputId}
            ref={inputRef}
            rows={1}
            maxLength={MAX_AGENT_MESSAGE_CHARS}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={isFull}
            placeholder="Ask in your own words…"
            className="min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 text-ink placeholder:text-muted focus:outline-none"
          />
          {isStreaming ? (
            <button type="button" onClick={stop} aria-label="Stop" className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-ink text-bg transition-opacity hover:opacity-90">
              <Square aria-hidden size={14} strokeWidth={2} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Send"
              disabled={!draft.trim() || isFull}
              className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-40")}
            >
              <ArrowUp aria-hidden size={18} strokeWidth={2} />
            </button>
          )}
        </div>
        <p className="type-small text-muted">Enter to send · Shift+Enter for a new line</p>
        <p className="type-small text-muted">{footer}</p>
      </form>
    </div>
  );
}
