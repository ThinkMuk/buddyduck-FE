"use client";

import Link from "next/link";
import { Edit3, Map as MapIcon, MapPin as MapPinIcon, Star } from "lucide-react";
import { useCallback, useState } from "react";
import { AppBar } from "@/components/ui";
import {
  BackButton,
  formatStopMinutes,
  RouteMapCanvas,
} from "../../_components/buddy-patterns";
import {
  useRoomMap,
  useTimeline,
  type RoomMapBounds,
  type RoomMapSlot,
  type TimelineRouteSegment,
  type TimelineSlot,
} from "@/lib/api/timeline";
import { type TimetableStop } from "@/lib/data";
import { cn } from "@/lib/utils";

// CB-09 combines two reads (per docs/maps-place-api-boundary.md): SCHEDULE-001 drives the
// schedule LIST, and MAP-001 drives the map preview pins/route (rendered with the Kakao
// SDK via the shared RouteMapCanvas). The two are linked by `clientId` so selecting a
// schedule card highlights its map pin and vice versa.

function formatSlotTime(iso: string | null) {
  if (!iso || iso.length < 16) return null;
  return iso.slice(11, 16);
}

function formatSlotRange(slot: TimelineSlot) {
  const start = formatSlotTime(slot.startAt);
  const end = formatSlotTime(slot.endAt);
  if (start && end) return `${start} – ${end}`;
  return start ?? end ?? null;
}

function getSegmentModeLabel(mode: string) {
  switch (mode) {
    case "WALK":
      return "도보";
    case "CAR_TAXI":
      return "택시 · 차량";
    default:
      return mode;
  }
}

function formatSegmentDistance(distanceMeters: number | null) {
  if (distanceMeters == null) return null;
  if (distanceMeters >= 1000) return `${(distanceMeters / 1000).toFixed(1)}km`;
  return `${distanceMeters}m`;
}

function formatSegmentText(segment: TimelineRouteSegment) {
  const distance = formatSegmentDistance(segment.distanceMeters);
  const base = `${getSegmentModeLabel(segment.mode)} ${segment.durationMinutes}분`;
  const withDistance = distance ? `${base} · ${distance}` : base;
  // FE straight-line estimate (shown until the BE provides the real routed segment).
  return segment.provider === "FALLBACK_STRAIGHT_LINE"
    ? `${withDistance} (예상)`
    : withDistance;
}

// Great-circle distance in metres between two coordinates (for the FE fallback estimate).
function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// When the backend returns no routeSegment for a consecutive pair (e.g. a freshly created
// room), synthesize a display-only straight-line estimate so the timeline still shows
// transit time/distance. The authoritative routed segment (provider KAKAO_DRIVING, with a
// persisted routeSegmentId) is the backend's responsibility — see docs note. Marked
// provider FALLBACK_STRAIGHT_LINE and rendered with a "(예상)" hint.
function buildFallbackSegment(
  slot: TimelineSlot,
  nextSlot: TimelineSlot,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): TimelineRouteSegment {
  const distanceMeters = haversineMeters(from, to);
  // Rough urban estimate (~15 km/h ≈ 250 m/min).
  const durationMinutes = Math.max(1, Math.round(distanceMeters / 250));
  return {
    routeSegmentId: -1,
    fromSlotId: slot.slotId ?? -1,
    toSlotId: nextSlot.slotId ?? -1,
    mode: "CAR_TAXI",
    distanceMeters,
    durationMinutes,
    manuallyAdjusted: false,
    provider: "FALLBACK_STRAIGHT_LINE",
  };
}

// Normalize a lat/lng into 0–100% canvas coordinates within the MAP-001 mapBounds, used by
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

// A stable, guaranteed-unique key per slot for list React keys + hover/selection sync.
// SCHEDULE-001/MAP-001 are reads, so `clientId` (an FE draft id) can come back null/empty;
// keying hover on it would collapse several cards onto one id and highlight them together.
// Prefer the persisted `slotId`, then a non-empty clientId, then the index.
function slotKey(
  slot: { slotId: number | null; clientId: string | null },
  index: number,
): string {
  if (slot.slotId != null) return `s-${slot.slotId}`;
  if (slot.clientId) return slot.clientId;
  return `i-${index}`;
}

type SlotRole = "start" | "end" | "mid";

function slotRole(index: number, total: number): SlotRole {
  if (index === 0) return "start";
  if (index === total - 1) return "end";
  return "mid";
}

