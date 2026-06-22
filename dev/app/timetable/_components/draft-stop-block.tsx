"use client";

import { Lock, Star } from "lucide-react";
import { Stepper } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatStopMinutes } from "../../_components/buddy-patterns";
import type {
  DraftPreviewRouteSegment,
  DraftPreviewSlot,
  DraftRouteMode,
} from "@/lib/api/schedule-draft";

// Presentational only: renders a single draft slot card plus (when present) the outgoing
// route block to the next slot. All mutation/recalc orchestration lives in
// timetable-edit-screen.tsx — this piece just renders the SCHEDULE-002/004 preview shape
// and surfaces edit intents via callbacks.

function formatClock(iso: string | null) {
  if (!iso || iso.length < 16) return null;
  return iso.slice(11, 16);
}

function formatSlotTime(slot: DraftPreviewSlot) {
  const start = formatClock(slot.startAt);
  const end = formatClock(slot.endAt);
  if (start && end) return `${start} – ${end}`;
  return start ?? end ?? "—";
}

export function getRouteModeLabel(mode: string) {
  return mode === "CAR_TAXI" ? "택시" : "도보";
}

function getRouteModeShort(mode: string) {
  return mode === "CAR_TAXI" ? "택" : "도";
}

function formatDistance(distanceMeters: number | null) {
  if (distanceMeters == null) return null;
  if (distanceMeters >= 1000) return `${(distanceMeters / 1000).toFixed(1)}km`;
  return `${distanceMeters}m`;
}

