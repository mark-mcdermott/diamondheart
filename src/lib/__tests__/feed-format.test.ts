import { describe, it, expect } from "vitest";
import { formatRelativeTime, formatDuration } from "../feed-format";

describe("formatRelativeTime", () => {
  const now = new Date("2026-04-20T12:00:00Z");

  it("returns 'just now' within 45 seconds", () => {
    expect(formatRelativeTime(new Date(now.getTime() - 10_000), now)).toBe("just now");
    expect(formatRelativeTime(new Date(now.getTime() - 44_000), now)).toBe("just now");
  });

  it("returns minutes for under an hour", () => {
    expect(formatRelativeTime(new Date(now.getTime() - 2 * 60_000), now)).toBe("2m ago");
    expect(formatRelativeTime(new Date(now.getTime() - 59 * 60_000), now)).toBe("59m ago");
  });

  it("returns hours for under a day", () => {
    expect(formatRelativeTime(new Date(now.getTime() - 3 * 60 * 60_000), now)).toBe("3h ago");
  });

  it("returns days for under a week", () => {
    expect(formatRelativeTime(new Date(now.getTime() - 3 * 24 * 60 * 60_000), now)).toBe("3d ago");
  });

  it("returns abbreviated date for older than a week (same year)", () => {
    const date = new Date("2026-03-15T12:00:00Z");
    expect(formatRelativeTime(date, now)).toMatch(/Mar 15/);
  });

  it("returns 'just now' for future dates", () => {
    expect(formatRelativeTime(new Date(now.getTime() + 10_000), now)).toBe("just now");
  });
});

describe("formatDuration", () => {
  it("handles zero and negative", () => {
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(-10)).toBe("0 min");
  });

  it("shows seconds for under a minute", () => {
    expect(formatDuration(30)).toBe("30s");
  });

  it("shows minutes for under an hour", () => {
    expect(formatDuration(300)).toBe("5 min");
    expect(formatDuration(600)).toBe("10 min");
    expect(formatDuration(1500)).toBe("25 min");
  });

  it("shows hours for 60+ minutes", () => {
    expect(formatDuration(3600)).toBe("1 hr");
    expect(formatDuration(4500)).toBe("1 hr 15 min");
    expect(formatDuration(7200)).toBe("2 hr");
  });
});
