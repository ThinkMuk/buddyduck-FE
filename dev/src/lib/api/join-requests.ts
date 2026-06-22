import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { AgeRange, Gender } from "@/lib/auth/profile";
import { http } from "@/lib/api/http";
import { mswReadyPromise } from "@/mocks/ready";

// Join-request endpoints for CB-07 Room Detail (all Bearer auth).
//   JOIN-001 POST   /api/rooms/{roomId}/join-requests                       — 입장 신청 (CB-07D)
//   JOIN-002 GET    /api/rooms/{roomId}/join-requests/me                    — 내 신청 상태 (CB-07C/D)
//   JOIN-003 GET    /api/rooms/{roomId}/join-requests                       — 방장용 목록 (CB-07A)
//   JOIN-004 POST   /api/rooms/{roomId}/join-requests/{requestId}/approve   — 승인 (CB-07A)
//   JOIN-005 POST   /api/rooms/{roomId}/join-requests/{requestId}/reject    — 거절 (CB-07A)
// No MSW mock: the reads are Bearer-gated (no-mock precedent, CB-04/06/14) and the three
// writes are state-mutating and must always hit the real backend.

type ApiEnvelope<T> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T;
};

// JOIN-003 — host-facing pending list. Fields transcribed 1:1 from the Response table.
// ageRange / gender are documented closed enums (saved at profile completion); the rest
// are non-nullable.
export type JoinRequestItem = {
  requestId: number;
  userId: number;
  nickname: string;
  ageRange: AgeRange;
  gender: Gender;
  message: string;
  matchedTags: string[];
  createdAt: string;
};

export type JoinRequestListResult = {
  items: JoinRequestItem[];
  page: number;
  size: number;
  hasNext: boolean;
};

export async function fetchJoinRequests(
  roomId: number | string,
  params: { status?: string } = {},
): Promise<JoinRequestListResult> {
  const response = await http.get<ApiEnvelope<JoinRequestListResult>>(
    `/api/rooms/${roomId}/join-requests`,
    { params },
  );
  return response.data.result;
}

// `enabled` lets the screen scope this host-only read to viewers with
// permissions.canApproveJoinRequest, mirroring the ROOM-003 permission flags.
export function useJoinRequests(
  roomId: number | string | null,
  enabled: boolean,
) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    mswReadyPromise.then(() => setReady(true));
  }, []);

  return useQuery({
    queryKey: ["join-requests", roomId],
    queryFn: () => fetchJoinRequests(roomId!),
    enabled: ready && enabled && roomId != null && roomId !== "",
  });
}

// JOIN-002 — current user's own request status/message. Returns 404 when the viewer has
// never applied, so callers gate it on having applied (PENDING/REJECTED) and treat an
// error as "no request".
export type MyJoinRequest = {
  status: string;
  message: string;
};

export async function fetchMyJoinRequest(
  roomId: number | string,
): Promise<MyJoinRequest> {
  const response = await http.get<ApiEnvelope<MyJoinRequest>>(
    `/api/rooms/${roomId}/join-requests/me`,
  );
  return response.data.result;
}

export function useMyJoinRequest(
  roomId: number | string | null,
  enabled: boolean,
) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    mswReadyPromise.then(() => setReady(true));
  }, []);

  return useQuery({
    queryKey: ["my-join-request", roomId],
    queryFn: () => fetchMyJoinRequest(roomId!),
    enabled: ready && enabled && roomId != null && roomId !== "",
    // 404 (never applied) is an expected terminal state, not a transient failure.
    retry: false,
  });
}

// JOIN-001 — apply to a room with an optional one-line message. State-mutating: always
// the real backend, never mocked. result fields are Nullable=Y per the spec.
export type ApplyToRoomBody = {
  message: string | null;
};

export type ApplyToRoomResult = {
  joinRequestId: number | null;
  status: string | null;
};

export async function applyToRoom(
  roomId: number | string,
  body: ApplyToRoomBody,
): Promise<ApplyToRoomResult> {
  const response = await http.post<ApiEnvelope<ApplyToRoomResult>>(
    `/api/rooms/${roomId}/join-requests`,
    body,
  );
  return response.data.result;
}

export function useApplyToRoomMutation(roomId: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApplyToRoomBody) => applyToRoom(roomId, body),
    onSuccess: () => {
      // Re-read the room (viewerJoinStatus flips to PENDING) and the viewer's own request.
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      queryClient.invalidateQueries({ queryKey: ["my-join-request", roomId] });
    },
  });
}

// JOIN-004 — host approves a pending request.
export type ApproveJoinRequestResult = {
  requestId: number;
  status: string;
  memberId: number;
};

export async function approveJoinRequest(
  roomId: number | string,
  requestId: number,
): Promise<ApproveJoinRequestResult> {
  const response = await http.post<ApiEnvelope<ApproveJoinRequestResult>>(
    `/api/rooms/${roomId}/join-requests/${requestId}/approve`,
    {},
  );
  return response.data.result;
}

export function useApproveJoinRequestMutation(roomId: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) => approveJoinRequest(roomId, requestId),
    onSuccess: () => {
      // Member count + pending count both change, so refresh the room and the list.
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      queryClient.invalidateQueries({ queryKey: ["join-requests", roomId] });
    },
  });
}

// JOIN-005 — host rejects a pending request.
export type RejectJoinRequestResult = {
  requestId: number;
  status: string;
};

export async function rejectJoinRequest(
  roomId: number | string,
  requestId: number,
): Promise<RejectJoinRequestResult> {
  const response = await http.post<ApiEnvelope<RejectJoinRequestResult>>(
    `/api/rooms/${roomId}/join-requests/${requestId}/reject`,
    {},
  );
  return response.data.result;
}

export function useRejectJoinRequestMutation(roomId: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) => rejectJoinRequest(roomId, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      queryClient.invalidateQueries({ queryKey: ["join-requests", roomId] });
    },
  });
}
