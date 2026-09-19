import { describe, it, expect } from "vitest";
import {
  convertMass,
  isMassUnit,
  roundMass,
  formatMass,
  displayUnitFor,
  toDisplayValue,
  toStoredValue,
  MASS_UNITS,
} from "@/lib/units";

describe("isMassUnit", () => {
  it("recognises mass units and nothing else", () => {
    expect(isMassUnit("kg")).toBe(true);
    expect(isMassUnit("lb")).toBe(true);
    for (const other of ["min", "glasses", "cups", "bpm", "", null, undefined]) {
      expect(isMassUnit(other as string | null), `${other} should not be mass`).toBe(false);
    }
  });
});

describe("convertMass", () => {
  it("converts kg to lb", () => {
    expect(roundMass(convertMass(100, "kg", "lb"))).toBe(220.5);
  });

  it("converts lb to kg", () => {
    expect(roundMass(convertMass(220.46, "lb", "kg"))).toBe(100);
  });

  it("is identity for the same unit", () => {
    expect(convertMass(80.5, "kg", "kg")).toBe(80.5);
    expect(convertMass(80.5, "lb", "lb")).toBe(80.5);
  });

  it("round-trips without drift", () => {
    for (const kg of [0, 0.1, 45.4, 80.5, 122.7, 300]) {
      const back = convertMass(convertMass(kg, "kg", "lb"), "lb", "kg");
      expect(back).toBeCloseTo(kg, 10);
    }
  });

  it("handles zero and negatives arithmetically", () => {
    expect(convertMass(0, "kg", "lb")).toBe(0);
    expect(roundMass(convertMass(-10, "kg", "lb"))).toBe(-22);
  });
});

describe("displayUnitFor", () => {
  it("swaps the unit only for mass metrics", () => {
    expect(displayUnitFor("kg", "lb")).toBe("lb");
    expect(displayUnitFor("lb", "kg")).toBe("kg");
  });

  it("leaves non-mass units alone", () => {
    // Coffee in "cups" must never be reported in kg.
    expect(displayUnitFor("cups", "lb")).toBe("cups");
    expect(displayUnitFor("min", "kg")).toBe("min");
    expect(displayUnitFor(null, "lb")).toBe(null);
  });
});

describe("toDisplayValue / toStoredValue", () => {
  it("converts a stored kg reading for a lb viewer", () => {
    expect(roundMass(toDisplayValue(80, "kg", "lb"))).toBe(176.4);
  });

  it("converts typed lb back to stored kg", () => {
    expect(roundMass(toStoredValue(176.4, "kg", "lb"))).toBe(80);
  });

  it("leaves non-mass metrics untouched in both directions", () => {
    expect(toDisplayValue(3, "cups", "lb")).toBe(3);
    expect(toStoredValue(3, "cups", "lb")).toBe(3);
    expect(toDisplayValue(30, null, "lb")).toBe(30);
  });

  it("is a lossless round trip through the UI", () => {
    // What a user sees, re-entered unchanged, must store the same value.
    for (const stored of [45.4, 80.5, 122.7]) {
      const shown = toDisplayValue(stored, "kg", "lb");
      expect(toStoredValue(shown, "kg", "lb")).toBeCloseTo(stored, 10);
    }
  });

  it("is identity when the preference matches the metric's unit", () => {
    expect(toDisplayValue(80.5, "kg", "kg")).toBe(80.5);
    expect(toStoredValue(80.5, "kg", "kg")).toBe(80.5);
  });
});

describe("formatMass", () => {
  it("renders one decimal with the unit", () => {
    expect(formatMass(80.44, "kg")).toBe("80.4 kg");
    expect(formatMass(176.36, "lb")).toBe("176.4 lb");
  });

  it("drops a trailing .0", () => {
    expect(formatMass(80, "kg")).toBe("80 kg");
  });
});

describe("MASS_UNITS", () => {
  it("is exactly kg and lb", () => {
    expect([...MASS_UNITS]).toEqual(["kg", "lb"]);
  });
});

describe("default unit", () => {
  it("is pounds", async () => {
    const { DEFAULT_MASS_UNIT } = await import("@/lib/units");
    expect(DEFAULT_MASS_UNIT).toBe("lb");
  });

  it("does not drift when a pound reading round-trips through kg storage", async () => {
    const { toStoredValue, toDisplayValue, roundMass } = await import("@/lib/units");
    // The bug this guards: rounding on store turns 180 lb into 179.9 lb.
    for (const enteredLb of [150, 176.4, 180, 212.5]) {
      const stored = toStoredValue(enteredLb, "kg", "lb");
      expect(roundMass(toDisplayValue(stored, "kg", "lb"))).toBe(roundMass(enteredLb));
    }
  });
});
