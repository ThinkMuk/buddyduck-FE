"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Plus, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { AppBar, Button, Stepper } from "@/components/ui";
import { calculateTimetableLoad, getModeLabel, type TimetableStop } from "@/lib/data";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { BackButton, formatStopMinutes } from "../../_components/buddy-patterns";

export function TimetableEditScreen({ showWarning = false }: { showWarning?: boolean }) {
  const router = useRouter();
  const stops = useAppStore((state) => state.timelineStopsByDay["d-day"]);
  const updateStopMinutes = useAppStore((state) => state.updateStopMinutes);
  const updateRouteMode = useAppStore((state) => state.updateRouteMode);
  const reorderTimetableStop = useAppStore((state) => state.reorderTimetableStop);
  const deleteTimetableStop = useAppStore((state) => state.deleteTimetableStop);
  const resetTimetable = useAppStore((state) => state.resetTimetable);
  const setActiveTimelineDay = useAppStore((state) => state.setActiveTimelineDay);
  const [dragState, setDragState] = useState<{
    sourceId: string;
    targetId: string | null;
    placement: "before" | "after";
  } | null>(null);
  const load = calculateTimetableLoad(stops);
  const shouldShowWarning = showWarning && load.isOverTime;

  useEffect(() => {
    setActiveTimelineDay("d-day");
  }, [setActiveTimelineDay]);

  const completeEdit = () => {
    router.push(load.isOverTime ? "/timetable?modal=warning" : "/timeline");
  };

  const startDrag = (stopId: string, event: React.DragEvent<HTMLButtonElement>) => {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", stopId);
    }
    setDragState({ sourceId: stopId, targetId: null, placement: "before" });
  };

  const updateDropTarget = (targetStop: TimetableStop, event: React.DragEvent<HTMLElement>) => {
    const sourceId = dragState?.sourceId ?? event.dataTransfer?.getData("text/plain");
    if (!sourceId || sourceId === targetStop.id) return;

    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";

    const rect = event.currentTarget.getBoundingClientRect();
    const placement = targetStop.locked || event.clientY <= rect.top + rect.height / 2 ? "before" : "after";
    setDragState({ sourceId, targetId: targetStop.id, placement });
  };

  const dropStop = (targetStop: TimetableStop, event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    const sourceId = event.dataTransfer?.getData("text/plain") || dragState?.sourceId;
    const placement = dragState?.targetId === targetStop.id ? dragState.placement : "before";
    if (sourceId && sourceId !== targetStop.id) reorderTimetableStop(sourceId, targetStop.id, placement);
    setDragState(null);
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col">
      <AppBar
        title="일정 수정"
        left={<BackButton href="/timeline" icon="close" />}
        right={
          <button
            className="rounded-[var(--r-sm)] px-1.5 text-[13px] font-semibold text-[var(--cb-yellow)] transition duration-150 hover:text-[var(--cb-yellow-2)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)] disabled:cursor-not-allowed disabled:text-[var(--cb-text-3)] disabled:hover:text-[var(--cb-text-3)] disabled:active:scale-100 disabled:focus-visible:outline-none"
            disabled={shouldShowWarning}
            onClick={resetTimetable}
            type="button"
          >
            초기화
          </button>
        }
      />
      <div className="shrink-0 border-b border-[var(--cb-line)] px-4 py-[14px]">
        <div className="text-[15px] font-bold">2026.06.15 (월) — D-Day</div>
        <div className="mt-1 text-[11.5px] text-[var(--cb-text-3)]">
          {shouldShowWarning ? "＋ 장소 1개 추가됨 · 자동 역산 결과" : "장소 블록 · 이동 블록 · 잠긴 공연 블록 · (수정 모드) 여유 시간"}
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          aria-hidden={shouldShowWarning}
          inert={shouldShowWarning ? true : undefined}
          className={cn("h-full overflow-y-auto px-4 py-[14px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", shouldShowWarning && "pointer-events-none opacity-50 blur-[4px]")}
        >
          <div className="flex flex-col">
            {stops.map((stop, index) => (
              <TimetableStopBlock
                key={stop.id}
                stop={stop}
                nextStop={stops[index + 1]}
                onDelete={() => deleteTimetableStop(stop.id)}
                onDwellMinus={() => updateStopMinutes(stop.id, "dwellMinutes", stop.locked ? -5 : -10)}
                onDwellPlus={() => updateStopMinutes(stop.id, "dwellMinutes", stop.locked ? 5 : 10)}
                onRouteMinus={() => updateStopMinutes(stop.id, "transitMinutes", -5)}
                onRoutePlus={() => updateStopMinutes(stop.id, "transitMinutes", 5)}
                onRouteMode={(mode) => updateRouteMode(stop.id, mode)}
                onDragStart={(event) => startDrag(stop.id, event)}
                onDragOver={(event) => updateDropTarget(stop, event)}
                onDrop={(event) => dropStop(stop, event)}
                onDragEnd={() => setDragState(null)}
                isDragging={dragState?.sourceId === stop.id}
                dropPlacement={dragState?.targetId === stop.id ? dragState.placement : null}
              />
            ))}
            <Link
              href="/places"
              className="mt-3 inline-flex h-[46px] items-center justify-center gap-2 rounded-[var(--r-md)] border border-dashed border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] text-[13px] font-bold text-[var(--cb-yellow-2)] transition duration-200 hover:-translate-y-0.5 hover:bg-[rgba(250,204,21,.16)] hover:shadow-[0_12px_28px_rgba(250,204,21,.12)] active:translate-y-0 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
            >
              <Plus size={16} /> 장소 추가
            </Link>
          </div>
        </div>
        {shouldShowWarning ? <OverTimeWarning load={load} onReturn={() => router.push("/timetable")} /> : null}
      </div>
      {!shouldShowWarning ? (
        <div className="shrink-0 border-t border-[var(--cb-line)] bg-[rgba(14,14,16,.96)] px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3">
          <div className="mb-2 text-[10.5px] leading-4 text-[var(--cb-text-3)]">
            장소 추가·순서 변경·삭제 시 시간이 자동 역산돼요. 이동 구간은 저장된 값 재사용, 새 구간만 새로 계산.
          </div>
          <Button onClick={completeEdit}>수정 완료</Button>
        </div>
      ) : null}
    </div>
  );
}

