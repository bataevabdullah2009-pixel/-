import { describe, expect, it } from "vitest";
import { filterByDateRange, getDateRange } from "../packages/shared/utils/date-range";

describe("date ranges", () => {
  it("builds today range", () => {
    const range = getDateRange("today", {
      now: new Date("2026-06-16T12:00:00.000Z")
    });
    expect(range.start).toBe("2026-06-15T21:00:00.000Z");
    expect(range.end).toBe("2026-06-16T21:00:00.000Z");
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

  it("uses Moscow calendar boundaries around midnight", () => {
    const range = getDateRange("today", {
      now: new Date("2026-06-23T22:30:00.000Z")
    });

    expect(range.start).toBe("2026-06-23T21:00:00.000Z");
    expect(range.end).toBe("2026-06-24T21:00:00.000Z");
    expect(filterByDateRange([
      { id: "before", created_at: "2026-06-23T20:59:59.999Z" },
      { id: "inside", created_at: "2026-06-23T21:00:00.000Z" }
    ], range).map((record) => record.id)).toEqual(["inside"]);
  });
});
