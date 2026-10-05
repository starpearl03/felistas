// Sliding-window rate limiting per key (usually the client IP).
// In-memory: on serverless each warm instance counts on its own, so this is best-effort, which is
// acceptable on free hosting. The upgrade path is a shared store (for example Upstash Redis).

export type Window = { limit: number; windowMs: number };

export type RateResult = { ok: true } | { ok: false; retryAfterMs: number };

export type RateLimiter = {
  /** Records a hit for `key` and says whether it is allowed under every window. */
  hit(key: string, now?: number): RateResult;
  reset(): void;
};

const MAX_KEYS = 10_000;

export function createRateLimiter(windows: Window[]): RateLimiter {
  const longest = Math.max(...windows.map((w) => w.windowMs));
  const hits = new Map<string, number[]>();

  return {
    hit(key, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < longest);
      for (const w of windows) {
        const inWindow = recent.filter((t) => now - t < w.windowMs);
        if (inWindow.length >= w.limit) {
          // the oldest hit in this window leaves it first
          return { ok: false, retryAfterMs: w.windowMs - (now - inWindow[0]) };
        }
      }
      recent.push(now);
      hits.delete(key);
      hits.set(key, recent);
      // forget the least recently used keys so memory stays bounded
      if (hits.size > MAX_KEYS) hits.delete(hits.keys().next().value as string);
      return { ok: true };
    },
    reset() {
      hits.clear();
    },
  };
}

/** The caller's IP as seen by the platform proxy (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