function TimetableStopBlock({
  stop,
  nextStop,
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
  dropPlacement
}: {
  stop: TimetableStop;
  nextStop?: TimetableStop;
  onDelete: () => void;
  onDwellMinus: () => void;
  onDwellPlus: () => void;
  onRouteMinus: () => void;
  onRoutePlus: () => void;
  onRouteMode: (mode: TimetableStop["mode"]) => void;
  onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDrop: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  dropPlacement: "before" | "after" | null;
}) {
  const displayName = stop.displayPlace ?? stop.place;

  return (
    <>
      <section
        data-timetable-stop={stop.id}
        data-drop-placement={dropPlacement ?? undefined}
        className={cn(
          "relative rounded-[14px] border bg-[var(--cb-surface-1)] shadow-[var(--sh-card)] transition duration-200 ease-out motion-reduce:transition-none",
          stop.locked
            ? "border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)]"
            : "border-[var(--cb-line)] hover:-translate-y-0.5 hover:border-[var(--cb-line-2)] hover:shadow-[0_14px_32px_rgba(0,0,0,.24)]",
          isDragging && "scale-[0.985] opacity-55 ring-1 ring-[var(--cb-yellow-line)]",
          dropPlacement && "border-[var(--cb-yellow-line)] shadow-[0_0_0_1px_var(--cb-yellow-line),var(--sh-card)]"
        )}
        aria-label={displayName}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {dropPlacement ? (
          <span
            className={cn(
              "pointer-events-none absolute left-2 right-2 z-10 h-0.5 rounded-full bg-[var(--cb-yellow)] shadow-[0_0_16px_rgba(250,204,21,.55)]",
              dropPlacement === "before" ? "-top-[7px]" : "-bottom-[7px]"
            )}
          />
        ) : null}
        <div className="flex items-center gap-[9px] px-3 pb-2.5 pt-3">
          <button
            aria-label={`${stop.place} 순서 이동`}
            aria-grabbed={isDragging}
            className={cn(
              "group/drag -ml-1 grid h-7 w-6 shrink-0 place-items-center rounded-md text-[var(--cb-text-3)] transition duration-150 hover:bg-[var(--cb-surface-3)] hover:text-[var(--cb-yellow)] active:scale-95 active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)] disabled:pointer-events-none disabled:opacity-30 disabled:focus-visible:outline-none",
              !stop.locked && "cursor-grab"
            )}
            disabled={stop.locked}
            draggable={!stop.locked}
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
            {stop.locked ? <Star size={13} fill="currentColor" /> : stop.pinLabel}
          </span>
          <div className="min-w-0 flex-1 truncate text-[13.5px] font-bold" data-testid="timetable-place-name">
            {displayName}
            {stop.locked ? <Lock className="ml-1 inline text-[var(--cb-yellow-2)]" size={13} /> : null}
          </div>
          <span className="shrink-0 text-[11px] font-semibold text-[var(--cb-text-2)]">{stop.time}</span>
          {!stop.locked ? (
            <button
              aria-label={`${displayName} 삭제`}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[18px] text-[var(--cb-text-3)] transition duration-150 hover:bg-[rgba(255,107,91,.13)] hover:text-[var(--cb-danger)] active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
              onClick={onDelete}
              type="button"
            >
              ×
            </button>
          ) : null}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--cb-line)] px-3 py-2.5">
          <div className="text-[12px] font-semibold text-[var(--cb-text-2)]">{stop.locked ? "도착 버퍼" : "머무는 시간"}</div>
          <Stepper
            value={formatStopMinutes(stop.dwellMinutes)}
            minusLabel={`${stop.place} ${stop.locked ? "도착 버퍼" : "머무는 시간"} 감소`}
            plusLabel={`${stop.place} ${stop.locked ? "도착 버퍼" : "머무는 시간"} 증가`}
            onMinus={onDwellMinus}
            onPlus={onDwellPlus}
          />
        </div>
        {stop.locked ? (
          <div className="flex justify-between gap-3 px-3 pb-[11px] text-[10.5px] text-[var(--cb-text-3)]">
            <span>공연 시간·순서는 잠김</span>
            <span>5분 단위 · 최소 10분</span>
          </div>
        ) : null}
      </section>
      {!stop.locked && nextStop ? (
        <section data-route-block={stop.id} className="ml-[30px] my-0.5 border-l-2 border-dashed border-[var(--cb-line-2)] px-3 py-2.5 transition-colors duration-200 hover:border-[var(--cb-yellow-line)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-[var(--cb-text-2)]">
              <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border border-[var(--cb-line)] bg-[var(--cb-surface-2)] text-[11px] font-bold">
                {stop.routeModeShort}
              </span>
              <span className="truncate">
                {stop.routeModeLabel ?? getModeLabel(stop.mode)} · {stop.routeDistance}
              </span>
            </div>
            <Stepper
              value={formatStopMinutes(stop.transitMinutes)}
              minusLabel={`${stop.place} 이동 시간 감소`}
              plusLabel={`${stop.place} 이동 시간 증가`}
              onMinus={onRouteMinus}
              onPlus={onRoutePlus}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="inline-flex gap-1 rounded-[var(--r-pill)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] p-1">
              <ModeButton active={stop.mode === "walk"} onClick={() => onRouteMode("walk")}>도보</ModeButton>
              <ModeButton active={stop.mode === "drive"} onClick={() => onRouteMode("drive")}>택시</ModeButton>
            </div>
            <span className="text-[10.5px] text-[var(--cb-text-3)]">15분 단위 조정</span>
          </div>
        </section>
      ) : null}
    </>
  );
}

function ModeButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "h-6 rounded-[var(--r-pill)] px-2.5 text-[11px] font-bold transition duration-150 hover:-translate-y-px active:translate-y-0 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cb-yellow)]",
        active ? "bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)] shadow-[0_5px_14px_rgba(250,204,21,.18)]" : "text-[var(--cb-text-2)] hover:bg-[var(--cb-surface-3)] hover:text-[var(--cb-text)]"
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function OverTimeWarning({ load, onReturn }: { load: ReturnType<typeof calculateTimetableLoad>; onReturn: () => void }) {
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
          <SummaryLine label="사용 가능 시간" value="14:00 – 18:30 · 4h 30m" />
          <SummaryLine label="현재 일정 총 소요" value={formatStopMinutes(load.usedMinutes)} />
          <div className="h-px bg-[var(--cb-line)]" />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--cb-text-3)]">초과 시간</span>
            <span className="text-[20px] font-extrabold text-[var(--cb-yellow)]">+ {load.overMinutes}분</span>
          </div>
        </div>
        <p className="text-[12px] leading-5 text-[var(--cb-text-2)]">
          장소를 줄이거나 체류 시간을 줄여 주세요. 도보 → 택시 변경으로도 일부 단축할 수 있어요. 공연 도착 버퍼 30분은 자동으로 확보돼요.
        </p>
        <Button onClick={onReturn}>되돌아가서 수정</Button>
      </section>
    </>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="sr-only">{label} {value}</span>
      <span className="shrink-0 text-[var(--cb-text-3)]">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
