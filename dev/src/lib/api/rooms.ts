import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { AgeRange, Gender } from "@/lib/auth/profile";
import { http } from "@/lib/api/http";
import { mswReadyPromise } from "@/mocks/ready";

export const ROOM_TAGS = [
  "GOODS_BUYING",
  "CAFE_VISIT",
  "MEAL_TOGETHER",
  "PHOTO_SPOT",
  "PHOTOCARD_TRADE",
  "ACCOMMODATION_SHARE",
  "ENTRY_WAITING",
] as const;
export type RoomTag = (typeof ROOM_TAGS)[number];

export const ROOM_TAG_LABELS: Record<RoomTag, string> = {
  GOODS_BUYING: "굿즈 구매",
  CAFE_VISIT: "카페 투어",
  MEAL_TOGETHER: "식사 같이",
  PHOTO_SPOT: "포토 스팟",
  PHOTOCARD_TRADE: "포카 교환",
  ACCOMMODATION_SHARE: "숙소 공유",
  ENTRY_WAITING: "입장 대기",
};

export function getRoomTagLabel(tag: string): string {
  return ROOM_TAG_LABELS[tag as RoomTag] ?? tag;
}

export type RoomListItem = {
  id: number;
  title: string;
  hostNickname: string;
  status: string;
  isFull: boolean;
  memberCount: number;
  maxMembers: number;
  meetingAt: string;
  meetingPlaceName: string;
  roomTags: string[];
  matchCount: number;
};

type ApiEnvelope<T> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T;
};

export type RoomListResult = {
  items: RoomListItem[];
  page: number;
  size: number;
  hasNext: boolean;
};

export async function fetchRoomList(
  concertId: string,
  params: { status?: string } = {},
): Promise<RoomListResult> {
  // NOTE: `tags`를 쿼리 파라미터로 보내지 않는다. 백엔드는 `tags`를 "이 태그를 가진 방만"
  // 으로 거르는 필터로 처리하기 때문에, 내 관심태그와 안 겹치는 공개 방(예: 방금 만든 방)이
  // 목록에서 사라진다. CB-04는 이 공연의 모든 공개 방을 보여주는 화면이므로 필터를 걸지 않는다.
  // `matchCount`(정렬용)는 서버가 저장된 내 관심태그 기준으로 계산해 주므로 파라미터 없이도 정확하다.
  const response = await http.get<ApiEnvelope<RoomListResult>>(
    `/api/concerts/${concertId}/rooms`,
    { params },
  );
  return response.data.result;
}

export function useRoomList(concertId: string | null) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    mswReadyPromise.then(() => setReady(true));
  }, []);

  return useQuery({
    queryKey: ["rooms", concertId],
    queryFn: () => fetchRoomList(concertId!),
    enabled: ready && !!concertId,
    // CB-04 목록은 항상 최신 서버 상태를 반영해야 한다(방 생성/마감/멤버 변동이 잦음).
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });
}

// ROOM-002 POST /api/rooms — 방 생성 (Bearer auth)
// Mirrors BE RoomPlaceRequest: name/address/lat/lng/provider are all required.
export type RoomPlaceProvider =
  | "CONCERT"
  | "KAKAO_KEYWORD"
  | "KAKAO_ADDRESS"
  | "MANUAL";

export type RoomPlace = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  provider: RoomPlaceProvider;
  providerPlaceId?: string;
};

export type CreateRoomBody = {
  concertId: number;
  title: string;
  description: string | null;
  maxMembers: number;
  roomTags: RoomTag[];
  meetingAt: string;
  meetingPlace: RoomPlace;
  eventPlace: RoomPlace;
  openChatUrl: string;
  openChatPassword: string | null;
};

export type CreateRoomResult = {
  roomId: number | null;
  scheduleId: number | null;
};

export async function createRoom(
  body: CreateRoomBody,
): Promise<CreateRoomResult> {
  const response = await http.post<ApiEnvelope<CreateRoomResult>>(
    "/api/rooms",
    body,
  );
  return response.data.result;
}

export function useCreateRoomMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRoom,
    // refetchType: "all" so the room-list query refetches even while it is inactive
    // (the list is unmounted during creation); otherwise the default "active" only
    // marks it stale and App Router's back-navigation reuses the cached tree without
    // remounting, leaving the new room invisible until a hard reload.
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["rooms"],
        refetchType: "all",
      }),
  });
}