export function DraftStopBlock({
  slot,
  pinLabel,
  segment,
  onDelete,
  onDwellMinus,
  onDwellPlus,
  onRouteMinus,
  onRoutePlus,
  onRouteMode,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  dropPlacement,
}: {
  slot: DraftPreviewSlot;
  pinLabel: string;
  segment?: DraftPreviewRouteSegment;
  onDelete: () => void;
  onDwellMinus: () => void;
  onDwellPlus: () => void;
  onRouteMinus: () => void;
  onRoutePlus: () => void;
  onRouteMode: (mode: DraftRouteMode) => void;
  onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDrop: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  dropPlacement: "before" | "after" | null;
}) {
  const locked = slot.locked;

  return (
    <>
      <section
        data-timetable-stop={slot.clientId}
        data-drop-placement={dropPlacement ?? undefined}
        className={cn(
          "relative rounded-[14px] border bg-[var(--cb-surface-1)] shadow-[var(--sh-card)] transition duration-200 ease-out motion-reduce:transition-none",
          locked
            ? "border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)]"
            : "border-[var(--cb-line)] hover:-translate-y-0.5 hover:border-[var(--cb-line-2)] hover:shadow-[0_14px_32px_rgba(0,0,0,.24)]",
          isDragging && "scale-[0.985] opacity-55 ring-1 ring-[var(--cb-yellow-line)]",
          dropPlacement && "border-[var(--cb-yellow-line)] shadow-[0_0_0_1px_var(--cb-yellow-line),var(--sh-card)]",
        )}
        aria-label={slot.title}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {dropPlacement ? (
          <span
            className={cn(
              "pointer-events-none absolute left-2 right-2 z-10 h-0.5 rounded-full bg-[var(--cb-yellow)] shadow-[0_0_16px_rgba(250,204,21,.55)]",
              dropPlacement === "before" ? "-top-[7px]" : "-bottom-[7px]",
            )}
          />
        ) : null}
        <div className="flex items-center gap-[9px] px-3 pb-2.5 pt-3">
          <button
            aria-label={`${slot.title} 순서 이동`}
            aria-grabbed={isDragging}
            className={cn(
              "group/drag -ml-1 grid h-7 w-6 shrink-0 place-items-center rounded-md text-[var(--cb-text-3)] transition duration-150 hover:bg-[var(--cb-surface-3)] hover:text-[var(--cb-yellow)] active:scale-95 active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)] disabled:pointer-events-none disabled:opacity-30 disabled:focus-visible:outline-none",
              !locked && "cursor-grab",
            )}
            disabled={locked}
            draggable={!locked}
            onDragEnd={onDragEnd}
            onDragStart={onDragStart}
            type="button"
          >
            <span className="flex w-[13px] flex-col gap-0.5 transition-transform duration-150 group-hover/drag:scale-110">
              <i className="h-0.5 w-[13px] rounded-full bg-current transition-transform duration-150 group-hover/drag:-translate-y-px" />
              <i className="h-0.5 w-[13px] rounded-full bg-current" />
              <i className="h-0.5 w-[13px] rounded-full bg-current transition-transform duration-150 group-hover/drag:translate-y-px" />
            </span>
          </button>
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--cb-yellow)] text-[11px] font-extrabold text-[var(--cb-on-yellow)]">
            {locked ? <Star size={13} fill="currentColor" /> : pinLabel}
          </span>
          <div className="min-w-0 flex-1 truncate text-[13.5px] font-bold" data-testid="timetable-place-name">
            {slot.title}
            {locked ? <Lock className="ml-1 inline text-[var(--cb-yellow-2)]" size={13} /> : null}
          </div>
          <span className="shrink-0 text-[11px] font-semibold text-[var(--cb-text-2)]">{formatSlotTime(slot)}</span>
          {!locked ? (
            <button
              aria-label={`${slot.title} 삭제`}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[18px] text-[var(--cb-text-3)] transition duration-150 hover:bg-[rgba(255,107,91,.13)] hover:text-[var(--cb-danger)] active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
              onClick={onDelete}
              type="button"
            >
              ×
            </button>
          ) : null}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--cb-line)] px-3 py-2.5">
          <div className="text-[12px] font-semibold text-[var(--cb-text-2)]">{locked ? "도착 버퍼" : "머무는 시간"}</div>
          <Stepper
            value={formatStopMinutes(slot.dwellMinutes)}
            minusLabel={`${slot.title} ${locked ? "도착 버퍼" : "머무는 시간"} 감소`}
            plusLabel={`${slot.title} ${locked ? "도착 버퍼" : "머무는 시간"} 증가`}
            onMinus={onDwellMinus}
            onPlus={onDwellPlus}
          />
        </div>
        {locked ? (
          <div className="flex justify-between gap-3 px-3 pb-[11px] text-[10.5px] text-[var(--cb-text-3)]">
            <span>공연 시간·순서는 잠김</span>
            <span>5분 단위 · 최소 10분</span>
          </div>
        ) : null}
      </section>
      {segment ? (
        <section
          data-route-block={slot.clientId}
          className="ml-[30px] my-0.5 border-l-2 border-dashed border-[var(--cb-line-2)] px-3 py-2.5 transition-colors duration-200 hover:border-[var(--cb-yellow-line)]"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-[var(--cb-text-2)]">
              <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border border-[var(--cb-line)] bg-[var(--cb-surface-2)] text-[11px] font-bold">
                {getRouteModeShort(segment.mode)}
              </span>
              <span className="truncate">
                {getRouteModeLabel(segment.mode)}
                {formatDistance(segment.distanceMeters) ? ` · ${formatDistance(segment.distanceMeters)}` : ""}
              </span>
            </div>
            <Stepper
              value={formatStopMinutes(segment.durationMinutes)}
              minusLabel={`${slot.title} 이동 시간 감소`}
              plusLabel={`${slot.title} 이동 시간 증가`}
              onMinus={onRouteMinus}
              onPlus={onRoutePlus}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="inline-flex gap-1 rounded-[var(--r-pill)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] p-1">
              <ModeButton active={segment.mode === "WALK"} onClick={() => onRouteMode("WALK")}>
                도보
              </ModeButton>
              <ModeButton active={segment.mode === "CAR_TAXI"} onClick={() => onRouteMode("CAR_TAXI")}>
                택시
              </ModeButton>
            </div>
            <span className="text-[10.5px] text-[var(--cb-text-3)]">5분 단위 조정</span>
          </div>
        </section>
      ) : null}
    </>
  );
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "h-6 rounded-[var(--r-pill)] px-2.5 text-[11px] font-bold transition duration-150 hover:-translate-y-px active:translate-y-0 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cb-yellow)]",
        active
          ? "bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)] shadow-[0_5px_14px_rgba(250,204,21,.18)]"
          : "text-[var(--cb-text-2)] hover:bg-[var(--cb-surface-3)] hover:text-[var(--cb-text)]",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
