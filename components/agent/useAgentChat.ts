"use client";

import { useRef, useState } from "react";
import { decodeAgentEvents } from "@/lib/agent/protocol";
import { MAX_AGENT_TURNS } from "@/lib/agent/request";
import type { ApiResponse } from "@/lib/api";
import { AiCallError } from "@/lib/client/aiError";
import type { AgentMessage } from "@/lib/types";

/** Streams one answer, calling onText for each piece. Throws with a user-safe message on failure. */
async function streamAnswer(url: string, body: object, signal: AbortSignal, onText: (text: string) => void): Promise<void> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  if (!res.ok || !res.body) {
    const json = (await res.json().catch(() => null)) as ApiResponse<never> | null;
    throw new AiCallError(json?.error ?? "Moko couldn't answer. Please try again.", res.status);
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
      if (event.type === "error") throw new AiCallError(event.message, 0);
    }
  }
}

/**
 * One Ask Moko conversation: sends the history to `url` with `extra` fields
 * (e.g. the product and page), streams the answer in, and keeps the turns
 * alternating even when an answer fails.
 */
export function useAgentChat(url: string, extra: () => object) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isFull = messages.length >= MAX_AGENT_TURNS - 1;

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || isStreaming || isFull) return;
    const history: AgentMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setError(null);
    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamAnswer(url, { ...extra(), messages: history }, controller.signal, (piece) =>
        setMessages((ms) => [...ms.slice(0, -1), { role: "assistant", content: ms[ms.length - 1].content + piece }]),
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        setError({ message: err instanceof Error ? err.message : "Something went wrong.", status: err instanceof AiCallError ? err.status : 0 });
      }
    } finally {
      // Drop an empty answer so the conversation still alternates for the next question.
      setMessages((ms) => (ms[ms.length - 1]?.content ? ms : ms.slice(0, -2)));
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  return { messages, isStreaming, isFull, error, ask, stop: () => abortRef.current?.abort() };
}
