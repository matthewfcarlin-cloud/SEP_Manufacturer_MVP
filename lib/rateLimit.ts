// A sliding-window limit per key (a browser's workspace id). In memory: fine
// for the one-process deploy; resets on restart.

export type RateLimiter = {
  /** Records `cost` units if they fit in the window, and says whether they did. */
  allow(key: string, cost?: number, now?: number): boolean;
  reset(): void;
};

export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    allow(key, cost = 1, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length + cost > max) {
        hits.set(key, recent);
        return false;
      }
      hits.set(key, [...recent, ...Array<number>(cost).fill(now)]);
      return true;
    },
    reset() {
      hits.clear();
    },
  };
}
