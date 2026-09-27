// The only place the frontend talks to the "use your own API key" backend
// (built separately on feat/backend: key storage + AI gateway, BACKEND.md
// phases A1/A2). Nothing here stores, encrypts or routes keys.
//
// ASSUMED CONTRACT. BACKEND.md section 4 wasn't available when this was
// written; align these shapes with it when the backend lands:
//   GET    /api/settings/ai-key         → ApiResponse<SavedAiKey | null>
//   PUT    /api/settings/ai-key         { provider, key } → ApiResponse<SavedAiKey>
//   DELETE /api/settings/ai-key         → ApiResponse<{ removed: true }>
//   POST   /api/settings/ai-key/test    { provider, key } → ApiResponse<{ ok: boolean; message?: string }>
// Until the routes exist they answer 404, and the UI shows "Coming soon".

import type { ApiResponse } from "../api";

export const AI_PROVIDERS = [
  { id: "anthropic", label: "Anthropic (Claude)", placeholder: "sk-ant-…" },
  { id: "openai", label: "OpenAI", placeholder: "sk-…" },
] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number]["id"];

/** What the server returns for a saved key: never the key itself, only a masked form. */
export type SavedAiKey = { provider: AiProvider; maskedKey: string; savedAt: string };

export type KeyState = { available: false } | { available: true; saved: SavedAiKey | null };
export type KeyResult<T> = { ok: true; data: T } | { ok: false; message: string; comingSoon?: boolean };

const ROUTE = "/api/settings/ai-key";

async function call<T>(path: string, init?: RequestInit): Promise<KeyResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    return { ok: false, message: "Couldn't reach the server. Check your connection." };
  }
  if (res.status === 404 && !res.headers.get("content-type")?.includes("application/json")) {
    return { ok: false, message: "Using your own key is coming soon.", comingSoon: true };
  }
  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!json) return { ok: false, message: "The server sent an unexpected response." };
  return json.success ? { ok: true, data: json.data } : { ok: false, message: json.error };
}

/** Whether the key backend exists yet, and the saved key (masked) if there is one. */
export async function getKeyState(): Promise<KeyState> {
  const result = await call<SavedAiKey | null>(ROUTE);
  if (!result.ok) return { available: false };
  return { available: true, saved: result.data };
}

export const saveKey = (provider: AiProvider, key: string) => call<SavedAiKey>(ROUTE, { method: "PUT", body: JSON.stringify({ provider, key }) });
export const removeKey = () => call<{ removed: true }>(ROUTE, { method: "DELETE" });
export const testKey = (provider: AiProvider, key: string) => call<{ ok: boolean; message?: string }>(`${ROUTE}/test`, { method: "POST", body: JSON.stringify({ provider, key }) });

/** For display only: "sk-ant-…7Q2f". The server should send this already masked. */
export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 12) return "…" + trimmed.slice(-4);
  const prefix = trimmed.startsWith("sk-ant-") ? "sk-ant-" : trimmed.slice(0, 3);
  return `${prefix}…${trimmed.slice(-4)}`;
}
