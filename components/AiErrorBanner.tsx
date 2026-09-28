import { AlertCircle } from "lucide-react";
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
    <div role="alert" className="flex gap-3 rounded-card bg-red-soft p-4 text-[14px]">
      <AlertCircle aria-hidden size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-red-ink" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="font-semibold text-ink">{TITLES[kind]}</p>
        <p>{message}</p>
        {kind === "budget" && <p className="text-ink-2">Add your own API key to keep going. Calls are then billed to your provider account, not the demo budget.</p>}
        {kind === "busy" && <p className="text-ink-2">Try again in a minute.</p>}
        {needsSettings && (
          <Link href="/settings" className="self-start font-semibold text-accent-ink hover:underline">
            {kind === "budget" ? "Use your own API key →" : "Check your key in Settings →"}
          </Link>
        )}
      </div>
    </div>
  );
}
