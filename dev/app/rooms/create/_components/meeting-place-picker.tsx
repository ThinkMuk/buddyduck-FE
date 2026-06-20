"use client";

import { MapPin, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  KakaoMapInstance,
  KakaoMapsApi,
  KakaoMarker,
  KakaoPlace,
} from "@/lib/kakao-map";
import { getKakaoMapAppKey, loadKakaoPlaces } from "@/lib/kakao-map";
import type { RoomPlace } from "@/lib/api/rooms";
import { cn } from "@/lib/utils";

type PickerState = "loading" | "ready" | "fallback";

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }; // Seoul City Hall

export function MeetingPlacePicker({
  value,
  onChange,
  center,
}: {
  value: RoomPlace | null;
  onChange: (place: RoomPlace | null) => void;
  center?: { lat: number; lng: number } | null;
}) {
  const hasKey = Boolean(getKakaoMapAppKey());
  const [state, setState] = useState<PickerState>(
    hasKey ? "loading" : "fallback",
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [searched, setSearched] = useState(false);

  const kakaoRef = useRef<KakaoMapsApi | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markerRef = useRef<KakaoMarker | null>(null);
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const placeMarker = useCallback((lat: number, lng: number) => {
    const kakao = kakaoRef.current;
    const map = mapRef.current;
    if (!kakao || !map) return;
    const position = new kakao.maps.LatLng(lat, lng);
    if (markerRef.current) {
      markerRef.current.setPosition(position);
    } else {
      markerRef.current = new kakao.maps.Marker({ position, map });
    }
    map.setCenter(position);
  }, []);

  // Reverse-geocode a clicked coordinate into a human-readable place.
  const selectFromCoord = useCallback((lat: number, lng: number) => {
    const kakao = kakaoRef.current;
    placeMarker(lat, lng);
    const coordLabel = `위도 ${lat.toFixed(5)}, 경도 ${lng.toFixed(5)}`;
    const services = kakao?.maps.services;
    if (!kakao || !services) {
      onChangeRef.current({
        name: coordLabel,
        address: coordLabel,
        lat,
        lng,
        provider: "KAKAO_ADDRESS",
      });
      return;
    }
    const geocoder = new services.Geocoder();
    geocoder.coord2Address(lng, lat, (data, status) => {
      const top = status === services.Status.OK ? data[0] : undefined;
      const address =
        top?.road_address?.address_name ??
        top?.address?.address_name ??
        coordLabel;
      onChangeRef.current({
        name: address,
        address,
        lat,
        lng,
        provider: "KAKAO_ADDRESS",
      });
    });
  }, [placeMarker]);

  // Load the SDK (with the services library) once on mount.
  useEffect(() => {
    if (!hasKey) return;
    let active = true;
    loadKakaoPlaces().then((api) => {
      if (!active) return;
      kakaoRef.current = api;
      setState(api && api.maps.services ? "ready" : "fallback");
    });
    return () => {
      active = false;
    };
  }, [hasKey]);

  // Create the map once the SDK is ready and the container is mounted.
  useEffect(() => {
    const kakao = kakaoRef.current;
    if (state !== "ready" || !kakao || !mapElRef.current || mapRef.current) {
      return;
    }
    const start = value?.lat != null && value?.lng != null
      ? { lat: value.lat, lng: value.lng }
      : center ?? DEFAULT_CENTER;
    const map = new kakao.maps.Map(mapElRef.current, {
      center: new kakao.maps.LatLng(start.lat, start.lng),
      level: 4,
    });
    mapRef.current = map;
    map.relayout();
    if (value?.lat != null && value?.lng != null) {
      placeMarker(value.lat, value.lng);
    }
    kakao.maps.event.addListener(map, "click", (event) => {
      const latlng = event.latLng;
      selectFromCoord(latlng.getLat(), latlng.getLng());
    });
  }, [state, center, value, placeMarker, selectFromCoord]);

  const runSearch = useCallback(() => {
    const kakao = kakaoRef.current;
    const services = kakao?.maps.services;
    const keyword = query.trim();
    if (!kakao || !services || !keyword) return;
    const places = new services.Places();
    places.keywordSearch(keyword, (data, status) => {
      setSearched(true);
      setResults(status === services.Status.OK ? data.slice(0, 8) : []);
    });
  }, [query]);

  const selectPlace = useCallback((place: KakaoPlace) => {
    const lat = Number(place.y);
    const lng = Number(place.x);
    placeMarker(lat, lng);
    onChangeRef.current({
      name: place.place_name,
      address:
        place.road_address_name || place.address_name || place.place_name,
      lat,
      lng,
      provider: "KAKAO_KEYWORD",
    });
    setResults([]);
    setSearched(false);
  }, [placeMarker]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          aria-label="집합 장소 검색"
          className="min-h-[48px] flex-1 rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] px-3.5 text-sm text-[var(--cb-text)] outline-none transition duration-150 placeholder:text-[var(--cb-text-3)] hover:border-[var(--cb-line-2)] focus:border-[var(--cb-yellow-line)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={state !== "ready"}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              runSearch();
            }
          }}
          placeholder="장소명으로 검색 (예: 잠실역 5번 출구)"
          value={query}
        />
        <button
          aria-label="장소 검색"
          className="inline-flex min-h-[48px] items-center gap-1.5 rounded-[var(--r-md)] border border-[var(--cb-line-2)] bg-[var(--cb-surface-2)] px-3.5 text-[13px] font-semibold text-[var(--cb-text)] transition duration-150 hover:bg-[var(--cb-surface-3)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={state !== "ready"}
          onClick={runSearch}
          type="button"
        >
          <Search size={15} />
          검색
        </button>
      </div>

      {results.length > 0 ? (
        <ul className="flex flex-col gap-1 rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] p-1.5">
          {results.map((place) => (
            <li key={place.id}>
              <button
                className="flex w-full flex-col gap-0.5 rounded-[var(--r-sm)] px-2.5 py-2 text-left transition duration-150 hover:bg-[var(--cb-surface-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
                onClick={() => selectPlace(place)}
                type="button"
              >
                <span className="text-[13px] font-semibold text-[var(--cb-text)]">
                  {place.place_name}
                </span>
                <span className="text-[11.5px] text-[var(--cb-text-3)]">
                  {place.road_address_name || place.address_name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {searched && results.length === 0 ? (
        <div className="rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] px-3.5 py-3 text-[12px] text-[var(--cb-text-3)]">
          검색 결과가 없어요. 다른 장소명으로 검색해 보세요.
        </div>
      ) : null}

      {state === "fallback" ? (
        <div className="rounded-[var(--r-md)] border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] px-3.5 py-3 text-[12px] leading-[1.5] text-[var(--cb-yellow-2)]">
          {hasKey
            ? "지도를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
            : "NEXT_PUBLIC_KAKAO_MAP_APP_KEY 미설정 — 지도를 사용할 수 없어요."}
        </div>
      ) : (
        <div
          aria-label="집합 장소 지도"
          className={cn(
            "h-[200px] w-full overflow-hidden rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)]",
            state === "loading" && "animate-pulse",
          )}
          ref={mapElRef}
          role="application"
        />
      )}

      {value ? (
        <div className="flex items-start gap-2 rounded-[var(--r-md)] border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] px-3.5 py-2.5 text-[12.5px] text-[var(--cb-text)]">
          <MapPin
            className="mt-px shrink-0 text-[var(--cb-yellow)]"
            size={16}
          />
          <div className="flex flex-col">
            <span className="font-semibold">{value.name}</span>
            {value.address ? (
              <span className="text-[11.5px] text-[var(--cb-text-3)]">
                {value.address}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-[11.5px] leading-[1.55] text-[var(--cb-text-3)]">
          검색 결과를 선택하거나 지도를 눌러 집합 장소를 지정하세요.
        </p>
      )}
    </div>
  );
}
