import { describe, it, expect } from "vitest";
import { parseNumberField, parsePositiveNumberField } from "@/lib/numbers";

describe("parseNumberField", () => {
  it("keeps decimals instead of truncating them", () => {
    // The old `parseInt("12.5")` gave 12, and a day's protein drifted low.
    expect(parseNumberField("12.5", 0)).toBe(12.5);
    expect(parseNumberField("0.5", 0)).toBe(0.5);
    expect(parseNumberField("99.6", 0)).toBe(99.6);
  });

  it("preserves a legitimate zero", () => {
    // The old `parseInt("0") || 1` returned 1, because zero is falsy.
    expect(parseNumberField("0", 1)).toBe(0);
    expect(parseNumberField("0.0", 1)).toBe(0);
  });

  it("falls back when there is genuinely no value", () => {
    expect(parseNumberField(null, 7)).toBe(7);
    expect(parseNumberField(undefined, 7)).toBe(7);
    expect(parseNumberField("", 7)).toBe(7);
    expect(parseNumberField("   ", 7)).toBe(7);
  });

  it("falls back on values that are not numbers", () => {
    expect(parseNumberField("abc", 7)).toBe(7);
    expect(parseNumberField("NaN", 7)).toBe(7);
    expect(parseNumberField("Infinity", 7)).toBe(7);
    expect(parseNumberField("-Infinity", 7)).toBe(7);
  });

  it("does not silently accept trailing junk the way parseInt does", () => {
    // parseInt("12abc") is 12; that is a typo being accepted as data.
    expect(parseNumberField("12abc", 0)).toBe(0);
  });

  it("handles negatives and whitespace", () => {
    expect(parseNumberField("-5", 0)).toBe(-5);
    expect(parseNumberField("  42.25  ", 0)).toBe(42.25);
  });
});

describe("parsePositiveNumberField", () => {
  it("keeps fractional servings", () => {
    // The bug this exists for: half a serving logged as a whole one.
    expect(parsePositiveNumberField("0.5", 1)).toBe(0.5);
    expect(parsePositiveNumberField("0.25", 1)).toBe(0.25);
  });

  it("rejects zero and negatives, which cannot be a serving", () => {
    expect(parsePositiveNumberField("0", 1)).toBe(1);
    expect(parsePositiveNumberField("-2", 1)).toBe(1);
  });

  it("falls back on junk", () => {
    expect(parsePositiveNumberField("abc", 100)).toBe(100);
    expect(parsePositiveNumberField(null, 100)).toBe(100);
  });
});

describe("the four cases from the Phase 2 audit", () => {
  it("all now store what the user typed", () => {
    expect(parsePositiveNumberField("0.5", 1)).toBe(0.5);      // was 1
    expect(parsePositiveNumberField("0.5", 100)).toBe(0.5);    // was 100
    expect(parseNumberField("12.5", 0)).toBe(12.5);            // was 12
    expect(parseNumberField("99.6", 0)).toBe(99.6);            // was 99
  });
});
