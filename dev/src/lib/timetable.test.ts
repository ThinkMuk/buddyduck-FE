import { describe, expect, it } from "vitest";
import { calculateTimetableLoad, timetableStops } from "./data";

describe("timetable mock calculations", () => {
  it("detects an over-time schedule before saving", () => {
    const result = calculateTimetableLoad(timetableStops, 42);

    expect(result.availableMinutes).toBe(270);
    expect(result.usedMinutes).toBe(312);
    expect(result.overMinutes).toBe(42);
    expect(result.isOverTime).toBe(true);
  });
});
