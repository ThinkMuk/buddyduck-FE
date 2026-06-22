"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppBar, Button } from "@/components/ui";
import {
  pendingPlaceStorageKey,
  type PendingTimetablePlace,
} from "@/lib/api/places";
import {
  useTimeline,
  type TimelineRouteSegment,
  type TimelineSlot,
} from "@/lib/api/timeline";
import {
  ScheduleOverrunError,
  useCommitDraft,
  useRecalculateDraft,
  useRecommendDraft,
  type DraftPreviewResult,
  type DraftPreviewRouteSegment,
  type DraftPreviewSlot,
  type DraftRequestBody,
  type DraftRouteMode,
  type RecommendRequestBody,
} from "@/lib/api/schedule-draft";
import { cn } from "@/lib/utils";
import { BackButton } from "../../_components/buddy-patterns";
import { DraftStopBlock } from "./draft-stop-block";

// CB-11 Timetable Edit / CB-11′ Over-Time Warning.
//
// This screen is fully backend-driven (Bearer-gated, no MSW mock):
//   1. Bootstrap the editable draft from SCHEDULE-001 (GET /api/rooms/{roomId}/timeline)
//      via the ?roomId= query — that read also supplies the scheduleId + arrival buffer.
//   2. Every edit (dwell/route minutes, mode, reorder, delete) posts the current draft to
//      SCHEDULE-002 recalculate, and the server-computed slots/routeSegments/fit info are
//      reflected back into the screen (FE never recomputes times).
//   3. "추천 순서" calls SCHEDULE-004 recommend (preview only).
//   4. "수정 완료" commits via SCHEDULE-003; a 409 SCHEDULE01 over-time block surfaces the
//      CB-11′ warning with the real overrunMinutes.
// 장소 추가 links to CB-10 (/places?roomId=) which upserts via PLACE-003 and returns with
// ?addPlaceId=&addPlaceName=; the in-progress draft is persisted to sessionStorage across
// the round trip, then restored + the new PLACE slot inserted and recalculated here.

type DraftState = {
  slots: DraftPreviewSlot[];
  routeSegments: DraftPreviewRouteSegment[];
};

type PreviewMeta = Pick<
  DraftPreviewResult,
  | "fitStatus"
  | "recommendedStartAt"
  | "effectiveStartAt"
  | "targetArrivalAt"
  | "overrunMinutes"
  | "spareMinutes"
  | "warnings"
>;

const DWELL_STEP = 10;
const LOCKED_DWELL_STEP = 5;
const MIN_DWELL = 10;
const ROUTE_STEP = 5;
const MIN_ROUTE = 0;

// Seeds the editable draft from the SCHEDULE-001 read. That read uses persisted `slotId`s
// and slotId-based routeSegments (and its `slots[].clientId` can be empty/missing), whereas
// the SCHEDULE-002/003 draft contract keys everything by a non-empty `clientId`. So derive a
// guaranteed-unique clientId per slot (keeping a valid incoming one so links stay stable) and
// remap the slotId-based segments onto those clientIds.
function buildDraftFromTimeline(
  slots: TimelineSlot[],
  segments: TimelineRouteSegment[],
): DraftState {
  const draftSlots: DraftPreviewSlot[] = slots.map((slot, index) => ({
    clientId:
      slot.clientId && slot.clientId.length > 0
        ? slot.clientId
        : `slot-auto-${slot.slotId ?? index}`,
    slotId: slot.slotId,
    order: slot.order,
    title: slot.title,
    placeId: slot.placeId,
    dwellMinutes: slot.dwellMinutes,
    startAt: slot.startAt,
    endAt: slot.endAt,
    locked: slot.locked,
    slotType: slot.slotType,
    category: slot.category,
  }));

  const clientIdBySlotId = new Map<number, string>();
  slots.forEach((slot, index) => {
    if (slot.slotId != null) {
      clientIdBySlotId.set(slot.slotId, draftSlots[index].clientId);
    }
  });

  const routeSegments: DraftPreviewRouteSegment[] = segments
    .map((segment) => ({
      fromClientId: clientIdBySlotId.get(segment.fromSlotId) ?? "",
      toClientId: clientIdBySlotId.get(segment.toSlotId) ?? "",
      mode: segment.mode,
      distanceMeters: segment.distanceMeters,
      durationMinutes: segment.durationMinutes,
      provider: segment.provider,
      manuallyAdjusted: segment.manuallyAdjusted,
    }))
    .filter((segment) => segment.fromClientId && segment.toClientId);

  return { slots: draftSlots, routeSegments };
}