// Build a coordinate lookup from MAP-001 slots, keyed by the persisted slotId and (as a
// fallback) the order, so coordinates can be joined onto the SCHEDULE-001 schedule slots.
function buildCoordLookup(mapSlots: RoomMapSlot[]) {
  const bySlotId = new Map<number, { lat: number; lng: number }>();
  const byOrder = new Map<number, { lat: number; lng: number }>();
  for (const slot of mapSlots) {
    if (typeof slot.lat === "number" && typeof slot.lng === "number") {
      const coord = { lat: slot.lat, lng: slot.lng };
      if (slot.slotId != null) bySlotId.set(slot.slotId, coord);
      byOrder.set(slot.order, coord);
    }
  }
  return { bySlotId, byOrder };
}

// Build the map pins from the SCHEDULE-001 schedule slots (joining MAP-001 coordinates),
// so the map and the list share the exact same `stopId` per slot — that is what makes
// hover/selection sync in both directions. Start/end pins mirror the schedule-list markers
// via `anchorMarker` (출발 = pin icon, 도착 = star, middle = number); slots without a
// coordinate simply get no pin.
function buildMapStops(
  scheduleSlots: TimelineSlot[],
  mapSlots: RoomMapSlot[],
  bounds: RoomMapBounds | null,
): TimetableStop[] {
  const { bySlotId, byOrder } = buildCoordLookup(mapSlots);
  const total = scheduleSlots.length;
  const stops: TimetableStop[] = [];
  scheduleSlots.forEach((slot, index) => {
    const coord =
      slot.slotId != null
        ? (bySlotId.get(slot.slotId) ?? byOrder.get(slot.order))
        : byOrder.get(slot.order);
    if (!coord) return;
    const role = slotRole(index, total);
    stops.push({
      id: slotKey(slot, index),
      place: slot.title,
      pinLabel: String(slot.order ?? index + 1),
      dwellMinutes: 0,
      transitMinutes: 0,
      mode: "walk",
      category: "",
      time: "",
      address: "",
      mapPoint: {
        lat: coord.lat,
        lng: coord.lng,
        ...computeMapPoint(coord.lat, coord.lng, bounds),
      },
      // Mirror the schedule list markers: 출발 = pin icon, 도착 = star, middle = number.
      locked: false,
      anchorMarker:
        role === "start" ? "start" : role === "end" ? "end" : undefined,
    });
  });
  return stops;
}

