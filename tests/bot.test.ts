import { describe, expect, it } from "vitest";
import { filterByDateRange, getDateRange } from "../packages/shared/utils/date-range";

describe("date ranges", () => {
  it("builds today range", () => {
    const range = getDateRange("today", {
      now: new Date("2026-06-16T12:00:00.000Z")
    });
    const start = new Date(range.start);
    const end = new Date(range.end);

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("filters records by selected date", () => {
    const range = getDateRange("custom", {
      date: "2026-06-14",
      now: new Date("2026-06-16T12:00:00.000Z")
    });
    const records = [
      { id: "1", created_at: "2026-06-14T10:00:00.000Z" },
      { id: "2", created_at: "2026-06-15T10:00:00.000Z" }
    ];

    expect(filterByDateRange(records, range).map((record) => record.id)).toEqual(["1"]);
  });
});
