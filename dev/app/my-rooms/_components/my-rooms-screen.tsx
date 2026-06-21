"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { ko } from "date-fns/locale/ko";
import { useMemo, useState } from "react";
import { AppBar, Button, Card, Skeleton } from "@/components/ui";
import { formatRoomMeetingTime } from "@/lib/format";
import { useMyRooms, type MyRoomItem } from "@/lib/api/my-rooms";
import { cn } from "@/lib/utils";

// Client-side grouping derived from ROOM-004's viewerRole/viewerJoinStatus.
// The endpoint does not return a status/tab field per item, so these chips are computed
// locally rather than via the (optional, undocumented-enum) `tab` query param.
type MyRoomGroup = "host" | "member" | "pending" | "other";

const myRoomFilters = [
  { key: "all", label: "전체" },
  { key: "host", label: "방장" },
  { key: "member", label: "참여중" },
  { key: "pending", label: "대기중" }
] as const;

type MyRoomFilter = (typeof myRoomFilters)[number]["key"];

function deriveGroup(item: MyRoomItem): MyRoomGroup {
  if (item.viewerJoinStatus === "PENDING") return "pending";
  if (item.viewerRole === "HOST") return "host";
  if (item.viewerRole === "MEMBER") return "member";
  return "other";
}

function groupLabel(group: MyRoomGroup) {
  return { host: "HOST", member: "참여중", pending: "대기중", other: "참여" }[group];
}

// roomId-based navigation to the backend-driven room detail (CB-07A/B/C/D via ROOM-003).
// The detail screen reads viewerRole/permissions from the API, so a single per-id route
// serves every role — no need to pre-select a role-specific placeholder route here.
function detailHref(item: MyRoomItem) {
  return `/rooms/${item.roomId}?back=${encodeURIComponent("/my-rooms")}`;
}

function formatConcertDayLabel(startAt: string) {
  return format(new Date(startAt), "MM.dd (eee)", { locale: ko });
}

function getConcertDday(item: MyRoomItem): { label: string; ended: boolean } {
  // Use the actual concert date as the source of truth for past/ended, so a stale or
  // server-clamped daysUntilConcert can't keep a finished concert stuck on "D-DAY".
  const daysFromDate = differenceInCalendarDays(
    new Date(item.concertStartAt),
    new Date()
  );
  if (daysFromDate < 0) return { label: "종료", ended: true };
  if (daysFromDate === 0) return { label: "D-DAY", ended: false };
  return { label: `D-${item.daysUntilConcert}`, ended: false };
}

