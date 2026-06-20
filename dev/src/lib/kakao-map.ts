export type KakaoMapState = "idle" | "loading" | "ready" | "fallback";

export type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};
export type KakaoMapInstance = {
  setBounds: (bounds: KakaoLatLngBounds) => void;
  setCenter: (latlng: KakaoLatLng) => void;
  panTo: (latlng: KakaoLatLng) => void;
  relayout: () => void;
};
export type KakaoLatLngBounds = {
  extend: (latlng: KakaoLatLng) => void;
};
export type KakaoOverlay = {
  setMap: (map: KakaoMapInstance | null) => void;
};
export type KakaoMarker = {
  setMap: (map: KakaoMapInstance | null) => void;
  setPosition: (latlng: KakaoLatLng) => void;
};
export type KakaoMouseEvent = {
  latLng: KakaoLatLng;
};
export type KakaoPlace = {
  id: string;
  place_name: string;
  road_address_name: string;
  address_name: string;
  x: string;
  y: string;
};
export type KakaoPlacesService = {
  keywordSearch: (
    keyword: string,
    callback: (data: KakaoPlace[], status: string) => void,
  ) => void;
};
export type KakaoAddressResult = {
  address?: { address_name: string } | null;
  road_address?: { address_name: string } | null;
};
export type KakaoGeocoderService = {
  coord2Address: (
    lng: number,
    lat: number,
    callback: (data: KakaoAddressResult[], status: string) => void,
  ) => void;
};
export type KakaoMapsApi = {
  maps: {
    load: (callback: () => void) => void;
    Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMapInstance;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    LatLngBounds: new () => KakaoLatLngBounds;
    Marker: new (options: { position: KakaoLatLng; map?: KakaoMapInstance | null }) => KakaoMarker;
    CustomOverlay: new (options: {
      position: KakaoLatLng;
      content: HTMLElement | string;
      xAnchor?: number;
      yAnchor?: number;
      clickable?: boolean;
    }) => KakaoOverlay;
    Polyline: new (options: {
      map: KakaoMapInstance;
      path: KakaoLatLng[];
      strokeWeight: number;
      strokeColor: string;
      strokeOpacity: number;
      strokeStyle: string;
    }) => KakaoOverlay;
    event: {
      preventMap: () => void;
      addListener: (
        target: KakaoMapInstance | KakaoMarker,
        type: string,
        handler: (event: KakaoMouseEvent) => void,
      ) => void;
    };
    services?: {
      Places: new () => KakaoPlacesService;
      Geocoder: new () => KakaoGeocoderService;
      Status: { OK: string; ZERO_RESULT: string; ERROR: string };
    };
  };
};

declare global {
  interface Window {
    kakao?: KakaoMapsApi;
  }
}

let kakaoLoaderPromise: Promise<KakaoMapsApi | null> | null = null;
let kakaoPlacesLoaderPromise: Promise<KakaoMapsApi | null> | null = null;

export function getKakaoMapKey() {
  return process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
}

// The Kakao Maps JS key actually present in dev/.env is NEXT_PUBLIC_KAKAO_MAP_APP_KEY.
// Read it (falling back to the legacy name) for the place picker, which needs a working key.
export function getKakaoMapAppKey() {
  return (
    process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY ??
    process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
  );
}

export function loadKakaoMaps(): Promise<KakaoMapsApi | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const key = getKakaoMapKey();
  if (!key) return Promise.resolve(null);
  if (window.kakao?.maps?.load) {
    return new Promise((resolve) => {
      window.kakao?.maps.load(() => resolve(window.kakao ?? null));
    });
  }
  if (kakaoLoaderPromise) return kakaoLoaderPromise;

  kakaoLoaderPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (!window.kakao?.maps?.load) {
        resolve(null);
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao ?? null));
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return kakaoLoaderPromise;
}

export async function loadKakaoMap(): Promise<KakaoMapState> {
  const kakao = await loadKakaoMaps();
  return kakao ? "ready" : "fallback";
}

// Loads the SDK with the `services` library (keyword search + reverse geocoding) using
// the app key, for the CB-05 meeting-place picker. Separate from loadKakaoMaps() so the
// route map (RouteMapCanvas) keeps its existing key resolution untouched.
export function loadKakaoPlaces(): Promise<KakaoMapsApi | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const key = getKakaoMapAppKey();
  if (!key) return Promise.resolve(null);
  if (window.kakao?.maps?.load) {
    return new Promise((resolve) => {
      window.kakao?.maps.load(() => resolve(window.kakao ?? null));
    });
  }
  if (kakaoPlacesLoaderPromise) return kakaoPlacesLoaderPromise;

  kakaoPlacesLoaderPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => {
      if (!window.kakao?.maps?.load) {
        resolve(null);
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao ?? null));
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return kakaoPlacesLoaderPromise;
}
