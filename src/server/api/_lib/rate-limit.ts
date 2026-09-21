/**
 * A fixed window per key, held in memory. Vercel keeps a function instance
 * warm across requests, so this stops one client hammering an endpoint; it
 * does not add up across instances, which is the trade for no new service.
 * Use it where a flood is a nuisance, not where it is a security boundary.
 */
export interface RateLimitOptions {
  /** Hits allowed per window. */
  limit: number;
  windowMs: number;
}

interface Window {
  count: number;
  resetAt: number;
}

const SWEEP_AT = 1000;

export function createRateLimiter({ limit, windowMs }: RateLimitOptions) {
  const windows = new Map<string, Window>();

  function sweep(now: number) {
    for (const [key, window] of windows) {
      if (window.resetAt <= now) windows.delete(key);
    }
  }

  return {
    /** Records a hit and reports whether it is within the limit. */
    take(key: string, now = Date.now()): boolean {
      if (windows.size >= SWEEP_AT) sweep(now);
      const current = windows.get(key);
      if (!current || current.resetAt <= now) {
        windows.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      current.count += 1;
      return current.count <= limit;
    },
  };
}

/** The caller's address as the platform reports it; one bucket for anything unattributed. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}
