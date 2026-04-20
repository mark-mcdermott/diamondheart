import { describe, it, expect } from "vitest";
import {
  VIEW_RANGES,
  VIEW_RANGE_VALUES,
  isViewRange,
  viewRangeBounds,
  viewRangeLabel,
  shiftAnchor,
  isCurrentPeriod,
  parseAnchorDate,
  toISODateAnchor,
  filterByBounds,
} from "@/lib/view-range";

// Wednesday, Apr 15 2026, 12:00 local time
const ANCHOR = new Date(2026, 3, 15, 12, 0, 0);

describe("VIEW_RANGES", () => {
  it("exposes day, week, month, year in order", () => {
    expect(VIEW_RANGE_VALUES).toEqual(["day", "week", "month", "year"]);
  });

  it("each range has a label and icon", () => {
    for (const r of VIEW_RANGES) {
      expect(r.label).toBeTruthy();
      expect(r.icon).toBeTruthy();
    }
  });
});

describe("isViewRange", () => {
  it.each(["day", "week", "month", "year"])("accepts %s", (v) => {
    expect(isViewRange(v)).toBe(true);
  });

  it.each([null, undefined, "", "quarter", "5year", "DAY"])(
    "rejects %s",
    (v) => {
      expect(isViewRange(v as string | null | undefined)).toBe(false);
    },
  );
});

