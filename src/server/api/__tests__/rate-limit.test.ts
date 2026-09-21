import { describe, it, expect } from "vitest";
import { clientKey, createRateLimiter } from "@/server/api/_lib/rate-limit";

describe("rate limiter", () => {
  it("allows the limit and refuses the hit after it", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });
    expect([1, 2, 3].map(() => limiter.take("a", 0))).toEqual([true, true, true]);
    expect(limiter.take("a", 1)).toBe(false);
  });

  it("keeps keys apart", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.take("a", 0)).toBe(true);
    expect(limiter.take("b", 0)).toBe(true);
    expect(limiter.take("a", 0)).toBe(false);
  });

  it("starts a fresh window once the old one has passed", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.take("a", 0)).toBe(true);
    expect(limiter.take("a", 999)).toBe(false);
    expect(limiter.take("a", 1000)).toBe(true);
  });

  it("keys on the first forwarded address, then the real-ip header, then a shared bucket", () => {
    const withForwarded = new Request("http://x", { headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" } });
    const withRealIp = new Request("http://x", { headers: { "x-real-ip": "198.51.100.7" } });
    expect(clientKey(withForwarded)).toBe("203.0.113.9");
    expect(clientKey(withRealIp)).toBe("198.51.100.7");
    expect(clientKey(new Request("http://x"))).toBe("unknown");
  });
});
