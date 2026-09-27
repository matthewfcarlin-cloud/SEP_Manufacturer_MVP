import { createRateLimiter } from "../rateLimit";

// Key tests call Anthropic on the creator's behalf, so cap how often one
// browser can try keys (it would otherwise make a free key-checking oracle).
const keyAttempts = createRateLimiter({ max: 10, windowMs: 10 * 60 * 1000 });

/** Records an attempt and says whether it's allowed. */
export function allowKeyAttempt(workspaceId: string, now = Date.now()): boolean {
  return keyAttempts.allow(workspaceId, 1, now);
}

/** Test helper. */
export function resetKeyAttempts(): void {
  keyAttempts.reset();
}
