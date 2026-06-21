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
  params: { tags?: string[]; status?: string } = {},
): Promise<RoomListResult> {
  const response = await http.get<ApiEnvelope<RoomListResult>>(
    `/api/concerts/${concertId}/rooms`,
    {
      params: {
        ...params,
        tags: params.tags?.length ? params.tags.join(",") : undefined,
      },
    },
  );
  return response.data.result;
}

export function useRoomList(concertId: string | null, tags: string[]) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    mswReadyPromise.then(() => setReady(true));
  }, []);

  return useQuery({
    queryKey: ["rooms", concertId, tags],
    queryFn: () => fetchRoomList(concertId!, { tags }),
    enabled: ready && !!concertId,
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
