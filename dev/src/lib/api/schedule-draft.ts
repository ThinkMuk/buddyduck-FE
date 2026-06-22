import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { http } from "@/lib/api/http";

// CB-11 Timetable Edit / CB-11′ Over-Time Warning draft endpoints.
//
// - SCHEDULE-002 POST /api/schedules/{scheduleId}/draft/recalculate — preview 재계산. DB 저장 X.
// - SCHEDULE-004 POST /api/schedules/{scheduleId}/draft/recommend    — 추천 순서 preview. DB 저장 X.
// - SCHEDULE-003 PUT  /api/schedules/{scheduleId}/draft/commit       — 수정 완료 시 최종 저장.
//
// All Bearer-auth. The bootstrap read (SCHEDULE-001) lives in `src/lib/api/timeline.ts`;
// this module owns the three draft mutations. Types are transcribed field-for-field from
// each Notion page's Request Body + Response tables, including nullability.

export type DraftRouteMode = "WALK" | "CAR_TAXI";
export type DraftFitStatus = "OK" | "OVERRUN";

// ── Request bodies (SCHEDULE-002/003/004 Request Body tables) ──────────────────────────
// `clientId` / `order` / `title` / `dwellMinutes` are the required slot fields per spec.
export type DraftSlotInput = {
  clientId: string;
  slotId?: number | null;
  order: number;
  title: string;
  placeId?: number | null;
  dwellMinutes: number;
  locked?: boolean;
  // Required by the SCHEDULE-002/003/004 Request Body Example on every slot; the server
  // uses slotType (MEETING / PLACE / PERFORMANCE) for anchor handling.
  slotType?: string;
  category?: string;
};

export type DraftRouteSegmentInput = {
  fromClientId: string;
  toClientId: string;
  mode: string;
  durationMinutes: number;
  distanceMeters?: number | null;
  manuallyAdjusted?: boolean;
};

// Shared body for recalculate + commit. `customStartAt`/`targetArrivalAt` are optional &
// nullable (server falls back to the stored schedule value / 방 meetingAt / 공연 시작 −
// arrivalBufferMinutes when omitted).
export type DraftRequestBody = {
  arrivalBufferMinutes: number;
  customStartAt?: string | null;
  targetArrivalAt?: string | null;
  slots: DraftSlotInput[];
  routeSegments: DraftRouteSegmentInput[];
};

// SCHEDULE-004 omits routeSegments and adds the required recommendationMode.
export type RecommendRequestBody = Omit<DraftRequestBody, "routeSegments"> & {
  recommendationMode: DraftRouteMode;
};

// ── Preview response (SCHEDULE-002 & SCHEDULE-004 share this shape) ─────────────────────
export type DraftPreviewSlot = {
  clientId: string;
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

export type DraftPreviewRouteSegment = {
  fromClientId: string;
  toClientId: string;
  mode: string;
  distanceMeters: number | null;
  durationMinutes: number;
  provider: string | null;
  manuallyAdjusted: boolean;
};

export type DraftPreviewResult = {
  fitStatus: DraftFitStatus;
  recommendedStartAt: string | null;
  effectiveStartAt: string | null;
  targetArrivalAt: string | null;
  overrunMinutes: number | null;
  spareMinutes: number | null;
  slots: DraftPreviewSlot[];
  routeSegments: DraftPreviewRouteSegment[];
  warnings: string[];
};

// ── Commit response (SCHEDULE-003) ─────────────────────────────────────────────────────
// The page documents `slots`/`routeSegments` only as `array` (Example shows empty arrays),
// so their element shape is inferred from the sibling preview endpoints (same precedent as
// SCHEDULE-001 in timeline.ts). FE only needs success + room/schedule to navigate on save.
export type DraftCommitResult = {
  room: { id: number; title: string };
  schedule: { id: number };
  slots: DraftPreviewSlot[];
  routeSegments: DraftPreviewRouteSegment[];
  warnings: string[];
};

type ApiEnvelope<T> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T | null;
};

// SCHEDULE-003 returns 409 SCHEDULE01 with result.overrunMinutes when the committed draft
// can't fit the target arrival — this drives the CB-11′ over-time warning. The global http
// interceptor passes non-401 errors through, so we translate it into a typed error here.
export class ScheduleOverrunError extends Error {
  readonly overrunMinutes: number;

  constructor(overrunMinutes: number) {
    super("지금 일정을 전부 소화할 수 없습니다.");
    this.name = "ScheduleOverrunError";
    this.overrunMinutes = overrunMinutes;
  }
}

function normalizePreview(result: DraftPreviewResult | null): DraftPreviewResult {
  return {
    fitStatus: result?.fitStatus ?? "OK",
    recommendedStartAt: result?.recommendedStartAt ?? null,
    effectiveStartAt: result?.effectiveStartAt ?? null,
    targetArrivalAt: result?.targetArrivalAt ?? null,
    overrunMinutes: result?.overrunMinutes ?? null,
    spareMinutes: result?.spareMinutes ?? null,
    slots: result?.slots ?? [],
    routeSegments: result?.routeSegments ?? [],
    warnings: result?.warnings ?? [],
  };
}

export async function recalculateDraft(
  scheduleId: number,
  body: DraftRequestBody,
): Promise<DraftPreviewResult> {
  const response = await http.post<ApiEnvelope<DraftPreviewResult>>(
    `/api/schedules/${scheduleId}/draft/recalculate`,
    body,
  );
  return normalizePreview(response.data.result);
}

export async function recommendDraft(
  scheduleId: number,
  body: RecommendRequestBody,
): Promise<DraftPreviewResult> {
  const response = await http.post<ApiEnvelope<DraftPreviewResult>>(
    `/api/schedules/${scheduleId}/draft/recommend`,
    body,
  );
  return normalizePreview(response.data.result);
}

export async function commitDraft(
  scheduleId: number,
  body: DraftRequestBody,
): Promise<DraftCommitResult> {
  try {
    const response = await http.put<ApiEnvelope<DraftCommitResult>>(
      `/api/schedules/${scheduleId}/draft/commit`,
      body,
    );
    const result = response.data.result;
    return {
      room: result?.room ?? { id: 0, title: "" },
      schedule: result?.schedule ?? { id: scheduleId },
      slots: result?.slots ?? [],
      routeSegments: result?.routeSegments ?? [],
      warnings: result?.warnings ?? [],
    };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 409) {
      const data = error.response.data as
        | { code?: string; result?: { overrunMinutes?: number } }
        | undefined;
      if (data?.code === "SCHEDULE01") {
        throw new ScheduleOverrunError(data.result?.overrunMinutes ?? 0);
      }
    }
    throw error;
  }
}

export function useRecalculateDraft(scheduleId: number | null) {
  return useMutation({
    mutationFn: (body: DraftRequestBody) =>
      recalculateDraft(scheduleId as number, body),
  });
}

export function useRecommendDraft(scheduleId: number | null) {
  return useMutation({
    mutationFn: (body: RecommendRequestBody) =>
      recommendDraft(scheduleId as number, body),
  });
}

export function useCommitDraft(scheduleId: number | null) {
  return useMutation({
    mutationFn: (body: DraftRequestBody) =>
      commitDraft(scheduleId as number, body),
  });
}