describe("viewRangeBounds (calendar-aligned)", () => {
  it("day bounds cover exactly the anchor's local calendar day", () => {
    const { start, end } = viewRangeBounds("day", ANCHOR);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(3); // April
    expect(start.getDate()).toBe(15);
    expect(start.getHours()).toBe(0);
    expect(end.getDate()).toBe(16);
    expect(end.getHours()).toBe(0);
  });

  it("week is ISO: Monday start, Sunday end-exclusive", () => {
    const { start, end } = viewRangeBounds("week", ANCHOR);
    expect(start.getDay()).toBe(1); // Monday
    expect(start.getDate()).toBe(13); // Mon Apr 13
    expect(end.getDate()).toBe(20); // Next Monday (exclusive)
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("week starting on a Sunday anchor uses the ISO week (prev Monday)", () => {
    // Sunday Apr 19 2026
    const sunday = new Date(2026, 3, 19, 12, 0, 0);
    const { start, end } = viewRangeBounds("week", sunday);
    expect(start.getDate()).toBe(13); // Mon Apr 13
    expect(end.getDate()).toBe(20);
  });

  it("week starting on a Monday anchor stays on that Monday", () => {
    const monday = new Date(2026, 3, 13, 12, 0, 0);
    const { start } = viewRangeBounds("week", monday);
    expect(start.getDate()).toBe(13);
  });

  it("month covers the anchor's calendar month", () => {
    const { start, end } = viewRangeBounds("month", ANCHOR);
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(3); // April
    expect(end.getDate()).toBe(1);
    expect(end.getMonth()).toBe(4); // May 1 exclusive
  });

  it("year covers Jan 1 through next Jan 1", () => {
    const { start, end } = viewRangeBounds("year", ANCHOR);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2027);
    expect(end.getMonth()).toBe(0);
    expect(end.getDate()).toBe(1);
  });

  it("does not mutate the provided anchor", () => {
    const copy = new Date(ANCHOR);
    viewRangeBounds("week", copy);
    expect(copy.getTime()).toBe(ANCHOR.getTime());
  });
});

describe("viewRangeLabel", () => {
  it("returns live labels when anchor is null", () => {
    expect(viewRangeLabel("day", null)).toBe("Today");
    expect(viewRangeLabel("week", null)).toBe("This week");
    expect(viewRangeLabel("month", null)).toBe("This month");
    expect(viewRangeLabel("year", null)).toBe("This year");
  });

  it("formats day anchor with month+day+year", () => {
    expect(viewRangeLabel("day", ANCHOR)).toBe("Apr 15, 2026");
  });

  it("formats week anchor as a date range", () => {
    expect(viewRangeLabel("week", ANCHOR)).toBe("Apr 13 – 19");
  });

  it("formats month anchor as 'Month YYYY'", () => {
    expect(viewRangeLabel("month", ANCHOR)).toBe("April 2026");
  });

  it("formats year anchor as just the year", () => {
    expect(viewRangeLabel("year", ANCHOR)).toBe("2026");
  });

  it("week label spans months when range crosses a boundary", () => {
    // Anchor Apr 29 2026 (Wed) — week is Apr 27 (Mon) through May 3 (Sun)
    const boundary = new Date(2026, 3, 29, 12, 0, 0);
    expect(viewRangeLabel("week", boundary)).toBe("Apr 27 – May 3");
  });
});

describe("shiftAnchor", () => {
  it("day shifts by 1 day", () => {
    expect(shiftAnchor("day", ANCHOR, 1).getDate()).toBe(16);
    expect(shiftAnchor("day", ANCHOR, -1).getDate()).toBe(14);
  });

  it("week shifts by 7 days", () => {
    expect(shiftAnchor("week", ANCHOR, 1).getDate()).toBe(22);
    expect(shiftAnchor("week", ANCHOR, -1).getDate()).toBe(8);
  });

  it("month shifts by 1 month", () => {
    expect(shiftAnchor("month", ANCHOR, 1).getMonth()).toBe(4); // May
    expect(shiftAnchor("month", ANCHOR, -1).getMonth()).toBe(2); // March
  });

  it("year shifts by 1 year", () => {
    expect(shiftAnchor("year", ANCHOR, 1).getFullYear()).toBe(2027);
    expect(shiftAnchor("year", ANCHOR, -1).getFullYear()).toBe(2025);
  });
});

describe("isCurrentPeriod", () => {
  it("true when anchor is in the same period as now", () => {
    const sameWeek = new Date(2026, 3, 14, 12, 0, 0); // Tue
    expect(isCurrentPeriod("week", sameWeek, ANCHOR)).toBe(true);
  });

  it("false when anchor is in a different week", () => {
    const prevWeek = new Date(2026, 3, 6, 12, 0, 0);
    expect(isCurrentPeriod("week", prevWeek, ANCHOR)).toBe(false);
  });

  it("month comparison only considers calendar month", () => {
    expect(isCurrentPeriod("month", new Date(2026, 3, 1), ANCHOR)).toBe(true);
    expect(isCurrentPeriod("month", new Date(2026, 2, 31), ANCHOR)).toBe(false);
  });
});

describe("parseAnchorDate / toISODateAnchor", () => {
  it("parses valid YYYY-MM-DD", () => {
    const d = parseAnchorDate("2026-04-15");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(3);
    expect(d?.getDate()).toBe(15);
    expect(d?.getHours()).toBe(0);
  });

  it.each([null, undefined, "", "2026-4-15", "2026/04/15", "garbage", "2026-13-01", "2026-02-30"])(
    "returns null for %s",
    (v) => {
      expect(parseAnchorDate(v as string | null | undefined)).toBeNull();
    },
  );

  it("round-trips through toISODateAnchor", () => {
    const iso = toISODateAnchor(ANCHOR);
    expect(iso).toBe("2026-04-15");
    const parsed = parseAnchorDate(iso);
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(3);
    expect(parsed?.getDate()).toBe(15);
  });
});

describe("filterByBounds", () => {
  const items = [
    { id: "apr-13-mon", date: new Date(2026, 3, 13, 8, 0, 0) },
    { id: "apr-15-wed", date: new Date(2026, 3, 15, 8, 0, 0) },
    { id: "apr-19-sun", date: new Date(2026, 3, 19, 23, 0, 0) },
    { id: "apr-20-mon", date: new Date(2026, 3, 20, 0, 0, 0) }, // exclusive end
    { id: "apr-12-sun", date: new Date(2026, 3, 12, 23, 0, 0) }, // just before window
  ];

  it("week bounds include Mon through Sun but exclude next Mon", () => {
    const bounds = viewRangeBounds("week", ANCHOR);
    const result = filterByBounds(items, bounds).map((i) => i.id);
    expect(result).toEqual(["apr-13-mon", "apr-15-wed", "apr-19-sun"]);
  });

  it("accepts string dates", () => {
    const result = filterByBounds(
      [{ date: "2026-04-15T12:00:00Z" }, { date: "2020-01-01T00:00:00Z" }],
      viewRangeBounds("year", ANCHOR),
    );
    expect(result).toHaveLength(1);
  });
});