// Rebuilds the draft from a SCHEDULE-002/004 preview response, which is already clientId-based
// (the FE sent the clientIds and the server echoes them). Normalizes any empty clientId
// defensively and copies the segments through unchanged.
function buildDraft(
  slots: DraftPreviewSlot[],
  segments: DraftPreviewRouteSegment[],
): DraftState {
  return {
    slots: slots.map((slot, index) => ({
      ...slot,
      clientId:
        slot.clientId && slot.clientId.length > 0
          ? slot.clientId
          : `slot-auto-${index}`,
    })),
    routeSegments: segments.map((segment) => ({ ...segment })),
  };
}

// ── CB-10 → CB-11 장소 추가 handoff ──────────────────────────────────────────────────────
// CB-10 (/places) upserts a place via PLACE-003 and returns here with
// ?addPlaceId=&addPlaceName=. The draft lives in this screen's local state (not persisted
// to the server until commit), so the in-progress draft is saved to sessionStorage before
// navigating out, then restored and the new PLACE slot inserted on return — so unsaved
// edits (and earlier added-but-uncommitted places) aren't lost across the round trip.
type PersistedDraft = { draft: DraftState; arrivalBufferMinutes: number };

const draftStorageKey = (scheduleId: number) => `cb11:draft:${scheduleId}`;

function persistDraft(
  scheduleId: number,
  draft: DraftState,
  arrivalBufferMinutes: number,
) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      draftStorageKey(scheduleId),
      JSON.stringify({ draft, arrivalBufferMinutes } satisfies PersistedDraft),
    );
  } catch {
    // sessionStorage unavailable (private mode / quota) — return path falls back to server.
  }
}

function readPersistedDraft(scheduleId: number): PersistedDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(draftStorageKey(scheduleId));
    return raw ? (JSON.parse(raw) as PersistedDraft) : null;
  } catch {
    return null;
  }
}

function clearPersistedDraft(scheduleId: number) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(draftStorageKey(scheduleId));
  } catch {
    // ignore
  }
}

// The place CB-10 handed off (keyed by roomId). Read + cleared once on bootstrap.
function readPendingPlace(roomId: number): PendingTimetablePlace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(pendingPlaceStorageKey(roomId));
    return raw ? (JSON.parse(raw) as PendingTimetablePlace) : null;
  } catch {
    return null;
  }
}

function clearPendingPlace(roomId: number) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(pendingPlaceStorageKey(roomId));
  } catch {
    // ignore
  }
}

// Insert a new PLACE slot (placeId from PLACE-003) before a trailing locked anchor (the
// 공연 slot), or at the end otherwise. routeSegments are cleared so buildRequestBody
// synthesizes a fresh WALK shell per gap and SCHEDULE-002 recomputes the real routes.
function insertPlaceSlot(
  draft: DraftState,
  placeId: number,
  name: string,
): DraftState {
  const newSlot: DraftPreviewSlot = {
    clientId: `slot-new-${Date.now()}`,
    slotId: null,
    order: 0,
    title: name,
    placeId,
    dwellMinutes: 60,
    startAt: null,
    endAt: null,
    locked: false,
    slotType: "PLACE",
    category: null,
  };
  const slots = draft.slots;
  const trailingLocked = slots.length > 0 && slots[slots.length - 1].locked;
  const insertIndex = trailingLocked ? slots.length - 1 : slots.length;
  return {
    slots: [...slots.slice(0, insertIndex), newSlot, ...slots.slice(insertIndex)],
    routeSegments: [],
  };
}

// Reconcile a recalc/recommend RESPONSE against the draft we just sent. The server returns
// saved slots with an EMPTY clientId but its routeSegments reference the clientIds the FE
// SENT — so re-deriving slot clientIds by index (buildDraft) desyncs them from the segments
// whenever the slot order/count changed (e.g. after 장소 추가), making route blocks vanish.
// Instead, match each response slot back to the sent draft (by persisted slotId → echoed
// clientId → placeId → position) and KEEP its clientId, so slot ids stay equal to what the
// segments reference. slotType/category (also omitted by the response) are carried over too.
function reconcilePreviewDraft(
  prev: DraftState,
  result: DraftPreviewResult,
): DraftState {
  const bySlotId = new Map<number, DraftPreviewSlot>();
  const byClientId = new Map<string, DraftPreviewSlot>();
  const byPlaceId = new Map<number, DraftPreviewSlot>();
  for (const slot of prev.slots) {
    if (slot.slotId != null) bySlotId.set(slot.slotId, slot);
    if (slot.clientId) byClientId.set(slot.clientId, slot);
    if (slot.placeId != null && !byPlaceId.has(slot.placeId)) {
      byPlaceId.set(slot.placeId, slot);
    }
  }

  const slots = result.slots.map((slot, index) => {
    const match =
      (slot.slotId != null ? bySlotId.get(slot.slotId) : undefined) ??
      (slot.clientId ? byClientId.get(slot.clientId) : undefined) ??
      (slot.placeId != null ? byPlaceId.get(slot.placeId) : undefined) ??
      prev.slots[index];
    return {
      ...slot,
      clientId:
        slot.clientId && slot.clientId.length > 0
          ? slot.clientId
          : (match?.clientId ?? `slot-auto-${index}`),
      slotType: slot.slotType ?? match?.slotType ?? null,
      category: slot.category ?? match?.category ?? null,
    };
  });

  // Segments reference the sent clientIds, which now equal the reconciled slot clientIds,
  // so they keep linking — no remap needed.
  return {
    slots,
    routeSegments: result.routeSegments.map((segment) => ({ ...segment })),
  };
}