export function TimelineScreen({ roomId }: { roomId: number | null }) {
  const backHref = roomId != null ? `/rooms/${roomId}` : "/my-rooms";
  const [selectedStopId, setSelectedStopId] = useState("");
  const [activeStopId, setActiveStopId] = useState<string | null>(null);

  const { data, isLoading, isError } = useTimeline(roomId);
  const { data: mapData } = useRoomMap(roomId);

  const title = data?.room?.title ?? "타임라인";
  const slots = data?.slots ?? [];
  const routeSegments = data?.routeSegments ?? [];
  const warnings = data?.warnings ?? [];

  const mapStops = buildMapStops(
    slots,
    mapData?.slots ?? [],
    mapData?.mapBounds ?? null,
  );
  const currentSelectedStopId = mapStops.some(
    (stop) => stop.id === selectedStopId,
  )
    ? selectedStopId
    : (mapStops[0]?.id ?? "");

  const segmentBySlotPair = new Map<string, TimelineRouteSegment>();
  for (const segment of routeSegments) {
    segmentBySlotPair.set(`${segment.fromSlotId}->${segment.toSlotId}`, segment);
  }

  // Coordinate lookup (from MAP-001) used to estimate transit when the backend has not
  // provided a routeSegment yet.
  const coordLookup = buildCoordLookup(mapData?.slots ?? []);
  const coordForSlot = (slot: TimelineSlot) =>
    (slot.slotId != null ? coordLookup.bySlotId.get(slot.slotId) : undefined) ??
    coordLookup.byOrder.get(slot.order) ??
    null;

  const resolveSegment = (
    slot: TimelineSlot,
    nextSlot: TimelineSlot,
  ): TimelineRouteSegment | undefined => {
    if (slot.slotId != null && nextSlot.slotId != null) {
      const beSegment = segmentBySlotPair.get(
        `${slot.slotId}->${nextSlot.slotId}`,
      );
      if (beSegment) return beSegment;
    }
    const from = coordForSlot(slot);
    const to = coordForSlot(nextSlot);
    if (from && to) return buildFallbackSegment(slot, nextSlot, from, to);
    return undefined;
  };

  const selectStop = useCallback((stopId: string) => {
    setSelectedStopId(stopId);
    setActiveStopId(stopId);
  }, []);

  // Carry the active roomId into the 수정(CB-11) / 지도(CB-12) destinations so the
  // schedule context isn't dropped (CB-11 now bootstraps its draft from ?roomId=).
  const timetableHref =
    roomId != null ? `/timetable?roomId=${roomId}` : "/timetable";
  const mapHref = roomId != null ? `/map?roomId=${roomId}` : "/map";

  return (
    <div className="flex h-dvh min-h-0 flex-col">
      <AppBar
        title={title}
        left={<BackButton href={backHref} />}
        right={
          <Link
            href={mapHref}
            aria-label="지도 열기"
            className="grid h-[38px] w-[38px] place-items-center rounded-full border border-[var(--cb-line)] bg-[var(--cb-surface-2)] text-[var(--cb-text)] transition duration-150 hover:bg-[var(--cb-surface-3)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
          >
            <MapIcon size={18} />
          </Link>
        }
      />

      {roomId == null ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <EmptyNotice
            title="방을 먼저 선택해 주세요"
            description="내 방 목록에서 일정을 볼 방을 선택하면 타임라인이 표시돼요."
            actionHref="/my-rooms"
            actionLabel="내 방으로 가기"
          />
        </div>
      ) : (
        <>
          <RouteMapCanvas
            stops={mapStops}
            selectedStopId={currentSelectedStopId}
            activeStopId={activeStopId}
            onSelectStop={selectStop}
            onHoverStop={setActiveStopId}
            showDayToggle={false}
            className="h-[184px] border-b border-[var(--cb-line)]"
          />

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {isLoading ? (
              <p className="py-10 text-center text-[13px] text-[var(--cb-text-3)]">
                일정을 불러오는 중…
              </p>
            ) : isError ? (
              <p className="py-10 text-center text-[13px] text-[var(--cb-text-3)]">
                일정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
              </p>
            ) : slots.length === 0 ? (
              <EmptyNotice
                title="아직 등록된 일정이 없어요"
                description="수정 화면에서 일정을 추가하면 이곳 타임라인에 표시돼요."
                actionHref={timetableHref}
                actionLabel="일정 수정하기"
              />
            ) : (
              <>
                {warnings.length > 0 ? (
                  <ul className="mb-4 flex flex-col gap-2">
                    {warnings.map((warning, index) => (
                      <li
                        key={index}
                        className="rounded-[var(--r-md)] border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] px-3 py-2 text-[12px] font-semibold text-[var(--cb-yellow-2)]"
                      >
                        {warning}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="flex flex-col">
                  {slots.map((slot, index) => {
                    // Steering: first and last timeline items are always fixed. They are
                    // now rendered as DISTINCT roles — 출발지 (start) vs 목적지 (end) — and
                    // keyed by a unique stopId so hovering one never highlights the other.
                    const role: SlotRole =
                      index === 0
                        ? "start"
                        : index === slots.length - 1
                          ? "end"
                          : "mid";
                    const stopId = slotKey(slot, index);
                    const nextSlot = slots[index + 1];
                    const segment = nextSlot
                      ? resolveSegment(slot, nextSlot)
                      : undefined;

                    return (
                      <TimelineSlotItem
                        key={stopId}
                        slot={slot}
                        stopId={stopId}
                        role={role}
                        segment={segment}
                        selected={currentSelectedStopId === stopId}
                        active={activeStopId === stopId}
                        onSelect={() => selectStop(stopId)}
                        onHover={setActiveStopId}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-[var(--cb-line)] bg-[rgba(14,14,16,.96)] px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <TimelineAction href={timetableHref} icon={<Edit3 size={17} />} label="수정" />
        <TimelineAction href={mapHref} icon={<MapIcon size={17} />} label="지도" />
      </div>
    </div>
  );
}

function TimelineSlotItem({
  slot,
  stopId,
  role,
  segment,
  selected,
  active,
  onSelect,
  onHover,
}: {
  slot: TimelineSlot;
  stopId: string;
  role: SlotRole;
  segment: TimelineRouteSegment | undefined;
  selected: boolean;
  active: boolean;
  onSelect: () => void;
  onHover: (stopId: string | null) => void;
}) {
  const isStart = role === "start";
  const isEnd = role === "end";
  const isAnchor = isStart || isEnd;
  const timeRange = formatSlotRange(slot);
  const isActive = selected || active;
  const ariaLabel = isStart
    ? `출발 ${slot.title}`
    : isEnd
      ? `도착 ${slot.title}`
      : `일정 ${slot.order}: ${slot.title}`;
  const roleBadge = isStart ? "출발" : "도착";

  return (
    <>
      <div className="flex gap-[13px]">
        <div className="flex w-[30px] shrink-0 flex-col items-center">
          <span
            className={cn(
              "grid h-[30px] w-[30px] place-items-center rounded-full border-[1.5px] text-[13px] font-black",
              isAnchor
                ? "border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)]"
                : "border-[var(--cb-line-2)] bg-[var(--cb-surface-2)] text-[var(--cb-text)]",
              isActive && !isAnchor
                ? "border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] text-[var(--cb-yellow-2)]"
                : null,
            )}
          >
            {isStart ? (
              <MapPinIcon size={14} fill="currentColor" />
            ) : isEnd ? (
              <Star size={13} fill="currentColor" />
            ) : (
              slot.order
            )}
          </span>
        </div>
        <button
          aria-label={ariaLabel}
          className={cn(
            "relative mb-0.5 min-w-0 flex-1 rounded-[var(--r-md)] border bg-[var(--cb-surface-1)] p-[13px_14px] text-left shadow-[var(--sh-card)] transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]",
            isAnchor
              ? "border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)]"
              : "border-[var(--cb-line)]",
            isActive && !isAnchor
              ? "scale-[1.01] border-[var(--cb-line-2)] bg-[var(--cb-surface-2)]"
              : null,
            isActive && isAnchor ? "scale-[1.01]" : null,
          )}
          data-selected={selected ? "true" : "false"}
          onBlur={() => onHover(null)}
          onClick={onSelect}
          onFocus={() => onHover(stopId)}
          onMouseEnter={() => onHover(stopId)}
          onMouseLeave={() => onHover(null)}
          type="button"
        >
          {isAnchor ? (
            <>
              <div className="pr-20 text-[15px] font-extrabold text-[var(--cb-yellow-2)]">
                {slot.title}
              </div>
              {timeRange ? (
                <div className="mt-1.5 text-[11.5px] text-[var(--cb-text-2)]">
                  {timeRange}
                </div>
              ) : null}
              <span
                className={cn(
                  "absolute right-3.5 top-[13px] inline-flex items-center gap-1 rounded-[var(--r-pill)] px-2 py-[3px] text-[9.5px] font-extrabold tracking-[.06em]",
                  isStart
                    ? "border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] text-[var(--cb-yellow-2)]"
                    : "bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)]",
                )}
              >
                {isStart ? (
                  <MapPinIcon size={11} />
                ) : (
                  <Star size={11} fill="currentColor" />
                )}
                {roleBadge}
              </span>
            </>
          ) : (
            <>
              {timeRange ? (
                <span className="mb-2 inline-flex rounded-[var(--r-pill)] border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] px-[9px] py-[3px] text-[11px] font-bold text-[var(--cb-yellow-2)]">
                  {timeRange}
                </span>
              ) : null}
              <div className="text-[14.5px] font-bold tracking-[-.01em]">{slot.title}</div>
              <div className="mt-2 border-t border-[var(--cb-line)] pt-2 text-[11.5px] text-[var(--cb-text-2)]">
                머무는 시간 {formatStopMinutes(slot.dwellMinutes)}
              </div>
            </>
          )}
        </button>
      </div>
      {segment ? (
        <div className="my-0.5 flex items-center gap-[13px]">
          <div className="flex w-[30px] shrink-0 justify-center">
            <span className="h-[34px] w-0.5 bg-[repeating-linear-gradient(var(--cb-line-2)_0_4px,transparent_4px_8px)]" />
          </div>
          <div className="flex items-center gap-[7px] text-[11px] font-semibold text-[var(--cb-text-3)]">
            <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[var(--cb-line)] bg-[var(--cb-surface-2)] text-[11px] font-bold text-[var(--cb-text-2)]">
              {getSegmentModeLabel(segment.mode).slice(0, 1)}
            </span>
            <span>{formatSegmentText(segment)}</span>
          </div>
        </div>
      ) : null}
    </>
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

function TimelineAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-[46px] items-center justify-center gap-1.5 rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] text-[12.5px] font-semibold text-[var(--cb-text)] transition duration-150 hover:bg-[var(--cb-surface-3)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
    >
      <span className="text-[var(--cb-yellow)]">{icon}</span>
      {label}
    </Link>
  );
}
