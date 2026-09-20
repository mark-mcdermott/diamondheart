import { describe, it, expect } from "vitest";
import { targetProgress, parseTargetField, NO_TARGETS, MACRO_KEYS } from "@/lib/targets";

describe("targetProgress", () => {
  it("is null when no target is set — never invents one", () => {
    // The whole point: "Daily goal: 1 kg" for a metric with no goal was a bug.
    expect(targetProgress(500, null)).toBeNull();
    expect(targetProgress(500, undefined)).toBeNull();
  });

  it("treats a non-positive or non-finite target as unset", () => {
    expect(targetProgress(500, 0)).toBeNull();
    expect(targetProgress(500, -2000)).toBeNull();
    expect(targetProgress(500, NaN)).toBeNull();
    expect(targetProgress(500, Infinity)).toBeNull();
  });

  it("reports progress under, at, and over the target", () => {
    expect(targetProgress(500, 2000)).toEqual({ ratio: 0.25, over: false });
    expect(targetProgress(2000, 2000)).toEqual({ ratio: 1, over: false });
    expect(targetProgress(2400, 2000)).toEqual({ ratio: 1.2, over: true });
  });

  it("does not clamp the ratio, so the UI can decide how to show excess", () => {
    expect(targetProgress(4000, 2000)?.ratio).toBe(2);
  });

  it("handles a zero total", () => {
    expect(targetProgress(0, 2000)).toEqual({ ratio: 0, over: false });
  });

  it("refuses a non-finite total", () => {
    expect(targetProgress(NaN, 2000)).toBeNull();
  });
});

describe("parseTargetField", () => {
  it("reads blank as 'no target', not as zero or an error", () => {
    expect(parseTargetField("")).toBeNull();
    expect(parseTargetField("   ")).toBeNull();
    expect(parseTargetField(null)).toBeNull();
    expect(parseTargetField(undefined)).toBeNull();
  });

  it("accepts positive numbers, including decimals", () => {
    expect(parseTargetField("2000")).toBe(2000);
    expect(parseTargetField("150.5")).toBe(150.5);
    expect(parseTargetField(" 70 ")).toBe(70);
  });

  it("rejects zero and negatives rather than storing a meaningless target", () => {
    expect(parseTargetField("0")).toBe("invalid");
    expect(parseTargetField("-100")).toBe("invalid");
  });

  it("rejects junk rather than silently coercing it", () => {
    expect(parseTargetField("abc")).toBe("invalid");
    expect(parseTargetField("2000abc")).toBe("invalid");
    expect(parseTargetField("Infinity")).toBe("invalid");
  });
});

describe("NO_TARGETS", () => {
  it("covers every macro with null", () => {
    for (const key of MACRO_KEYS) expect(NO_TARGETS[key]).toBeNull();
    expect(Object.keys(NO_TARGETS).sort()).toEqual([...MACRO_KEYS].sort());
  });
});
