"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AppBar } from "@/components/ui";
import {
  BackButton,
  MapPlaceCard,
  RouteMapCanvas,
} from "../../_components/buddy-patterns";
import {
  useRoomMap,
  type RoomMapBounds,
  type RoomMapSlot,
} from "@/lib/api/timeline";
import { type TimetableStop } from "@/lib/data";

// CB-12 Map View → MAP-001 (GET /api/rooms/{roomId}/map, Bearer auth). This is the
// "보기 전용" 지도 핀/경로선 endpoint: it returns slots (each with lat/lng), routeSegments,
// and a mapBounds viewport — a SINGLE schedule, with no per-day ("일차") concept. So unlike
// the old static store this screen has no D-Day/D+1 toggle (showDayToggle={false}); the
// reusable map/route client lives in src/lib/api/timeline.ts (shared with CB-09).

// Normalize a lat/lng into 0–100% canvas coordinates within MAP-001's mapBounds, used by
// RouteMapCanvas's SVG fallback layer (the Kakao SDK path uses lat/lng directly).
function computeMapPoint(lat: number, lng: number, bounds: RoomMapBounds | null) {
  if (!bounds) return { left: 50, top: 50 };
  const lngSpan = bounds.northEast.lng - bounds.southWest.lng;
  const latSpan = bounds.northEast.lat - bounds.southWest.lat;
  const clamp = (value: number) => Math.max(4, Math.min(96, value));
  return {
    left: lngSpan ? clamp(((lng - bounds.southWest.lng) / lngSpan) * 100) : 50,
    top: latSpan ? clamp(((bounds.northEast.lat - lat) / latSpan) * 100) : 50,
  };
}

// A stable, guaranteed-unique key per slot for React keys + hover/selection sync. MAP-001
// is a read, so `clientId` (an FE draft id) can come back null/empty; keying hover on it
// would collapse several pins onto one id. Prefer the persisted `slotId`, then a non-empty
// clientId, then the index.
function slotKey(slot: RoomMapSlot, index: number): string {
  if (slot.slotId != null) return `s-${slot.slotId}`;
  if (slot.clientId) return slot.clientId;
  return `i-${index}`;
}

// Build the map pins from the MAP-001 slots that carry a coordinate. Start/end pins mirror
// the marker convention used across the app via `anchorMarker` (출발 = pin icon, 도착 =
// star, middle = number); slots without a coordinate simply get no pin.
function buildMapStops(
  slots: RoomMapSlot[],
  bounds: RoomMapBounds | null,
): TimetableStop[] {
  const withCoords = slots.filter(
    (slot) => typeof slot.lat === "number" && typeof slot.lng === "number",
  );
  const total = withCoords.length;
  return withCoords.map((slot, index) => {
    const lat = slot.lat as number;
    const lng = slot.lng as number;
    return {
      id: slotKey(slot, index),
      place: slot.title,
      pinLabel: String(slot.order ?? index + 1),
      dwellMinutes: 0,
      transitMinutes: 0,
      mode: "walk" as const,
      category: "",
      time: "",
      address: "",
      mapPoint: { lat, lng, ...computeMapPoint(lat, lng, bounds) },
      locked: false,
      anchorMarker:
        index === 0 ? "start" : index === total - 1 ? "end" : undefined,
    };
  });
}

export function MapScreen({ roomId }: { roomId: number | null }) {
  const backHref = roomId != null ? `/timeline?roomId=${roomId}` : "/timeline";
  const [selectedStopId, setSelectedStopId] = useState("");
  const [activeStopId, setActiveStopId] = useState<string | null>(null);

  const { data, isLoading, isError } = useRoomMap(roomId);

  const stops = useMemo(
    () => buildMapStops(data?.slots ?? [], data?.mapBounds ?? null),
    [data?.slots, data?.mapBounds],
  );

  const currentSelectedStopId = stops.some(
    (stop) => stop.id === selectedStopId,
  )
    ? selectedStopId
    : (stops[0]?.id ?? "");
  const selectedIndex = stops.findIndex(
    (stop) => stop.id === currentSelectedStopId,
  );
  const selected = selectedIndex >= 0 ? stops[selectedIndex] : stops[0];
  const nextStop = selectedIndex >= 0 ? stops[selectedIndex + 1] : undefined;

  const selectStop = useCallback((stopId: string) => {
    setSelectedStopId(stopId);
    setActiveStopId(stopId);
  }, []);

  const moveToNextStop = () => {
    if (nextStop) selectStop(nextStop.id);
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col">
      <AppBar title="지도" left={<BackButton href={backHref} />} />

      {roomId == null ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <EmptyNotice
            title="방을 먼저 선택해 주세요"
            description="내 방 목록에서 일정을 볼 방을 선택하면 지도가 표시돼요."
            actionHref="/my-rooms"
            actionLabel="내 방으로 가기"
          />
        </div>
      ) : isError ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <EmptyNotice
            title="지도를 불러오지 못했어요"
            description="잠시 후 다시 시도하거나, 타임라인에서 일정을 먼저 등록해 주세요."
            actionHref={backHref}
            actionLabel="타임라인으로 가기"
          />
        </div>
      ) : (
        <>
          <div className="relative min-h-0 flex-1">
            <RouteMapCanvas
              stops={stops}
              selectedStopId={currentSelectedStopId}
              activeStopId={activeStopId}
              onSelectStop={selectStop}
              onHoverStop={setActiveStopId}
              showDayToggle={false}
              showLabel={false}
              className="absolute inset-0"
              full
            />
            {isLoading ? (
              <div className="absolute inset-x-4 top-1/2 z-[6] -translate-y-1/2 rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[rgba(14,14,16,.84)] p-3 text-center text-[12px] font-semibold text-[var(--cb-text-2)] backdrop-blur">
                지도를 불러오는 중…
              </div>
            ) : null}
          </div>
          {selected ? (
            <div className="shrink-0 border-t border-[var(--cb-line)] p-4">
              <MapPlaceCard
                stop={selected}
                hasNextStop={Boolean(nextStop)}
                onNextStop={moveToNextStop}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function EmptyNotice({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="text-[15px] font-bold text-[var(--cb-text)]">{title}</div>
      <p className="max-w-[260px] text-[12.5px] leading-5 text-[var(--cb-text-3)]">
        {description}
      </p>
      <Link
        href={actionHref}
        className="inline-flex h-[40px] items-center justify-center rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] px-4 text-[12.5px] font-semibold text-[var(--cb-text)] transition duration-150 hover:bg-[var(--cb-surface-3)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
