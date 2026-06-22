"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { AppBar } from "@/components/ui";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  pendingPlaceStorageKey,
  useCreatePlaceMutation,
  usePlaceGeocode,
  usePlaceSearch,
  type CreatePlaceBody,
  type PendingTimetablePlace,
  type PlaceGeocodeItem,
  type PlaceSearchItem,
} from "@/lib/api/places";
import { BackButton } from "../../_components/buddy-patterns";
import { PlaceResultRow } from "./place-result-row";

// CB-10 Place Search (/places). Backend-driven, Bearer-gated, no MSW mock:
//   - PLACE-001 GET /api/places/search  — keyword 장소 검색 (+ optional concertId/roomId 컨텍스트)
//   - PLACE-002 GET /api/places/geocode — 주소 입력 시 좌표 후보 (forward geocoding)
//   - PLACE-003 POST /api/places        — "추가" 시 선택 장소를 일정용 Place로 upsert → placeId
//
// Handoff (Option A): reached from CB-11 "장소 추가" as /places?roomId=… . After upsert,
// navigate back to /timetable?roomId=&addPlaceId=&addPlaceName= so CB-11 inserts the new
// slot into its draft and re-runs SCHEDULE-002 recalculate. Without a roomId (e.g. bottom
// nav entry) the place is still upserted and shown as 추가됨, but there is no draft to feed.

// Heuristic: treat a query as an address (and fire PLACE-002 geocode) when it contains a
// number or a common Korean address token. Mirrors the previous fixture screen's behavior.
// (No \b — JS word boundaries are ASCII-only and don't work between Korean syllables.)
const ADDRESS_HINT = /[0-9]|주소|대로|로|길|구|동/;

function providerLabel(provider: string): string {
  if (provider === "KAKAO_KEYWORD") return "카카오 장소";
  if (provider === "KAKAO_ADDRESS") return "카카오 주소";
  return provider;
}

function searchKey(item: PlaceSearchItem): string {
  return `s:${item.provider}|${item.name}|${item.lat}|${item.lng}`;
}

function geocodeKey(item: PlaceGeocodeItem): string {
  return `a:${item.provider}|${item.address}|${item.lat}|${item.lng}`;
}

export function PlaceSearchScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");
  const concertId = searchParams.get("concertId");

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const trimmed = debouncedQuery.trim();
  const addressLike = ADDRESS_HINT.test(trimmed);

  const search = usePlaceSearch({ keyword: trimmed, concertId, roomId });
  const geocode = usePlaceGeocode(trimmed, addressLike);
  const createPlace = useCreatePlaceMutation();

  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const backHref = roomId ? `/timetable?roomId=${roomId}` : "/timetable";

  const placeResults = search.data ?? [];
  const addressResults = geocode.data ?? [];

  const handleAdd = (body: CreatePlaceBody, key: string) => {
    if (addedKeys.has(key) || pendingKey) return;
    setPendingKey(key);
    createPlace.mutate(body, {
      onSuccess: ({ placeId }) => {
        setPendingKey(null);
        if (roomId && placeId != null) {
          // Hand the upserted place to CB-11 via sessionStorage (not a URL param) so CB-11's
          // async page isn't re-rendered/remounted by a later param strip — which would
          // discard the inserted draft. Then navigate to a clean /timetable?roomId=.
          const pending: PendingTimetablePlace = { placeId, name: body.name };
          try {
            sessionStorage.setItem(
              pendingPlaceStorageKey(roomId),
              JSON.stringify(pending),
            );
          } catch {
            // sessionStorage unavailable — the place is still upserted; CB-11 just won't
            // auto-insert it (user can re-add). Don't block navigation on this.
          }
          router.push(`/timetable?roomId=${roomId}`);
          return;
        }
        setAddedKeys((prev) => new Set(prev).add(key));
      },
      onError: () => setPendingKey(null),
    });
  };

  const hasQuery = trimmed.length > 0;
  const searchEmpty =
    hasQuery && !search.isLoading && !search.isError && placeResults.length === 0;

  return (
    <div className="flex h-dvh min-h-0 flex-col">
      <AppBar
        title="장소 추가"
        left={<BackButton href={backHref} icon="close" />}
        right={<span aria-hidden className="block h-[38px] w-[38px]" />}
      />
      <label className="mx-4 mb-1 mt-2 flex h-[46px] shrink-0 items-center gap-2.5 rounded-[14px] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] px-3.5 text-[13.5px] text-[var(--cb-text)]">
        <Search size={18} className="shrink-0 text-[var(--cb-text-3)]" />
        <input
          aria-label="장소명 또는 주소 검색"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-[var(--cb-text-3)]"
          placeholder="장소명 또는 주소 검색"
          role="searchbox"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query ? (
          <button
            aria-label="검색어 지우기"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--cb-text-3)] transition duration-150 hover:bg-[var(--cb-surface-3)] hover:text-[var(--cb-text)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
            onClick={() => setQuery("")}
            type="button"
          >
            <X size={15} />
          </button>
        ) : null}
      </label>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!hasQuery ? (
          <EmptyResult text="장소명이나 주소를 검색해 일정에 추가할 장소를 찾아보세요" />
        ) : (
          <ResultSection title="장소 검색 결과">
            {search.isLoading ? (
              <EmptyResult text="검색 중…" />
            ) : search.isError ? (
              <EmptyResult text="장소를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." />
            ) : searchEmpty ? (
              <EmptyResult text="검색 결과가 없습니다" />
            ) : (
              placeResults.map((place) => {
                const key = searchKey(place);
                return (
                  <PlaceResultRow
                    key={key}
                    resultKey={key}
                    title={place.name}
                    meta={providerLabel(place.provider)}
                    sub={place.address}
                    variant="place"
                    added={addedKeys.has(key)}
                    pending={pendingKey === key}
                    onAdd={() =>
                      handleAdd(
                        {
                          provider: place.provider,
                          name: place.name,
                          address: place.address,
                          lat: place.lat,
                          lng: place.lng,
                        },
                        key,
                      )
                    }
                  />
                );
              })
            )}
          </ResultSection>
        )}

        {addressLike && (geocode.isLoading || addressResults.length > 0) ? (
          <ResultSection title={`주소 검색 결과 "${trimmed}"`} className="mt-5">
            {geocode.isLoading ? (
              <EmptyResult text="주소를 확인하는 중…" />
            ) : (
              addressResults.map((item) => {
                const key = geocodeKey(item);
                return (
                  <PlaceResultRow
                    key={key}
                    resultKey={key}
                    title={item.address}
                    meta="주소 후보"
                    sub={providerLabel(item.provider)}
                    variant="address"
                    added={addedKeys.has(key)}
                    pending={pendingKey === key}
                    onAdd={() =>
                      handleAdd(
                        {
                          provider: item.provider,
                          name: item.address,
                          address: item.address,
                          lat: item.lat,
                          lng: item.lng,
                        },
                        key,
                      )
                    }
                  />
                );
              })
            )}
          </ResultSection>
        ) : null}

        <p className="pt-4 text-center text-[10.5px] leading-5 text-[var(--cb-text-3)]">
          장소명으로 검색하면 Kakao 결과, 주소를 입력하면 주소 후보가 함께 나와요.
        </p>
      </div>
    </div>
  );
}

function ResultSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className} aria-label={title}>
      <h2 className="mb-1 text-[11px] font-bold uppercase tracking-[.1em] text-[var(--cb-text-3)]">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function EmptyResult({ text }: { text: string }) {
  return (
    <div className="rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-1)] p-4 text-center text-[12px] text-[var(--cb-text-3)]">
      {text}
    </div>
  );
}
