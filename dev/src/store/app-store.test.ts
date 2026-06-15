import { beforeEach, describe, expect, it } from "vitest";
import { places, timetableStops } from "@/lib/data";
import { useAppStore } from "./app-store";

describe("app store timetable session state", () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true);
  });

  it("seeds a cloned shared timetable for the session", () => {
    const state = useAppStore.getState() as ReturnType<typeof useAppStore.getState> & {
      timelineStopsByDay?: typeof import("@/lib/data").timelineStopsByDay;
    };

    expect(state.timelineStopsByDay?.["d-day"].map((stop) => stop.place)).toEqual([
      "잠실역 5번 출구",
      "KSPO Dome 굿즈 라인",
      "잠실 카페 mood",
      "공연 시작 (KSPO Dome)"
    ]);
    expect(state.timelineStopsByDay?.["d-day"]).not.toBe(timetableStops);
    expect(state.timelineStopsByDay?.["d-day"][0]).not.toBe(timetableStops[0]);
  });

  it("updates stop minutes in the shared timetable", () => {
    const state = useAppStore.getState() as ReturnType<typeof useAppStore.getState> & {
      updateStopMinutes?: (stopId: string, field: "dwellMinutes" | "transitMinutes", delta: number) => void;
      timelineStopsByDay?: typeof import("@/lib/data").timelineStopsByDay;
    };

    expect(state.updateStopMinutes).toBeTypeOf("function");
    state.updateStopMinutes?.("s1", "dwellMinutes", 10);

    expect(useAppStore.getState().timelineStopsByDay["d-day"][0].dwellMinutes).toBe(25);
  });

  it("adds a place before the locked concert stop and prevents duplicates", () => {
    const place = places.find((item) => item.name === "테이크아웃 토스트 잠실점");
    const state = useAppStore.getState() as ReturnType<typeof useAppStore.getState> & {
      addPlaceToTimetable?: (placeId: string) => void;
      timelineStopsByDay?: typeof import("@/lib/data").timelineStopsByDay;
    };

    expect(place).toBeDefined();
    expect(state.addPlaceToTimetable).toBeTypeOf("function");

    state.addPlaceToTimetable?.(place!.id);
    state.addPlaceToTimetable?.(place!.id);

    const dDayStops = useAppStore.getState().timelineStopsByDay["d-day"];
    expect(dDayStops.map((stop) => stop.place)).toEqual([
      "잠실역 5번 출구",
      "KSPO Dome 굿즈 라인",
      "잠실 카페 mood",
      "테이크아웃 토스트 잠실점",
      "공연 시작 (KSPO Dome)"
    ]);
    expect(dDayStops.at(-1)?.locked).toBe(true);
  });

  it("reorders movable timetable stops while keeping the concert anchor locked", () => {
    const state = useAppStore.getState() as ReturnType<typeof useAppStore.getState> & {
      reorderTimetableStop?: (sourceStopId: string, targetStopId: string, placement: "before" | "after") => void;
      timelineStopsByDay?: typeof import("@/lib/data").timelineStopsByDay;
    };

    expect(state.reorderTimetableStop).toBeTypeOf("function");
    state.reorderTimetableStop?.("s1", "s3", "after");
    state.reorderTimetableStop?.("s4", "s2", "before");

    const dDayStops = useAppStore.getState().timelineStopsByDay["d-day"];
    expect(dDayStops.map((stop) => stop.place)).toEqual([
      "KSPO Dome 굿즈 라인",
      "잠실 카페 mood",
      "잠실역 5번 출구",
      "공연 시작 (KSPO Dome)"
    ]);
    expect(dDayStops.map((stop) => stop.pinLabel)).toEqual(["1", "2", "3", undefined]);
    expect(dDayStops.at(-1)?.locked).toBe(true);
  });

  it("resets timetable changes back to the default mock seed", () => {
    const place = places.find((item) => item.name === "테이크아웃 토스트 잠실점");
    const state = useAppStore.getState() as ReturnType<typeof useAppStore.getState> & {
      addPlaceToTimetable?: (placeId: string) => void;
      resetTimetable?: () => void;
      updateStopMinutes?: (stopId: string, field: "dwellMinutes" | "transitMinutes", delta: number) => void;
    };

    expect(state.addPlaceToTimetable).toBeTypeOf("function");
    expect(state.updateStopMinutes).toBeTypeOf("function");
    expect(state.resetTimetable).toBeTypeOf("function");

    state.addPlaceToTimetable?.(place!.id);
    state.updateStopMinutes?.("s1", "dwellMinutes", 10);
    state.resetTimetable?.();

    const dDayStops = useAppStore.getState().timelineStopsByDay["d-day"];
    expect(dDayStops.map((stop) => stop.place)).toEqual(timetableStops.map((stop) => stop.place));
    expect(dDayStops[0].dwellMinutes).toBe(15);
  });
});
