import Link from "next/link";
import { classifyAiError } from "@/lib/client/aiError";

const TITLES = {
  budget: "Demo AI budget used up",
  key: "There's a problem with the AI key",
  busy: "The AI is busy",
  other: "That didn't work",
} as const;

/**
 * Shown on the screen that made an AI call when it fails: what happened, in
 * plain words, and where to fix it. Budget and key problems link to Settings.
 */
export function AiErrorBanner({ message, status }: { message: string; status: number }) {
  const kind = classifyAiError(status, message);
  const needsSettings = kind === "budget" || kind === "key";
  return (
    <div role="alert" className="flex flex-col gap-2 border border-accent/50 border-l-4 border-l-accent bg-accent/10 px-4 py-3 text-sm">
      <p className="font-semibold">{TITLES[kind]}</p>
      <p>{message}</p>
      {kind === "budget" && <p className="text-muted">Add your own API key to keep going. Calls are then billed to your provider account, not the demo budget.</p>}
      {kind === "busy" && <p className="text-muted">Try again in a minute.</p>}
      {needsSettings && (
        <Link href="/settings" className="eyebrow self-start border-b border-ink text-[11px]">
          {kind === "budget" ? "Use your own API key →" : "Check your key in Settings →"}
        </Link>
      )}
    </div>
  );
}
