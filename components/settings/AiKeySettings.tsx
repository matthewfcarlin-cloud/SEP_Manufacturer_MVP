"use client";

import { useEffect, useState } from "react";
import { AI_PROVIDERS, getKeyState, removeKey, saveKey, testKey, type AiProvider, type KeyState } from "@/lib/client/aiKey";
import { buttonClasses } from "@/components/ui/classes";
import { StatusPill } from "@/components/ui/StatusPill";
import { controlClasses } from "@/components/ui/Field";

const TRUST_LINE = "Your key is encrypted and only used for your projects. Calls are billed to your provider account.";

type Note = { tone: "ok" | "error"; text: string } | null;

/** Settings → AI provider. Talks only to lib/client/aiKey.ts; shows "Coming soon" if the key routes are missing. */
export function AiKeySettings() {
  const [state, setState] = useState<KeyState | "loading">("loading");
  const [provider, setProvider] = useState<AiProvider>("anthropic");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState<"test" | "save" | "remove" | null>(null);
  const [note, setNote] = useState<Note>(null);

  useEffect(() => {
    let isLive = true;
    getKeyState().then((s) => isLive && setState(s));
    return () => {
      isLive = false;
    };
  }, []);

  if (state === "loading") {
    return <div aria-hidden className="skeleton h-72 rounded-card" />;
  }
  const isAvailable = state.available;
  const saved = state.available ? state.saved : null;
  const placeholder = AI_PROVIDERS.find((p) => p.id === provider)?.placeholder;

  const run = async (kind: "test" | "save" | "remove") => {
    setBusy(kind);
    setNote(null);
    if (kind === "test") {
      const r = await testKey(provider, key);
      setNote(r.ok ? (r.data.ok ? { tone: "ok", text: "That key works." } : { tone: "error", text: r.data.message ?? "That key didn't work." }) : { tone: "error", text: r.message });
    } else if (kind === "save") {
      const r = await saveKey(provider, key);
      if (r.ok) {
        setState({ available: true, saved: r.data });
        setKey("");
        setNote({ tone: "ok", text: "Key tested and saved. Your projects now use your key." });
      } else setNote({ tone: "error", text: r.message });
    } else {
      const r = await removeKey();
      if (r.ok) {
        setState({ available: true, saved: null });
        setNote({ tone: "ok", text: "Key removed. You're back on the demo budget." });
      } else setNote({ tone: "error", text: r.message });
    }
    setBusy(null);
  };

  return (
    <section aria-labelledby="provider-heading" className="flex flex-col gap-5 card card-pad sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="provider-heading" className="font-semibold">Your key</h2>
        {!isAvailable && <StatusPill>Coming soon</StatusPill>}
      </div>

      {saved ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-green-soft px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-ink-2">Saved key · {AI_PROVIDERS.find((p) => p.id === saved.provider)?.label} · since {new Date(saved.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
            <p className="text-[14px] font-medium">{saved.maskedKey}</p>
          </div>
          <button type="button" disabled={busy !== null} onClick={() => run("remove")} className="border border-accent px-3 py-2 text-sm font-medium text-accent-ink hover:bg-accent-soft disabled:opacity-50">
            {busy === "remove" ? "Removing…" : "Remove key"}
          </button>
        </div>
      ) : (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Provider</legend>
            <div className="flex flex-wrap gap-2">
              {AI_PROVIDERS.map((p) => (
                <label key={p.id} className={`flex h-11 items-center gap-2 rounded-control border border-border bg-surface px-3 text-[14px] has-[:checked]:border-accent has-[:checked]:bg-accent-soft ${p.isSupported ? "" : "text-ink-2"}`}>
                  <input type="radio" name="provider" value={p.id} checked={provider === p.id} disabled={!p.isSupported} onChange={() => setProvider(p.id)} />
                  {p.label}
                  {p.id === "anthropic" && <span className="text-[13px] text-ink-2">(default)</span>}
                  {!p.isSupported && <StatusPill>Coming soon</StatusPill>}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            API key
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={placeholder}
              className={controlClasses()}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!isAvailable || !key.trim() || busy !== null}
              onClick={() => run("test")}
              className={buttonClasses({ variant: "secondary", size: "sm", className: "bg-bg" })}
            >
              {!isAvailable ? "Test key · Coming soon" : busy === "test" ? "Testing…" : "Test key"}
            </button>
            <button
              type="button"
              disabled={!isAvailable || !key.trim() || busy !== null}
              onClick={() => run("save")}
              className={buttonClasses({ size: "sm" })}
            >
              {!isAvailable ? "Save · Coming soon" : busy === "save" ? "Saving…" : "Save key"}
            </button>
          </div>
        </>
      )}

      {note && (
        <p role={note.tone === "error" ? "alert" : "status"} className={`text-sm ${note.tone === "error" ? "text-accent-ink" : "text-green-ink"}`}>
          {note.text}
        </p>
      )}
      <p className="text-sm text-ink-2">{isAvailable ? TRUST_LINE : `When saving is live: ${TRUST_LINE.charAt(0).toLowerCase()}${TRUST_LINE.slice(1)} Until then, AI features use the demo budget.`}</p>
    </section>
  );
}
