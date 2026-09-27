"use client";

import { useEffect, useState } from "react";
import { AI_PROVIDERS, getKeyState, removeKey, saveKey, testKey, type AiProvider, type KeyState } from "@/lib/client/aiKey";

const inputClass = "w-full border border-line bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-ink";
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
    return <div aria-hidden className="h-72 animate-pulse border border-line bg-line/30 motion-reduce:animate-none" />;
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
    <section aria-labelledby="provider-heading" className="flex flex-col gap-5 border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="provider-heading" className="font-semibold">Your key</h2>
        {!isAvailable && <span className="eyebrow border border-line px-2 py-0.5 text-[10px] text-muted">Coming soon</span>}
      </div>

      {saved ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-bg px-4 py-3">
          <div>
            <p className="eyebrow text-[10px] text-muted">Saved key · {AI_PROVIDERS.find((p) => p.id === saved.provider)?.label} · since {new Date(saved.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
            <p className="font-mono text-sm">{saved.maskedKey}</p>
          </div>
          <button type="button" disabled={busy !== null} onClick={() => run("remove")} className="border border-accent px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-50">
            {busy === "remove" ? "Removing…" : "Remove key"}
          </button>
        </div>
      ) : (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Provider</legend>
            <div className="flex flex-wrap gap-2">
              {AI_PROVIDERS.map((p) => (
                <label key={p.id} className={`flex items-center gap-2 border border-line bg-bg px-3 py-2 text-sm has-[:checked]:border-accent ${p.isSupported ? "" : "text-muted"}`}>
                  <input type="radio" name="provider" value={p.id} checked={provider === p.id} disabled={!p.isSupported} onChange={() => setProvider(p.id)} />
                  {p.label}
                  {p.id === "anthropic" && <span className="text-xs text-muted">(default)</span>}
                  {!p.isSupported && <span className="eyebrow border border-line px-1.5 py-0.5 text-[9px]">Coming soon</span>}
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
              className={inputClass}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!isAvailable || !key.trim() || busy !== null}
              onClick={() => run("test")}
              className="border border-line bg-bg px-4 py-2 text-sm font-medium hover:border-ink disabled:opacity-50"
            >
              {!isAvailable ? "Test key · Coming soon" : busy === "test" ? "Testing…" : "Test key"}
            </button>
            <button
              type="button"
              disabled={!isAvailable || !key.trim() || busy !== null}
              onClick={() => run("save")}
              className="bg-ink px-4 py-2 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-50"
            >
              {!isAvailable ? "Save · Coming soon" : busy === "save" ? "Saving…" : "Save key"}
            </button>
          </div>
        </>
      )}

      {note && (
        <p role={note.tone === "error" ? "alert" : "status"} className={`text-sm ${note.tone === "error" ? "text-accent" : "text-idle"}`}>
          {note.text}
        </p>
      )}
      <p className="text-sm text-muted">{isAvailable ? TRUST_LINE : `When saving is live: ${TRUST_LINE.charAt(0).toLowerCase()}${TRUST_LINE.slice(1)} Until then, AI features use the demo budget.`}</p>
    </section>
  );
}