// ROOM-003 GET /api/rooms/{roomId} — CB-07A/B/C/D Room Detail 통합 조회 (Bearer auth).
// Fields transcribed 1:1 from the Notion Response table, including nullability.
// roomStatus / viewerRole / viewerJoinStatus are declared as open enums ("... 등") in the
// spec, so they stay typed as `string` (same precedent as ROOM-004 in my-rooms.ts); the
// screen compares against the documented values. ageRange / gender / member role /
// slotType are closed enums and use their union types.
export type RoomPermissions = {
  canRequestJoin: boolean;
  canApproveJoinRequest: boolean;
  canViewOpenChat: boolean;
  canOpenTimeline: boolean;
  canEditRoom: boolean;
};

export type RoomDetailConcert = {
  id: number;
  title: string;
  startAt: string;
  venueName: string;
};

export type RoomMemberRole = "HOST" | "MEMBER";

export type RoomMember = {
  userId: number;
  nickname: string;
  ageRange: AgeRange;
  gender: Gender;
  role: RoomMemberRole;
  sharedInterestCount: number;
};

export type SchedulePreviewSlotType = "MEETING" | "PLACE" | "CONCERT";

export type SchedulePreviewSlot = {
  slotId: number;
  order: number;
  title: string;
  placeId: number | null;
  placeName: string | null;
  slotType: SchedulePreviewSlotType;
  category: SchedulePreviewSlotType;
  startAt: string;
  endAt: string;
  dwellMinutes: number;
  locked: boolean;
};

export type RoomDetail = {
  id: number;
  title: string;
  description: string | null;
  roomStatus: string;
  viewerRole: string;
  viewerJoinStatus: string;
  permissions: RoomPermissions;
  pendingRequestCount: number;
  concert: RoomDetailConcert;
  meetingAt: string;
  meetingPlaceName: string;
  meetingPlaceAddress: string;
  roomTags: RoomTag[];
  memberCount: number;
  maxMembers: number;
  members: RoomMember[];
  schedulePreview: SchedulePreviewSlot[];
};

export async function fetchRoomDetail(
  roomId: number | string,
): Promise<RoomDetail> {
  const response = await http.get<ApiEnvelope<RoomDetail>>(
    `/api/rooms/${roomId}`,
  );
  return response.data.result;
}

export function useRoomDetail(roomId: number | string | null) {
  // See src/lib/api/concerts.ts §"MSW registration race" — gate the on-mount query
  // until the dev MSW worker has settled so the first request can't leak past it.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    mswReadyPromise.then(() => setReady(true));
  }, []);

  return useQuery({
    queryKey: ["room", roomId],
    queryFn: () => fetchRoomDetail(roomId!),
    enabled: ready && roomId != null && roomId !== "",
  });
}

// OPENCHAT-001 GET /api/rooms/{roomId}/open-chat — CB-08 오픈채팅 정보 조회 (Bearer auth).
// Per the spec's 협업 참고 the open-chat URL/password is intentionally NOT embedded in
// ROOM-003's room detail response — it is fetched separately, only when the CB-07 → CB-08
// 오픈채팅 모달 is opened by a viewer the backend allows (permissions.canViewOpenChat).
// Fields transcribed 1:1 from the Response table: openChatUrl is non-null, openChatPassword
// is nullable (방에 비밀번호가 없으면 null). 403 COMMON403 / 404 COMMON404 are expected for
// a viewer who isn't an approved member/host, so the query does not retry.
export type OpenChatInfo = {
  openChatUrl: string;
  openChatPassword: string | null;
};

export async function fetchOpenChat(
  roomId: number | string,
): Promise<OpenChatInfo> {
  const response = await http.get<ApiEnvelope<OpenChatInfo>>(
    `/api/rooms/${roomId}/open-chat`,
  );
  return response.data.result;
}

export function useOpenChat(roomId: number | string | null, enabled: boolean) {
  // Same MSW registration-race gate as the other on-mount room reads.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    mswReadyPromise.then(() => setReady(true));
  }, []);

  return useQuery({
    queryKey: ["open-chat", roomId],
    queryFn: () => fetchOpenChat(roomId!),
    enabled: ready && enabled && roomId != null && roomId !== "",
    retry: false,
  });
}
