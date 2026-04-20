import { describe, it, expect } from "vitest";
import { z } from "zod";

const bodySchema = z.object({
  platform: z.enum(["ios", "android"]),
  token: z.string().min(1).max(512),
});

describe("device-token body validation", () => {
  it("accepts an ios payload", () => {
    const result = bodySchema.safeParse({ platform: "ios", token: "abc123" });
    expect(result.success).toBe(true);
  });

  it("accepts an android payload", () => {
    const result = bodySchema.safeParse({ platform: "android", token: "fcm-token" });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown platform", () => {
    const result = bodySchema.safeParse({ platform: "web", token: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty token", () => {
    const result = bodySchema.safeParse({ platform: "ios", token: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an oversized token", () => {
    const result = bodySchema.safeParse({
      platform: "ios",
      token: "x".repeat(513),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing token field", () => {
    const result = bodySchema.safeParse({ platform: "ios" });
    expect(result.success).toBe(false);
  });
});