// BE-confirmed enums. slotType: MEETING / PLACE / CONCERT. category: the interest-tag set
// plus MEETING / CONCERT / ETC. A slot's category is NOT its slotType — sending "PLACE" as a
// category (the old fallback) is rejected, so PLACE slots without a real category fall back
// to ETC.
const SLOT_TYPES = new Set(["MEETING", "PLACE", "CONCERT"]);
const CATEGORIES = new Set([
  "MEETING",
  "GOODS_BUYING",
  "CAFE_VISIT",
  "MEAL_TOGETHER",
  "PHOTO_SPOT",
  "PHOTOCARD_TRADE",
  "CONCERT",
  "ENTRY_WAITING",
  "ETC",
]);

// SCHEDULE-002/003/004 require slotType on every request slot. SCHEDULE-001 responses carry
// it, but the recalc/recommend RESPONSES omit slotType/category — so we preserve them across
// previews (see applyPreviewResult) and only fall back here from `locked` + position when a
// value is genuinely absent: first slot = MEETING (집합), last = CONCERT (공연), middle =
// PLACE. Anything outside the BE enum is coerced to a valid value.
function resolveSlotType(
  slot: DraftPreviewSlot,
  index: number,
  total: number,
): string {
  if (slot.slotType && SLOT_TYPES.has(slot.slotType)) return slot.slotType;
  if (index === 0) return "MEETING";
  if (index === total - 1) return "CONCERT";
  return "PLACE";
}

// category is a distinct enum from slotType. Keep a valid server-provided value; otherwise
// derive a VALID category from the slotType (MEETING/CONCERT map 1:1; PLACE → ETC, since
// "PLACE" is not a category).
function resolveCategory(slot: DraftPreviewSlot, slotType: string): string {
  if (slot.category && CATEGORIES.has(slot.category)) return slot.category;
  if (slotType === "MEETING") return "MEETING";
  if (slotType === "CONCERT") return "CONCERT";
  return "ETC";
}

function buildRequestBody(
  draft: DraftState,
  arrivalBufferMinutes: number,
): DraftRequestBody {
  const total = draft.slots.length;
  const slots = draft.slots.map((slot, index) => {
    const slotType = resolveSlotType(slot, index, total);
    return {
      clientId: slot.clientId,
      slotId: slot.slotId,
      order: index + 1,
      title: slot.title,
      placeId: slot.placeId,
      dwellMinutes: slot.dwellMinutes,
      locked: slot.locked,
      slotType,
      // category is a separate enum (never the slotType); PLACE without one → ETC.
      category: resolveCategory(slot, slotType),
    };
  });

  // The contract requires the current-order segments (one per gap): SCHEDULE-002 rejects an
  // empty routeSegments for a multi-slot draft with COMMON400. When the seed had none
  // (집합→공연 with no places yet), synthesize a WALK shell per gap matching the spec's
  // Request Body Example shape (fromClientId/toClientId/mode/durationMinutes/manuallyAdjusted,
  // NO distanceMeters) with manuallyAdjusted=false so the server computes the real route.
  let routeSegments: DraftRequestBody["routeSegments"] = draft.routeSegments.map(
    (segment) => ({
      fromClientId: segment.fromClientId,
      toClientId: segment.toClientId,
      mode: segment.mode,
      durationMinutes: segment.durationMinutes,
      distanceMeters: segment.distanceMeters,
      manuallyAdjusted: segment.manuallyAdjusted,
    }),
  );
  if (routeSegments.length === 0 && slots.length >= 2) {
    routeSegments = slots.slice(0, -1).map((slot, index) => ({
      fromClientId: slot.clientId,
      toClientId: slots[index + 1].clientId,
      mode: "WALK",
      durationMinutes: 0,
      manuallyAdjusted: false,
    }));
  }

  return { arrivalBufferMinutes, slots, routeSegments };
}

function previewMetaFrom(result: DraftPreviewResult): PreviewMeta {
  return {
    fitStatus: result.fitStatus,
    recommendedStartAt: result.recommendedStartAt,
    effectiveStartAt: result.effectiveStartAt,
    targetArrivalAt: result.targetArrivalAt,
    overrunMinutes: result.overrunMinutes,
    spareMinutes: result.spareMinutes,
    warnings: result.warnings,
  };
}