export function MyRoomsScreen() {
  const [filter, setFilter] = useState<MyRoomFilter>("all");
  const { data, isLoading, isError } = useMyRooms();

  const items = useMemo(() => data?.items ?? [], [data]);
  const counts = useMemo(
    () => ({
      host: items.filter((item) => deriveGroup(item) === "host").length,
      member: items.filter((item) => deriveGroup(item) === "member").length,
      pending: items.filter((item) => deriveGroup(item) === "pending").length
    }),
    [items]
  );

  const visibleItems = items.filter((item) => {
    if (filter === "all") return true;
    return deriveGroup(item) === filter;
  });

  return (
    <>
      <AppBar left={<h1 className="text-[21px] font-bold leading-none tracking-[-.02em]">내 방</h1>} />
      <div className="flex h-[calc(100dvh-116px)] min-h-0 flex-col">
        <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-1 pt-3.5" role="group" aria-label="내 방 상태 필터">
          {myRoomFilters.map((item) => {
            const count = item.key === "all" ? null : counts[item.key];

            return (
              <button
                aria-label={count === null ? item.label : `${item.label} ${count}`}
                aria-pressed={filter === item.key}
                key={item.key}
                className={cn(
                  "inline-flex h-[34px] shrink-0 items-center gap-[7px] rounded-[var(--r-pill)] border px-3.5 text-[12.5px] font-semibold transition duration-150 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]",
                  filter === item.key
                    ? "border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)] hover:bg-[var(--cb-yellow-2)]"
                    : "border-[var(--cb-line)] bg-[var(--cb-surface-2)] text-[var(--cb-text-2)] hover:border-[var(--cb-line-2)] hover:bg-[var(--cb-surface-3)] hover:text-[var(--cb-text)]"
                )}
                onClick={() => setFilter(item.key)}
                type="button"
              >
                {item.label}
                {count === null ? null : (
                  <>
                    {" "}
                    <span
                      className={cn(
                        "rounded-[var(--r-pill)] px-1.5 py-px text-[10px] font-extrabold",
                        filter === item.key ? "bg-[var(--cb-on-yellow)] text-[var(--cb-yellow)]" : "bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)]"
                      )}
                    >
                      {count}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-[88px] pt-[18px]">
          {isLoading ? (
            <div className="flex flex-col gap-3 px-4" aria-hidden>
              {[0, 1, 2].map((key) => (
                <Skeleton key={key} className="h-[112px] w-full rounded-[var(--r-lg)]" />
              ))}
            </div>
          ) : isError ? (
            <Card className="mx-4 p-5 text-center">
              <p className="text-[13px] text-[var(--cb-text-2)]">방 목록을 불러오지 못했습니다.</p>
            </Card>
          ) : visibleItems.length > 0 ? (
            <section aria-label="내 방 목록">
              {visibleItems.map((item) => (
                <MyRoomCard key={item.roomId} item={item} />
              ))}
            </section>
          ) : (
            <Card className="mx-4 p-5 text-center">
              <p className="text-[13px] text-[var(--cb-text-2)]">아직 표시할 방이 없습니다.</p>
              <Button asChild className="mt-4">
                <Link href="/home">방 만들기</Link>
              </Button>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function MyRoomCard({ item }: { item: MyRoomItem }) {
  const group = deriveGroup(item);
  const isPending = group === "pending";
  const showPendingBadge = group === "host" && item.pendingJoinRequestCount > 0;
  const dday = getConcertDday(item);
  const dimmed = isPending || dday.ended;

  return (
    <Link
      href={detailHref(item)}
      className={cn(
        "relative mx-4 mb-3 flex gap-3.5 rounded-[var(--r-lg)] border border-[var(--cb-line)] bg-[var(--cb-surface-1)] p-3.5 shadow-[var(--sh-card)] transition duration-150 hover:border-[var(--cb-line-2)] hover:bg-[var(--cb-surface-2)] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]",
        dimmed && "opacity-[.72]"
      )}
    >
      <div className="ph h-[60px] w-[60px] rounded-[var(--r-md)]">
        <span className="absolute bottom-2 left-[9px] font-mono text-[9px] font-semibold leading-none tracking-[.06em] text-white/35">
          ROOM
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
        <div
          className={cn(
            "truncate pr-[46px] text-[14px] font-bold tracking-[-.01em]",
            isPending && "text-[var(--cb-text-2)]"
          )}
        >
          {item.title}
        </div>
        <div className="truncate text-[11.5px] text-[var(--cb-text-3)]">
          {item.concertTitle} · {formatConcertDayLabel(item.concertStartAt)}
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--cb-text-2)]">
          <MapPin size={13} className="shrink-0 text-[var(--cb-text-3)]" />
          <span className="min-w-0 truncate">{item.venueName}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--cb-text-2)]">
          <span className="shrink-0 rounded-[var(--r-sm)] border border-[var(--cb-line)] px-1.5 py-px text-[10px] font-semibold text-[var(--cb-text-3)]">
            집합
          </span>
          <span className="min-w-0 truncate">{item.meetingPlaceName}</span>
          <span className="shrink-0 text-[var(--cb-text-3)]">·</span>
          <span className="shrink-0">{formatRoomMeetingTime(item.meetingAt)}</span>
        </div>
        <div className="mt-[2px] flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-[11.5px] text-[var(--cb-text-3)]">
            <span className={myRoomRoleBadgeClass(group)}>{groupLabel(group)}</span>
            <span className="truncate">
              {isPending ? "승인 대기 중" : `멤버 ${item.memberCount} / ${item.maxMembers}`}
            </span>
          </div>
          {showPendingBadge ? (
            <span className="shrink-0 rounded-[var(--r-pill)] bg-[var(--cb-yellow)] px-[9px] py-[3px] text-[10.5px] font-extrabold text-[var(--cb-on-yellow)]">
              승인 대기 {item.pendingJoinRequestCount}건
            </span>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          "absolute right-3 top-3 rounded-[var(--r-sm)] border px-2 py-[3px] text-[11px] font-extrabold",
          dday.ended
            ? "border-[var(--cb-line)] bg-[var(--cb-surface-2)] text-[var(--cb-text-3)]"
            : "border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] text-[var(--cb-yellow)]"
        )}
      >
        {dday.label}
      </div>
    </Link>
  );
}

function myRoomRoleBadgeClass(group: MyRoomGroup) {
  return cn(
    "shrink-0 rounded-[var(--r-sm)] px-2 py-[3px] text-[10px] font-extrabold uppercase tracking-[.04em]",
    group === "host" && "bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)]",
    group === "member" && "border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] text-[var(--cb-yellow-2)]",
    group === "pending" && "border border-[var(--cb-line-2)] text-[var(--cb-text-2)]",
    group === "other" && "border border-[var(--cb-line)] text-[var(--cb-text-3)]"
  );
}
