import { describe, it, expect } from "vitest";
import { displayGoal, formatReading, goalLabel } from "@/lib/metric-display";

const weight = { dailyGoal: 1, unit: "kg", singleValuePerDay: true };
const water = { dailyGoal: 8, unit: "glasses", singleValuePerDay: false };
const meditate = { dailyGoal: 1, unit: null, singleValuePerDay: false };
const protein = { dailyGoal: 2, unit: "kg", singleValuePerDay: false };

describe("displayGoal", () => {
  it("has no amount for a one-reading-a-day metric, whatever is stored", () => {
    expect(displayGoal(weight, "lb")).toBeNull();
    expect(displayGoal({ ...weight, dailyGoal: 80 }, "lb")).toBeNull();
  });

  it("converts a mass goal to the viewer's unit and leaves others alone", () => {
    expect(displayGoal(protein, "lb")).toBe(4.4);
    expect(displayGoal(protein, "kg")).toBe(2);
    expect(displayGoal(water, "lb")).toBe(8);
    expect(displayGoal({ ...water, dailyGoal: null }, "lb")).toBeNull();
  });
});

describe("goalLabel", () => {
  it("never says 'goal: 1 kg' for a weight metric", () => {
    expect(goalLabel(weight, "lb")).toBe("once a day");
    expect(goalLabel(weight, "kg")).toBe("once a day");
  });

  it("reads naturally for the other shapes", () => {
    expect(goalLabel(water, "lb")).toBe("goal: 8 glasses");
    expect(goalLabel(meditate, "lb")).toBe("once a day");
    expect(goalLabel({ ...meditate, dailyGoal: 3 }, "lb")).toBe("goal: 3");
    expect(goalLabel(protein, "lb")).toBe("goal: 4.4 lb");
  });
});

describe("formatReading", () => {
  it("shows a stored kilogram reading in the viewer's unit", () => {
    expect(formatReading(81.6, "kg", "lb")).toBe("179.9 lb");
    expect(formatReading(81.6, "kg", "kg")).toBe("81.6 kg");
  });

  it("leaves other units as they are and keeps one decimal at most", () => {
    expect(formatReading(3, "glasses", "lb")).toBe("3 glasses");
    expect(formatReading(2.345, "km", "lb")).toBe("2.3 km");
    expect(formatReading(2, null, "lb")).toBe("2");
  });
});