function formatClock(iso: string | null) {
  if (!iso || iso.length < 16) return null;
  return iso.slice(11, 16);
}

function formatHeaderDate(iso: string | null) {
  if (!iso || iso.length < 10) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const y = iso.slice(0, 4);
  const m = iso.slice(5, 7);
  const d = iso.slice(8, 10);
  return `${y}.${m}.${d} (${days[date.getDay()]})`;
}

export function TimetableEditScreen({
  roomId,
  showWarning = false,
}: {
  roomId: number | null;
  showWarning?: boolean;
}) {
  const router = useRouter();
  const { data, isLoading, isError } = useTimeline(roomId);

  const scheduleId = data?.schedule?.id ?? null;
  const recalc = useRecalculateDraft(scheduleId);
  const recommend = useRecommendDraft(scheduleId);
  const commit = useCommitDraft(scheduleId);

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [arrivalBufferMinutes, setArrivalBufferMinutes] = useState(30);
  const [preview, setPreview] = useState<PreviewMeta | null>(null);
  const [commitOverrun, setCommitOverrun] = useState<number | null>(null);
  const [commitError, setCommitError] = useState(false);
  // True while a STRUCTURAL recalc is in flight — adding a place, changing a route mode
  // (도보↔택시), 추천 순서, or reordering slots. Those reroute the schedule, so we block the
  // editor behind a loading overlay. Quick time tweaks (dwell/route minute steppers) recalc
  // in the background without blocking.
  const [isBlockingRecalc, setIsBlockingRecalc] = useState(false);
  const [dragState, setDragState] = useState<{
    sourceId: string;
    targetId: string | null;
    placement: "before" | "after";
  } | null>(null);

  const initialDraftRef = useRef<DraftState | null>(null);
  const bootstrappedRef = useRef<number | null>(null);
  const recalcSeqRef = useRef(0);
  const pendingConsumedRef = useRef(false);

  // Bootstrap the draft once per scheduleId from the SCHEDULE-001 read. Restores an
  // in-progress draft persisted before a /places round trip (so unsaved edits survive);
  // otherwise seeds from the server schedule. The handed-off place is applied separately
  // (see the pending-place effect below) so it works regardless of mount/refetch timing.
  useEffect(() => {
    if (!data?.schedule) return;
    const sid = data.schedule.id;
    if (bootstrappedRef.current === sid) return;
    bootstrappedRef.current = sid;

    const serverDraft = buildDraftFromTimeline(data.slots, data.routeSegments);
    initialDraftRef.current = serverDraft;

    const persisted = readPersistedDraft(sid);
    // persisted.draft is already a normalized DraftState (built before the /places round
    // trip), so use it as-is; only the SCHEDULE-001 read needs buildDraft's slotId→clientId
    // remap.
    const seedDraft = persisted?.draft ?? serverDraft;
    const seedBuffer =
      persisted?.arrivalBufferMinutes ?? data.schedule.arrivalBufferMinutes;
    clearPersistedDraft(sid);

    setArrivalBufferMinutes(seedBuffer);
    setDraft(seedDraft);
    setPreview({
      fitStatus: "OK",
      recommendedStartAt: null,
      effectiveStartAt: data.slots[0]?.startAt ?? null,
      targetArrivalAt: null,
      overrunMinutes: null,
      spareMinutes: null,
      warnings: data.warnings,
    });
  }, [data]);

  // Consume a place CB-10 handed off via sessionStorage (cb11:pendingPlace:{roomId}). Kept
  // separate from the bootstrap-once guard so it fires as soon as the draft is ready on
  // return, regardless of remount/refetch timing. Inserts the slot optimistically (so it
  // shows immediately, not gated on the network) and then reconciles times via SCHEDULE-002.
  useEffect(() => {
    if (pendingConsumedRef.current) return;
    if (roomId == null || scheduleId == null || !draft) return;
    const pending = readPendingPlace(roomId);
    if (!pending) return;

    pendingConsumedRef.current = true;
    clearPendingPlace(roomId);
    const withNewPlace = insertPlaceSlot(draft, pending.placeId, pending.name);
    // One-shot optimistic insert of the handed-off place (guarded by pendingConsumedRef);
    // times are reconciled just below via SCHEDULE-002 recalculate.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(withNewPlace);

    const seq = ++recalcSeqRef.current;
    setIsBlockingRecalc(true);
    recalc.mutate(buildRequestBody(withNewPlace, arrivalBufferMinutes), {
      onSuccess: (result) => {
        if (seq !== recalcSeqRef.current) return;
        setDraft(reconcilePreviewDraft(withNewPlace, result));
        setPreview(previewMetaFrom(result));
      },
      // On error, the optimistic withNewPlace stays shown (times just aren't recomputed).
      onSettled: () => setIsBlockingRecalc(false),
    });
  }, [draft, roomId, scheduleId, recalc, arrivalBufferMinutes]);

  const applyPreviewResult = (result: DraftPreviewResult) => {
    // SCHEDULE-002/004 responses omit slotType/category AND return saved slots with empty
    // clientId; reconcile against the sent draft so clientId (segment linkage) + slotType
    // survive — re-deriving them by index breaks route-segment rendering after a reorder/add.
    setDraft((prev) =>
      prev
        ? reconcilePreviewDraft(prev, result)
        : buildDraft(result.slots, result.routeSegments),
    );
    setPreview(previewMetaFrom(result));
  };

  // Optimistically apply an edit, then reconcile against SCHEDULE-002 (latest wins). Set
  // `blocking` for structural changes (mode toggle / reorder) so the loading overlay shows.
  const runRecalc = (
    next: DraftState,
    nextBuffer = arrivalBufferMinutes,
    { blocking = false }: { blocking?: boolean } = {},
  ) => {
    setDraft(next);
    setArrivalBufferMinutes(nextBuffer);
    if (scheduleId == null) return;

    if (blocking) setIsBlockingRecalc(true);
    const seq = ++recalcSeqRef.current;
    recalc.mutate(buildRequestBody(next, nextBuffer), {
      onSuccess: (result) => {
        if (seq !== recalcSeqRef.current) return;
        applyPreviewResult(result);
      },
      onSettled: blocking ? () => setIsBlockingRecalc(false) : undefined,
    });
  };

  const updateSlotDwell = (clientId: string, direction: 1 | -1) => {
    if (!draft) return;
    const nextSlots = draft.slots.map((slot) => {
      if (slot.clientId !== clientId) return slot;
      const step = slot.locked ? LOCKED_DWELL_STEP : DWELL_STEP;
      return {
        ...slot,
        dwellMinutes: Math.max(MIN_DWELL, slot.dwellMinutes + direction * step),
      };
    });
    runRecalc({ slots: nextSlots, routeSegments: draft.routeSegments });
  };

  const updateSegmentMinutes = (fromClientId: string, direction: 1 | -1) => {
    if (!draft) return;
    const nextSegments = draft.routeSegments.map((segment) =>
      segment.fromClientId === fromClientId
        ? {
            ...segment,
            durationMinutes: Math.max(
              MIN_ROUTE,
              segment.durationMinutes + direction * ROUTE_STEP,
            ),
            manuallyAdjusted: true,
          }
        : segment,
    );
    runRecalc({ slots: draft.slots, routeSegments: nextSegments });
  };

  const updateSegmentMode = (fromClientId: string, mode: DraftRouteMode) => {
    if (!draft) return;
    const nextSegments = draft.routeSegments.map((segment) =>
      segment.fromClientId === fromClientId
        ? { ...segment, mode, manuallyAdjusted: false }
        : segment,
    );
    runRecalc(
      { slots: draft.slots, routeSegments: nextSegments },
      arrivalBufferMinutes,
      { blocking: true },
    );
  };

  const deleteSlot = (clientId: string) => {
    if (!draft) return;
    const target = draft.slots.find((slot) => slot.clientId === clientId);
    if (!target || target.locked) return;
    const nextSlots = draft.slots.filter((slot) => slot.clientId !== clientId);
    // Drop any segment touching the removed slot; SCHEDULE-002 returns fresh segments.
    const nextSegments = draft.routeSegments.filter(
      (segment) =>
        segment.fromClientId !== clientId && segment.toClientId !== clientId,
    );
    runRecalc({ slots: nextSlots, routeSegments: nextSegments });
  };

  const reorderSlot = (
    sourceId: string,
    targetId: string,
    placement: "before" | "after",
  ) => {
    if (!draft || sourceId === targetId) return;
    const source = draft.slots.find((slot) => slot.clientId === sourceId);
    const target = draft.slots.find((slot) => slot.clientId === targetId);
    if (!source || !target || source.locked) return;

    const remaining = draft.slots.filter((slot) => slot.clientId !== sourceId);
    const targetIndex = remaining.findIndex((slot) => slot.clientId === targetId);
    if (targetIndex < 0) return;

    const lockedSafePlacement = target.locked ? "before" : placement;
    let insertIndex = targetIndex + (lockedSafePlacement === "after" ? 1 : 0);

    // Movable slots stay strictly between the leading locked anchor (집합 장소) and the
    // trailing locked anchor (공연 장소). Count the anchors from the full draft (the moved
    // slot is movable, so removing it doesn't change those counts) and clamp the insert
    // position into the interior so a place can never jump above 집합 or below 공연.
    let leadingLocked = 0;
    while (
      leadingLocked < draft.slots.length &&
      draft.slots[leadingLocked].locked
    ) {
      leadingLocked += 1;
    }
    let trailingLocked = 0;
    while (
      trailingLocked < draft.slots.length &&
      draft.slots[draft.slots.length - 1 - trailingLocked].locked
    ) {
      trailingLocked += 1;
    }
    const lowerBound = leadingLocked;
    const upperBound = remaining.length - trailingLocked;
    insertIndex = Math.min(Math.max(insertIndex, lowerBound), upperBound);

    const nextSlots = [
      ...remaining.slice(0, insertIndex),
      source,
      ...remaining.slice(insertIndex),
    ];
    runRecalc(
      { slots: nextSlots, routeSegments: draft.routeSegments },
      arrivalBufferMinutes,
      { blocking: true },
    );
  };

  const requestRecommend = () => {
    if (!draft || scheduleId == null) return;
    const base = buildRequestBody(draft, arrivalBufferMinutes);
    const body: RecommendRequestBody = {
      arrivalBufferMinutes: base.arrivalBufferMinutes,
      slots: base.slots,
      recommendationMode: "WALK",
    };
    const seq = ++recalcSeqRef.current;
    setIsBlockingRecalc(true);
    recommend.mutate(body, {
      onSuccess: (result) => {
        if (seq !== recalcSeqRef.current) return;
        applyPreviewResult(result);
      },
      onSettled: () => setIsBlockingRecalc(false),
    });
  };

  const resetDraft = () => {
    const initial = initialDraftRef.current;
    if (!initial || !data?.schedule) return;
    recalcSeqRef.current += 1; // cancel any in-flight recalc reconciliation
    clearPersistedDraft(data.schedule.id);
    setDraft({
      slots: initial.slots.map((slot) => ({ ...slot })),
      routeSegments: initial.routeSegments.map((segment) => ({ ...segment })),
    });
    setArrivalBufferMinutes(data.schedule.arrivalBufferMinutes);
    setCommitOverrun(null);
    setCommitError(false);
  };

  const completeEdit = () => {
    if (!draft || scheduleId == null) return;
    setCommitError(false);
    commit.mutate(buildRequestBody(draft, arrivalBufferMinutes), {
      onSuccess: () => {
        clearPersistedDraft(scheduleId);
        router.push(roomId != null ? `/timeline?roomId=${roomId}` : "/timeline");
      },
      onError: (error) => {
        if (error instanceof ScheduleOverrunError) {
          setCommitOverrun(error.overrunMinutes);
          router.push(
            roomId != null
              ? `/timetable?roomId=${roomId}&modal=warning`
              : "/timetable?modal=warning",
          );
          return;
        }
        setCommitError(true);
      },
    });
  };

  const dismissWarning = () => {
    setCommitOverrun(null);
    router.push(roomId != null ? `/timetable?roomId=${roomId}` : "/timetable");
  };

  const placesHref = roomId != null ? `/places?roomId=${roomId}` : "/places";
  const segmentByFrom = new Map<string, DraftPreviewRouteSegment>();
  for (const segment of draft?.routeSegments ?? []) {
    segmentByFrom.set(segment.fromClientId, segment);
  }

  const warningVisible = commitOverrun != null || showWarning;
  const overrunValue = commitOverrun ?? preview?.overrunMinutes ?? 0;
  const headerDate = formatHeaderDate(preview?.effectiveStartAt ?? null);

  const startDrag = (
    clientId: string,
    event: React.DragEvent<HTMLButtonElement>,
  ) => {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", clientId);
    }
    setDragState({ sourceId: clientId, targetId: null, placement: "before" });
  };

  const updateDropTarget = (
    targetSlot: DraftPreviewSlot,
    event: React.DragEvent<HTMLElement>,
  ) => {
    const sourceId = dragState?.sourceId ?? event.dataTransfer?.getData("text/plain");
    if (!sourceId || sourceId === targetSlot.clientId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    // Locked anchors can't be displaced: dropping on the FIRST anchor (집합) lands after it,
    // on any other locked anchor (공연) lands before it — keeping the drop in the interior.
    const isFirstSlot = draft?.slots[0]?.clientId === targetSlot.clientId;
    const placement = targetSlot.locked
      ? isFirstSlot
        ? "after"
        : "before"
      : event.clientY <= rect.top + rect.height / 2
        ? "before"
        : "after";
    setDragState({ sourceId, targetId: targetSlot.clientId, placement });
  };

  const dropSlot = (
    targetSlot: DraftPreviewSlot,
    event: React.DragEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    const sourceId = event.dataTransfer?.getData("text/plain") || dragState?.sourceId;
    const placement =
      dragState?.targetId === targetSlot.clientId ? dragState.placement : "before";
    if (sourceId && sourceId !== targetSlot.clientId) {
      reorderSlot(sourceId, targetSlot.clientId, placement);
    }
    setDragState(null);
  };

  const renderBody = () => {
    if (roomId == null) {
      return (
        <EmptyNotice
          title="방을 먼저 선택해 주세요"
          description="내 방 목록에서 일정을 볼 방을 선택하면 수정 화면이 열려요."
          actionHref="/my-rooms"
          actionLabel="내 방으로 가기"
        />
      );
    }
    if (isLoading) {
      return (
        <p className="py-12 text-center text-[13px] text-[var(--cb-text-3)]">
          일정을 불러오는 중…
        </p>
      );
    }
    if (isError || !draft) {
      return (
        <p className="py-12 text-center text-[13px] text-[var(--cb-text-3)]">
          일정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      );
    }

    let pin = 0;
    return (
      <div className="flex flex-col">
        {draft.slots.map((slot) => {
          if (!slot.locked) pin += 1;
          return (
            <DraftStopBlock
              key={slot.clientId}
              slot={slot}
              pinLabel={String(pin)}
              segment={segmentByFrom.get(slot.clientId)}
              onDelete={() => deleteSlot(slot.clientId)}
              onDwellMinus={() => updateSlotDwell(slot.clientId, -1)}
              onDwellPlus={() => updateSlotDwell(slot.clientId, 1)}
              onRouteMinus={() => updateSegmentMinutes(slot.clientId, -1)}
              onRoutePlus={() => updateSegmentMinutes(slot.clientId, 1)}
              onRouteMode={(mode) => updateSegmentMode(slot.clientId, mode)}
              onDragStart={(event) => startDrag(slot.clientId, event)}
              onDragOver={(event) => updateDropTarget(slot, event)}
              onDrop={(event) => dropSlot(slot, event)}
              onDragEnd={() => setDragState(null)}
              isDragging={dragState != null && dragState.sourceId === slot.clientId}
              dropPlacement={
                dragState != null && dragState.targetId === slot.clientId
                  ? dragState.placement
                  : null
              }
            />
          );
        })}
        <button
          type="button"
          onClick={requestRecommend}
          disabled={recommend.isPending}
          className="mt-3 inline-flex h-[44px] items-center justify-center gap-2 rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] text-[13px] font-bold text-[var(--cb-text)] transition duration-200 hover:bg-[var(--cb-surface-3)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles size={16} /> {recommend.isPending ? "추천 계산 중…" : "추천 순서"}
        </button>
        <Link
          href={placesHref}
          onClick={() => {
            if (draft && scheduleId != null) {
              persistDraft(scheduleId, draft, arrivalBufferMinutes);
            }
          }}
          className="mt-2 inline-flex h-[46px] items-center justify-center gap-2 rounded-[var(--r-md)] border border-dashed border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] text-[13px] font-bold text-[var(--cb-yellow-2)] transition duration-200 hover:-translate-y-0.5 hover:bg-[rgba(250,204,21,.16)] hover:shadow-[0_12px_28px_rgba(250,204,21,.12)] active:translate-y-0 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
        >
          <Plus size={16} /> 장소 추가
        </Link>
      </div>
    );
  };

  const canEdit = roomId != null && !!draft;
  // Structural recalcs (add place / mode toggle / recommend / reorder) block the editor;
  // quick time-stepper recalcs update in the background so the UI stays responsive.
  const isRecalculating = isBlockingRecalc;

  return (
    <div className="flex h-dvh min-h-0 flex-col">
      <AppBar
        title="일정 수정"
        left={<BackButton href={roomId != null ? `/timeline?roomId=${roomId}` : "/timeline"} icon="close" />}
        right={
          <button
            className="rounded-[var(--r-sm)] px-1.5 text-[13px] font-semibold text-[var(--cb-yellow)] transition duration-150 hover:text-[var(--cb-yellow-2)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)] disabled:cursor-not-allowed disabled:text-[var(--cb-text-3)] disabled:hover:text-[var(--cb-text-3)] disabled:active:scale-100 disabled:focus-visible:outline-none"
            disabled={warningVisible || !canEdit || isRecalculating}
            onClick={resetDraft}
            type="button"
          >
            초기화
          </button>
        }
      />
      <div className="shrink-0 border-b border-[var(--cb-line)] px-4 py-[14px]">
        <div className="text-[15px] font-bold">
          {data?.room?.title ?? "일정 수정"}
          {headerDate ? ` · ${headerDate}` : ""}
        </div>
        <div className="mt-1 text-[11.5px] text-[var(--cb-text-3)]">
          {warningVisible
            ? "공연 시작 시간을 기준으로 자동 역산한 결과예요"
            : "장소·체류·이동 시간을 바꾸면 서버가 일정을 자동 재계산해요"}
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          aria-hidden={warningVisible}
          inert={warningVisible || isRecalculating ? true : undefined}
          className={cn(
            "h-full overflow-y-auto px-4 py-[14px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            warningVisible && "pointer-events-none opacity-50 blur-[4px]",
            !warningVisible && isRecalculating && "pointer-events-none opacity-60",
          )}
        >
          {renderBody()}
        </div>
        {!warningVisible && isRecalculating ? (
          <div
            className="absolute inset-0 z-20 grid place-items-center bg-[rgba(5,5,6,.35)] backdrop-blur-[1px]"
            role="status"
            aria-live="polite"
            aria-label="일정을 다시 계산하는 중"
          >
            <div className="flex items-center gap-2 rounded-[var(--r-pill)] border border-[var(--cb-line-2)] bg-[var(--cb-surface-1)] px-4 py-2.5 text-[12.5px] font-semibold text-[var(--cb-text)] shadow-[var(--sh-pop)]">
              <Loader2 size={16} className="animate-spin text-[var(--cb-yellow)]" />
              일정을 다시 계산하는 중…
            </div>
          </div>
        ) : null}
        {warningVisible ? (
          <OverTimeWarning
            overrunMinutes={overrunValue}
            effectiveStartAt={preview?.effectiveStartAt ?? null}
            targetArrivalAt={preview?.targetArrivalAt ?? null}
            onReturn={dismissWarning}
          />
        ) : null}
      </div>
      {!warningVisible ? (
        <div className="shrink-0 border-t border-[var(--cb-line)] bg-[rgba(14,14,16,.96)] px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3">
          <div className="mb-2 text-[10.5px] leading-4 text-[var(--cb-text-3)]">
            장소 추가·순서 변경·삭제 시 시간이 자동 역산돼요. 이동 구간은 저장된 값을 재사용하고 새 구간만 새로 계산해요.
          </div>
          {commitError ? (
            <p className="mb-2 text-[11.5px] font-semibold text-[var(--cb-danger)]">
              저장하지 못했어요. 잠시 후 다시 시도해 주세요.
            </p>
          ) : null}
          <Button onClick={completeEdit} disabled={!canEdit || commit.isPending || isRecalculating}>
            {commit.isPending ? "저장 중…" : "수정 완료"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function EmptyNotice({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="text-[15px] font-bold text-[var(--cb-text)]">{title}</div>
      <p className="max-w-[260px] text-[12.5px] leading-5 text-[var(--cb-text-3)]">
        {description}
      </p>
      <Link
        href={actionHref}
        className="inline-flex h-[40px] items-center justify-center rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] px-4 text-[12.5px] font-semibold text-[var(--cb-text)] transition duration-150 hover:bg-[var(--cb-surface-3)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function OverTimeWarning({
  overrunMinutes,
  effectiveStartAt,
  targetArrivalAt,
  onReturn,
}: {
  overrunMinutes: number;
  effectiveStartAt: string | null;
  targetArrivalAt: string | null;
  onReturn: () => void;
}) {
  const start = formatClock(effectiveStartAt);
  const target = formatClock(targetArrivalAt);

  return (
    <>
      <div className="absolute inset-0 z-30 bg-[rgba(5,5,6,.66)] backdrop-blur-[3px]" aria-hidden />
      <section
        aria-label="지금 일정을 전부 소화할 수 없습니다"
        aria-modal="true"
        className="absolute left-4 right-4 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-4 rounded-[24px] border border-[var(--cb-line-2)] bg-[var(--cb-surface-1)] p-5 shadow-[var(--sh-pop)]"
        role="dialog"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[14px] bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)]">
            !
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-extrabold">지금 일정을 전부 소화할 수 없습니다</div>
            <div className="mt-1 text-[11.5px] text-[var(--cb-text-2)]">공연 시작 시간을 기준으로 역산했어요</div>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 rounded-[14px] border border-[var(--cb-yellow-line)] bg-[var(--cb-surface-2)] p-[14px] text-[12px]">
          {start || target ? (
            <SummaryLine
              label="일정 시작 · 도착 목표"
              value={`${start ?? "—"} → ${target ?? "—"}`}
            />
          ) : null}
          <div className="h-px bg-[var(--cb-line)]" />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--cb-text-3)]">초과 시간</span>
            <span className="text-[20px] font-extrabold text-[var(--cb-yellow)]">+ {overrunMinutes}분</span>
          </div>
        </div>
        <p className="text-[12px] leading-5 text-[var(--cb-text-2)]">
          장소를 줄이거나 체류 시간을 줄여 주세요. 도보 → 택시 변경으로도 일부 단축할 수 있어요.
        </p>
        <Button onClick={onReturn}>되돌아가서 수정</Button>
      </section>
    </>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="sr-only">
        {label} {value}
      </span>
      <span className="shrink-0 text-[var(--cb-text-3)]">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
