// The only place the frontend talks to the "use your own API key" backend
// (lib/ai/: encrypted key store + gateway, BACKEND.md phases A1/A2). Nothing
// here stores, encrypts or routes keys.
//
// Contract (BACKEND.md section 4, as built):
//   GET    /api/settings/ai-key        → ApiResponse<{ key: AiKeyInfo | null }>
//   POST   /api/settings/ai-key        { provider: "anthropic", apiKey } → ApiResponse<AiKeyInfo>   (tests the key, then saves it)
//   DELETE /api/settings/ai-key        → ApiResponse<{ removed: boolean }>
//   POST   /api/settings/ai-key/test   { provider: "anthropic", apiKey } → ApiResponse<{ valid: true }>
//   GET    /api/usage                  → ApiResponse<UsageSummary>
// If a route is missing (Next's HTML 404), the UI shows "Coming soon" instead.

import type { ApiResponse } from "../api";
import type { AiKeyInfo, UsageSummary } from "../types";

/** OpenAI is listed so creators know it's planned; the gateway supports Anthropic today. */
export const AI_PROVIDERS = [
  { id: "anthropic", label: "Anthropic (Claude)", placeholder: "sk-ant-…", isSupported: true },
  { id: "openai", label: "OpenAI", placeholder: "sk-…", isSupported: false },
] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number]["id"];

export type SavedAiKey = AiKeyInfo;
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

/** Whether the key backend is reachable, and the saved key (masked) if there is one. */
export async function getKeyState(): Promise<KeyState> {
  const result = await call<{ key: SavedAiKey | null }>(ROUTE);
  if (!result.ok) return { available: false };
  return { available: true, saved: result.data.key };
}

/** Tests the key, then saves it encrypted; a failing key is never saved. */
export const saveKey = (provider: AiProvider, apiKey: string) => call<SavedAiKey>(ROUTE, { method: "POST", body: JSON.stringify({ provider, apiKey }) });
export const removeKey = () => call<{ removed: boolean }>(ROUTE, { method: "DELETE" });
export const testKey = async (provider: AiProvider, apiKey: string): Promise<KeyResult<{ ok: boolean; message?: string }>> => {
  const r = await call<{ valid: true }>(`${ROUTE}/test`, { method: "POST", body: JSON.stringify({ provider, apiKey }) });
  if (r.ok) return { ok: true, data: { ok: true } };
  if (r.comingSoon) return r;
  return { ok: true, data: { ok: false, message: r.message } };
};

/** What pays for this browser's AI calls, for the header pill. */
export const getUsage = () => call<UsageSummary>("/api/usage");

/** For display only: "sk-ant-…7Q2f". The server sends saved keys already masked. */
export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 12) return "…" + trimmed.slice(-4);
  const prefix = trimmed.startsWith("sk-ant-") ? "sk-ant-" : trimmed.slice(0, 3);
  return `${prefix}…${trimmed.slice(-4)}`;
}
