// Simple in-memory fixed-window rate limiter. Sufficient for a single-process
// prototype exposed over Tailscale Funnel — bounds abuse and LLM spend.

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
}

export interface RateResult {
  allowed: boolean;
  retryAfterMs: number;
}

export function createRateLimiter({ limit, windowMs }: RateLimiterOptions) {
  const windows = new Map<string, { start: number; count: number }>();

  return {
    check(key: string, now: number): RateResult {
      const w = windows.get(key);
      if (!w || now - w.start >= windowMs) {
        windows.set(key, { start: now, count: 1 });
        return { allowed: true, retryAfterMs: 0 };
      }
      if (w.count < limit) {
        w.count++;
        return { allowed: true, retryAfterMs: 0 };
      }
      return { allowed: false, retryAfterMs: w.start + windowMs - now };
    },
  };
}
