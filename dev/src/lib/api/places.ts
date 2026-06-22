import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { http } from "@/lib/api/http";
import { mswReadyPromise } from "@/mocks/ready";

// CB-10 Place Search (/places) — PLACE-001/002/003, all Bearer auth.
//
// - PLACE-001 GET  /api/places/search   — Kakao keyword 기반 장소 검색 (keyword 필수, concertId/roomId 선택)
// - PLACE-002 GET  /api/places/geocode  — 주소 → 좌표 (forward geocoding, address 필수)
// - PLACE-003 POST /api/places          — 선택 결과를 일정용 Place로 upsert → placeId 반환
//
// No MSW mock (Bearer-gated, same precedent as CB-04/CB-09 reads; the POST is a
// state-mutating call that must always hit the real backend). Types are transcribed
// field-for-field from each Notion page's Request Body + Response tables, including
// nullability. `provider` is an open string in the response tables (KAKAO_KEYWORD /
// KAKAO_ADDRESS …), so it is typed `string` rather than a closed enum.

type ApiEnvelope<T> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T | null;
};

// PLACE-001 Response: result.items[] (non-null) — { name, address, lat, lng, provider }.
export type PlaceSearchItem = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  provider: string;
};

// PLACE-002 Response: result.items[] — { address, lat, lng, provider } (no `name`).
export type PlaceGeocodeItem = {
  address: string;
  lat: number;
  lng: number;
  provider: string;
};

export type PlaceSearchParams = {
  keyword: string;
  concertId?: string | null;
  roomId?: string | null;
};

export async function fetchPlaceSearch(
  params: PlaceSearchParams,
): Promise<PlaceSearchItem[]> {
  const response = await http.get<ApiEnvelope<{ items: PlaceSearchItem[] }>>(
    "/api/places/search",
    {
      params: {
        keyword: params.keyword,
        concertId: params.concertId || undefined,
        roomId: params.roomId || undefined,
      },
    },
  );
  return response.data.result?.items ?? [];
}

export async function fetchPlaceGeocode(
  address: string,
): Promise<PlaceGeocodeItem[]> {
  const response = await http.get<ApiEnvelope<{ items: PlaceGeocodeItem[] }>>(
    "/api/places/geocode",
    { params: { address } },
  );
  return response.data.result?.items ?? [];
}

// PLACE-003 Request Body — provider/name/address/lat/lng required, providerPlaceId nullable.
export type CreatePlaceBody = {
  provider: string;
  providerPlaceId?: string | null;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export type CreatePlaceResult = {
  // result.placeId is the only field and is documented Nullable.
  placeId: number | null;
};

export async function createPlace(
  body: CreatePlaceBody,
): Promise<CreatePlaceResult> {
  const response = await http.post<ApiEnvelope<CreatePlaceResult>>(
    "/api/places",
    body,
  );
  return { placeId: response.data.result?.placeId ?? null };
}

// Shared MSW-ready gate (matches src/lib/api/rooms.ts) so the first on-mount query in dev
// doesn't leak past the worker boundary; resolves immediately outside development.
function useMswReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    mswReadyPromise.then(() => setReady(true));
  }, []);
  return ready;
}

export function usePlaceSearch(params: PlaceSearchParams) {
  const ready = useMswReady();
  const keyword = params.keyword.trim();

  return useQuery({
    queryKey: [
      "place-search",
      keyword,
      params.concertId ?? null,
      params.roomId ?? null,
    ],
    queryFn: () =>
      fetchPlaceSearch({
        keyword,
        concertId: params.concertId,
        roomId: params.roomId,
      }),
    enabled: ready && keyword.length > 0,
  });
}

export function usePlaceGeocode(address: string, addressLike: boolean) {
  const ready = useMswReady();
  const trimmed = address.trim();

  return useQuery({
    queryKey: ["place-geocode", trimmed],
    queryFn: () => fetchPlaceGeocode(trimmed),
    enabled: ready && addressLike && trimmed.length > 0,
  });
}

export function useCreatePlaceMutation() {
  return useMutation({
    mutationFn: (body: CreatePlaceBody) => createPlace(body),
  });
}

// CB-10 → CB-11 handoff channel. CB-10 writes the upserted place here (keyed by roomId)
// and navigates to a clean /timetable?roomId=; CB-11 reads + clears it on bootstrap and
// inserts the slot. Using sessionStorage (not a URL param) avoids the param-strip
// re-render that would remount CB-11's async page and discard the inserted draft.
export type PendingTimetablePlace = { placeId: number; name: string };

export function pendingPlaceStorageKey(roomId: string | number): string {
  return `cb11:pendingPlace:${roomId}`;
}
