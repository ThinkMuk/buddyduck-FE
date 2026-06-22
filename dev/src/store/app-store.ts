import { create } from "zustand";
import {
  cloneTimelineStopsByDay,
  createTimetableStopFromPlace,
  getModeLabel,
  getModeShort,
  normalizeTimetableStops,
  places,
  type TimelineDay,
  type TimetableStop,
} from "@/lib/data";

export const MAX_INTEREST_TAGS = 5;

type AppState = {
  selectedTags: string[];
  selectedMapStop: number;
  timelineStopsByDay: Record<TimelineDay, TimetableStop[]>;
  activeTimelineDay: TimelineDay;
  selectedStopId: string;
  activeStopId: string | null;
  toggleTag: (tag: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setSelectedMapStop: (stop: number) => void;
  setActiveTimelineDay: (day: TimelineDay) => void;
  selectStop: (stopId: string) => void;
  hoverStop: (stopId: string | null) => void;
  updateStopMinutes: (
    stopId: string,
    field: "dwellMinutes" | "transitMinutes",
    delta: number,
  ) => void;
  updateRouteMode: (stopId: string, mode: TimetableStop["mode"]) => void;
  addPlaceToTimetable: (placeId: string) => void;
  reorderTimetableStop: (
    sourceStopId: string,
    targetStopId: string,
    placement: "before" | "after",
  ) => void;
  deleteTimetableStop: (stopId: string) => void;
  resetTimetable: () => void;
};

function mutateDdayStops(
  state: Pick<AppState, "timelineStopsByDay" | "selectedStopId">,
  mutate: (stops: TimetableStop[]) => TimetableStop[],
) {
  const nextDday = normalizeTimetableStops(
    mutate(state.timelineStopsByDay["d-day"]),
  );
  const nextSelected = nextDday.some((stop) => stop.id === state.selectedStopId)
    ? state.selectedStopId
    : (nextDday[0]?.id ?? "");

  return {
    timelineStopsByDay: {
      ...state.timelineStopsByDay,
      "d-day": nextDday,
    },
    selectedStopId: nextSelected,
  };
}

export const useAppStore = create<AppState>((set) => ({
  selectedTags: [],
  selectedMapStop: 2,
  timelineStopsByDay: cloneTimelineStopsByDay(),
  activeTimelineDay: "d-day",
  selectedStopId: "s1",
  activeStopId: null,
  toggleTag: (tag) =>
    set((state) => ({
      selectedTags: state.selectedTags.includes(tag)
        ? state.selectedTags.filter((item) => item !== tag)
        : state.selectedTags.length >= MAX_INTEREST_TAGS
          ? state.selectedTags
          : [...state.selectedTags, tag],
    })),
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  setSelectedMapStop: (stop) => set({ selectedMapStop: stop }),
  setActiveTimelineDay: (day) =>
    set((state) => {
      const nextStops = state.timelineStopsByDay[day];
      return {
        activeTimelineDay: day,
        selectedStopId: nextStops[0]?.id ?? "",
        activeStopId: null,
      };
    }),
  selectStop: (stopId) =>
    set((state) => {
      const currentStops = state.timelineStopsByDay[state.activeTimelineDay];
      const marker = currentStops.find((stop) => stop.id === stopId)?.pinLabel;
      const numericMarker = marker
        ? Number(marker)
        : Number(stopId.replace(/^\D+/, ""));

      return {
        selectedStopId: stopId,
        activeStopId: stopId,
        selectedMapStop:
          Number.isFinite(numericMarker) && numericMarker > 0
            ? numericMarker
            : state.selectedMapStop,
      };
    }),
  hoverStop: (stopId) => set({ activeStopId: stopId }),
  updateStopMinutes: (stopId, field, delta) =>
    set((state) =>
      mutateDdayStops(state, (stops) =>
        stops.map((stop) => {
          if (stop.id !== stopId) return stop;
          const minimum = field === "dwellMinutes" ? 10 : 0;
          return {
            ...stop,
            [field]: Math.max(minimum, stop[field] + delta),
          };
        }),
      ),
    ),
  updateRouteMode: (stopId, mode) =>
    set((state) =>
      mutateDdayStops(state, (stops) =>
        stops.map((stop) =>
          stop.id === stopId
            ? {
                ...stop,
                mode,
                routeModeLabel: getModeLabel(mode),
                routeModeShort: getModeShort(mode),
                transitMinutes:
                  mode === "drive"
                    ? Math.max(5, Math.round(stop.transitMinutes * 0.6))
                    : Math.max(8, stop.transitMinutes),
              }
            : stop,
        ),
      ),
    ),
  addPlaceToTimetable: (placeId) =>
    set((state) => {
      const place = places.find((item) => item.id === placeId);
      if (!place) return state;

      return mutateDdayStops(state, (stops) => {
        if (
          stops.some(
            (stop) =>
              stop.id === `place-${place.id}` || stop.place === place.name,
          )
        )
          return stops;

        const anchorIndex = stops.findIndex((stop) => stop.locked);
        const insertIndex = anchorIndex >= 0 ? anchorIndex : stops.length;
        const nextStop = createTimetableStopFromPlace(place);
        return [
          ...stops.slice(0, insertIndex),
          nextStop,
          ...stops.slice(insertIndex),
        ];
      });
    }),
  reorderTimetableStop: (sourceStopId, targetStopId, placement) =>
    set((state) =>
      mutateDdayStops(state, (stops) => {
        if (sourceStopId === targetStopId) return stops;

        const sourceStop = stops.find((stop) => stop.id === sourceStopId);
        const targetStop = stops.find((stop) => stop.id === targetStopId);
        if (!sourceStop || !targetStop || sourceStop.locked) return stops;

        const nextStops = stops.filter((stop) => stop.id !== sourceStopId);
        const targetIndex = nextStops.findIndex(
          (stop) => stop.id === targetStopId,
        );
        if (targetIndex < 0) return stops;

        const lockedSafePlacement = targetStop.locked ? "before" : placement;
        const insertIndex =
          targetIndex + (lockedSafePlacement === "after" ? 1 : 0);
        return [
          ...nextStops.slice(0, insertIndex),
          sourceStop,
          ...nextStops.slice(insertIndex),
        ];
      }),
    ),
  deleteTimetableStop: (stopId) =>
    set((state) =>
      mutateDdayStops(state, (stops) => {
        const stop = stops.find((item) => item.id === stopId);
        if (!stop || stop.locked) return stops;
        return stops.filter((item) => item.id !== stopId);
      }),
    ),
  resetTimetable: () => {
    const resetStops = cloneTimelineStopsByDay();
    set({
      timelineStopsByDay: resetStops,
      activeTimelineDay: "d-day",
      selectedStopId: resetStops["d-day"][0]?.id ?? "",
      activeStopId: null,
      selectedMapStop: 2,
    });
  },
}));
