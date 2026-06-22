import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { http } from "@/lib/api/http";
import { mswReadyPromise } from "@/mocks/ready";

// ROOM-004 GET /api/me/rooms — 내 방 목록 조회 (Bearer auth).
// Item fields transcribed from the real success payload (2026-06-22 update). The example
// shows viewerRole "HOST" and viewerJoinStatus "APPROVED"; the full enum is not
// documented, so role/status/roomStatus stay typed as `string` and the sibling values
// used for client-side grouping (MEMBER / PENDING) are inferred.
export type MyRoomItem = {
  roomId: number;
  title: string;
  viewerRole: string;
  viewerJoinStatus: string;
  roomStatus: string;
  concertTitle: string;
  concertStartAt: string;
  daysUntilConcert: number;
  venueName: string;
  meetingAt: string;
  meetingPlaceName: string;
  meetingPlaceAddress: string;
  memberCount: number;
  maxMembers: number;
  pendingJoinRequestCount: number;
};

export type MyRoomListResult = {
  items: MyRoomItem[];
  page: number;
  size: number;
  hasNext: boolean;
};

type ApiEnvelope<T> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T;
};

// `tab` is the only query param (optional, enum, example "upcoming"). The full enum is
// undocumented, so it is omitted by default and the screen derives its filter chips
// client-side from viewerRole/viewerJoinStatus instead.
export async function fetchMyRooms(
  params: { tab?: string } = {},
): Promise<MyRoomListResult> {
  const response = await http.get<ApiEnvelope<MyRoomListResult>>(
    "/api/me/rooms",
    { params },
  );
  return response.data.result;
}

export function useMyRooms() {
  // See src/lib/api/concerts.ts §"MSW registration race" — gate the on-mount query
  // until the dev MSW worker has settled so the first request can't leak past it.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    mswReadyPromise.then(() => setReady(true));
  }, []);

  return useQuery({
    queryKey: ["my-rooms"],
    queryFn: () => fetchMyRooms(),
    enabled: ready,
  });
}
