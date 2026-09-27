"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { decodeAgentEvents } from "@/lib/agent/protocol";
import { MAX_AGENT_MESSAGE_CHARS, MAX_AGENT_TURNS } from "@/lib/agent/request";
import type { ApiResponse } from "@/lib/api";
import type { AgentMessage } from "@/lib/types";

type Props = { projectId: string; projectName: string; version: number; starters: string[] };

/** Streams one answer, calling onText for each piece. Throws with a user-safe message on failure. */
async function streamAnswer(
  body: { projectId: string; version: number; messages: AgentMessage[] },
  signal: AbortSignal,
  onText: (text: string) => void,
): Promise<void> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const json = (await res.json().catch(() => null)) as ApiResponse<never> | null;
    throw new Error(json?.error ?? "The build agent couldn't answer. Please try again.");
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    const { events, rest } = decodeAgentEvents(buffer + value);
    buffer = rest;
    for (const event of events) {
      if (event.type === "text") onText(event.text);
      if (event.type === "error") throw new Error(event.message);
    }
  }
}

function Bubble({ message, isStreaming }: { message: AgentMessage; isStreaming: boolean }) {
  const isUser = message.role === "user";
  return (
    <li className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser ? "bg-ink text-bg" : "border border-line bg-surface"
        }`}
      >
        {message.content || (isStreaming ? <span className="text-muted">Thinking…</span> : null)}
      </div>
    </li>
  );
}

/** "Ask the build agent": a side panel that answers questions about this product, grounded in its data. */
export function BuildAgent({ projectId, projectName, version, starters }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const isFull = messages.length >= MAX_AGENT_TURNS - 1;

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || isStreaming || isFull) return;
    const history: AgentMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setDraft("");
    setError(null);
    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamAnswer({ projectId, version, messages: history }, controller.signal, (piece) =>
        setMessages((ms) => [...ms.slice(0, -1), { role: "assistant", content: ms[ms.length - 1].content + piece }]),
      );
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      // Drop an empty answer so the conversation still alternates for the next question.
      setMessages((ms) => (ms[ms.length - 1]?.content ? ms : ms.slice(0, -2)));
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(draft);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void ask(draft);
    }
  };

  return (
    <div className="print:hidden">
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-bg shadow-lg hover:opacity-90"
        >
          <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />
          Ask the build agent
        </button>
      )}

      {isOpen && (
        <aside
          aria-label="Build agent"
          className="fixed inset-0 z-50 flex flex-col border-line bg-bg shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[440px] sm:border-l"
        >
          <header className="flex items-start justify-between gap-3 border-b border-line p-4">
            <div>
              <p className="eyebrow text-accent">Build agent</p>
              <h2 className="mt-1 font-semibold">Ask about {projectName}</h2>
              <p className="mt-0.5 text-xs text-muted">Design, manufacturing and selling, using this version&apos;s data.</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close build agent" className="rounded-md px-2 py-1 text-lg text-muted hover:text-ink">
              ×
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">Try one of these, or ask your own:</p>
                {starters.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void ask(q)}
                    className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left text-sm hover:border-ink"
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : (
              <ol ref={listRef} className="flex flex-col gap-3" aria-live="polite">
                {messages.map((m, i) => (
                  <Bubble key={i} message={m} isStreaming={isStreaming && i === messages.length - 1} />
                ))}
              </ol>
            )}
            {error && (
              <p role="alert" className="mt-3 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
                {error}
              </p>
            )}
            {isFull && <p className="mt-3 text-xs text-muted">This conversation is at its limit. Reload the page to start a new one.</p>}
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-2 border-t border-line p-4">
            <label className="sr-only" htmlFor="agent-input">
              Your question
            </label>
            <textarea
              id="agent-input"
              ref={inputRef}
              rows={2}
              maxLength={MAX_AGENT_MESSAGE_CHARS}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={isFull}
              placeholder="Ask about design, manufacturing or selling…"
              className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted">Uses this project&apos;s AI estimates. Shops are demo data. Counts toward your AI budget.</p>
              {isStreaming ? (
                <button type="button" onClick={() => abortRef.current?.abort()} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-ink">
                  Stop
                </button>
              ) : (
                <button type="submit" disabled={!draft.trim() || isFull} className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-40">
                  Send
                </button>
              )}
            </div>
          </form>
        </aside>
      )}
    </div>
  );
}
