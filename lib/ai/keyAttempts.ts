// Key tests call Anthropic on the creator's behalf, so cap how often one
// browser can try keys (it would otherwise make a free key-checking oracle).
// In memory: fine for the one-process deploy; resets on restart.

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000;

const attempts = new Map<string, number[]>();

/** Records an attempt and says whether it's allowed. */
export function allowKeyAttempt(workspaceId: string, now = Date.now()): boolean {
  const recent = (attempts.get(workspaceId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    attempts.set(workspaceId, recent);
    return false;
  }
  attempts.set(workspaceId, [...recent, now]);
  return true;
}

/** Test helper. */
export function resetKeyAttempts(): void {
  attempts.clear();
}
