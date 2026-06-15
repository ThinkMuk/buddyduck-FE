import { describe, expect, it } from "vitest";
import { calculateTimetableLoad, timetableStops, type TimetableStop } from "./data";

describe("timetable mock calculations", () => {
  it("keeps the default schedule saveable without over-time minutes", () => {
    const result = calculateTimetableLoad(timetableStops);

    expect(result.availableMinutes).toBe(270);
    expect(result.usedMinutes).toBe(263);
    expect(result.overMinutes).toBe(0);
    expect(result.isOverTime).toBe(false);
  });

  it("detects an over-time schedule before saving", () => {
    const result = calculateTimetableLoad(timetableStops, 49);

    expect(result.availableMinutes).toBe(270);
    expect(result.usedMinutes).toBe(312);
    expect(result.overMinutes).toBe(42);
    expect(result.isOverTime).toBe(true);
  });

  it("reports shorter used time when dwell minutes are reduced", () => {
    const reducedStops = timetableStops.map((stop) =>
      stop.id === "s2" || stop.id === "s3" ? { ...stop, dwellMinutes: 30 } : stop
    );

    const result = calculateTimetableLoad(reducedStops);

    expect(result.usedMinutes).toBe(143);
    expect(result.overMinutes).toBe(0);
    expect(result.isOverTime).toBe(false);
  });

  it("detects over-time from changed stops without using an extra override", () => {
    const extraStop: TimetableStop = {
      ...timetableStops[2],
      id: "place-toast",
      place: "테이크아웃 토스트 잠실점",
      category: "식당",
      dwellMinutes: 90,
      transitMinutes: 28,
      time: ""
    };
    const extendedStops = [...timetableStops.slice(0, -1), extraStop, timetableStops.at(-1)!];

    const result = calculateTimetableLoad(extendedStops);

    expect(result.usedMinutes).toBe(381);
    expect(result.overMinutes).toBe(111);
    expect(result.isOverTime).toBe(true);
  });
});
