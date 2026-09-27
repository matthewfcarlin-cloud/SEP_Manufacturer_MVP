import { createRateLimiter } from "../rateLimit";

const TEN_MINUTES = 10 * 60 * 1000;

/** Events per browser: generous for real clicking, small enough to stop a flood filling the disk. */
export const eventLimit = createRateLimiter({ max: 600, windowMs: TEN_MINUTES });
/** Outcomes are typed in by hand. */
export const outcomeLimit = createRateLimiter({ max: 60, windowMs: TEN_MINUTES });

/** Test helper. */
export function resetLearningLimits(): void {
  eventLimit.reset();
  outcomeLimit.reset();
}
