import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { http } from "@/lib/api/http";
import { mswReadyPromise } from "@/mocks/ready";

// SCHEDULE-001 GET /api/rooms/{roomId}/timeline — CB-09 Timeline 통합 조회 (Bearer auth).
//
// `room` / `schedule` fields are transcribed 1:1 from SCHEDULE-001's own Response table.
// The `slots` / `routeSegments` / `warnings` ARRAY ELEMENT shapes are NOT documented on
// the SCHEDULE-001 page (its Response table lists them only as `object` and its Example
// JSON shows empty arrays). They are typed here from the sibling SCHEDULE-002 (CB-11
// Timetable Edit) page, which documents identically-named `slots[]` / `routeSegments[]` /
// `warnings` element fields field-for-field. This is an informed inference about the read
// endpoint, agreed as Decision 1-A — not a field invented out of nothing.

export type TimelineRoom = {
  id: number;
  title: string;
};

export type TimelineSchedule = {
  id: number;
  arrivalBufferMinutes: number;
  timezone: string;
};

// Slot element fields per SCHEDULE-002 result.slots[]. `slotId` is null for not-yet-saved
// draft slots; `placeId`/`startAt`/`endAt` are nullable per that spec. `slotType`/`category`
// are carried through from the response because the SCHEDULE-002/003/004 draft requests
// require them per their Request Body Example (the timeline server keys anchor handling on
// `slotType`: MEETING / PLACE / PERFORMANCE).
export type TimelineSlot = {
  clientId: string | null;
  slotId: number | null;
  order: number;
  title: string;
  placeId: number | null;
  dwellMinutes: number;
  startAt: string | null;
  endAt: string | null;
  locked: boolean;
  slotType: string | null;
  category: string | null;
};

// Route-segment element fields. NOTE: the live SCHEDULE-001 read returns segments keyed by
// the persisted **slotId** (`fromSlotId`/`toSlotId`) with a `routeSegmentId`, confirmed from
// a real response — this differs from the SCHEDULE-002 *draft* request/response which keys
// by the FE-generated `clientId`. `mode` is an open enum (WALK / CAR_TAXI);
// `distanceMeters`/`provider` are nullable. `provider` reflects how it was computed on the
// server (e.g. KAKAO_DRIVING) or a FE display estimate (FALLBACK_STRAIGHT_LINE).
export type TimelineRouteSegment = {
  routeSegmentId: number;
  fromSlotId: number;
  toSlotId: number;
  mode: string;
  distanceMeters: number | null;
  durationMinutes: number;
  manuallyAdjusted: boolean;
  provider: string | null;
};

export type TimelineResult = {
  room: TimelineRoom | null;
  schedule: TimelineSchedule | null;
  slots: TimelineSlot[];
  routeSegments: TimelineRouteSegment[];
  warnings: string[];
};

type ApiEnvelope<T> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T | null;
};

export async function fetchTimeline(roomId: number): Promise<TimelineResult> {
  const response = await http.get<ApiEnvelope<TimelineResult>>(
    `/api/rooms/${roomId}/timeline`,
  );
  const result = response.data.result;

  // SCHEDULE-001 marks result and each nested key as Nullable=Y, so normalize the arrays
  // to [] and the objects to null defensively rather than assuming they are present.
  return {
    room: result?.room ?? null,
    schedule: result?.schedule ?? null,
    slots: result?.slots ?? [],
    routeSegments: result?.routeSegments ?? [],
    warnings: result?.warnings ?? [],
  };
}

export function useTimeline(roomId: number | null) {
  // See src/lib/api/concerts.ts §"MSW registration race" — gate the on-mount query until
  // the dev MSW worker has settled so the first request can't leak past it. (CB-09 itself
  // has no mock, but the gate keeps parity with every other on-mount query in this app.)
  const [ready, setReady] = useState(false);
  useEffect(() => {
    mswReadyPromise.then(() => setReady(true));
  }, []);

  return useQuery({
    queryKey: ["timeline", roomId],
    queryFn: () => fetchTimeline(roomId as number),
    enabled: ready && roomId != null,
    // Bearer-gated read: a non-member viewer gets 403 COMMON403 / 404 COMMON404 per the
    // spec, so do not retry those.
    retry: false,
  });
}

// MAP-001 GET /api/rooms/{roomId}/map — CB-12 Map View "지도 핀/경로선 표시용 조회"
// (Bearer auth). Per docs/maps-place-api-boundary.md, CB-09's timeline map preview needs
// BOTH SCHEDULE-001 (the schedule list) AND MAP-001 (the map pins/route) + the Kakao SDK
// for rendering — so CB-09 also consumes this endpoint (MAP-001's 사용 화면 is documented
// as CB-12, but the boundary doc explicitly assigns the same map data to CB-09).
//
// `mapBounds` is transcribed 1:1 from MAP-001's Response table. The `slots` /
// `routeSegments` ELEMENT shapes are NOT documented on the MAP-001 page (its Response
// table lists them only as `object` and its Example shows empty arrays). Since this is
// the pin/route endpoint, each slot must carry a coordinate; the fields are typed by the
// same inference used for SCHEDULE-001 (SCHEDULE-002 base) PLUS `lat`/`lng` (nullable) —
// matching the `lat`/`lng` naming already used by `ConcertSummary` and `mapBounds` in this
// API. This inference is unverifiable from dev/e2e (Bearer-gated, returns 401/403), so pin
// placement must be confirmed against the real backend with a real session; the documented
// `mapBounds` viewport is the reliable part.

export type RoomMapSlot = {
  clientId: string | null;
  slotId: number | null;
  order: number;
  title: string;
  placeId: number | null;
  lat: number | null;
  lng: number | null;
  locked: boolean;
};

export type RoomMapBounds = {
  southWest: { lat: number; lng: number };
  northEast: { lat: number; lng: number };
};

export type RoomMapResult = {
  slots: RoomMapSlot[];
  routeSegments: TimelineRouteSegment[];
  mapBounds: RoomMapBounds | null;
};

export async function fetchRoomMap(roomId: number): Promise<RoomMapResult> {
  const response = await http.get<ApiEnvelope<RoomMapResult>>(
    `/api/rooms/${roomId}/map`,
  );
  const result = response.data.result;
  return {
    slots: result?.slots ?? [],
    routeSegments: result?.routeSegments ?? [],
    mapBounds: result?.mapBounds ?? null,
  };
}

export function useRoomMap(roomId: number | null) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    mswReadyPromise.then(() => setReady(true));
  }, []);

  return useQuery({
    queryKey: ["room-map", roomId],
    queryFn: () => fetchRoomMap(roomId as number),
    enabled: ready && roomId != null,
    retry: false,
  });
}
