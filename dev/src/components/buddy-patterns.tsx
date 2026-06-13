"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronRight, Clock3, MapPin as MapPinIcon, Star, X } from "lucide-react";
import { Avatar, Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getModeLabel, type Concert, type Member, type Room, type TimetableStop } from "@/lib/data";

export function Badge({
  children,
  tone = "muted"
}: {
  children: React.ReactNode;
  tone?: "muted" | "yellow";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--r-pill)] border px-2.5 py-1 text-[11px] font-semibold",
        tone === "yellow"
          ? "border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] text-[var(--cb-yellow-2)]"
          : "border-[var(--cb-line)] bg-[var(--cb-surface-2)] text-[var(--cb-text-2)]"
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-3 mt-5 text-[15px] font-bold">{title}</h2>;
}

export function BackButton({ href, icon = "back" }: { href: string; icon?: "back" | "close" }) {
  return (
    <Link
      href={href}
      className="grid h-[38px] w-[38px] place-items-center rounded-full border border-[var(--cb-line)] bg-[var(--cb-surface-2)]"
      aria-label="뒤로"
    >
      {icon === "close" ? <X size={20} /> : <ArrowLeft size={20} />}
    </Link>
  );
}

export function InfoRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between py-1.5", strong && "text-[15px] font-black text-[var(--cb-yellow)]")}>
      <span className="text-[var(--cb-text-3)]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export function ConcertCard({ concert, href = "/rooms" }: { concert: Concert; href?: string }) {
  return (
    <Link
      href={href}
      className="flex gap-[13px] rounded-[var(--r-lg)] border border-[var(--cb-line)] bg-[var(--cb-surface-1)] p-3 shadow-[var(--sh-card)] transition hover:border-[var(--cb-line-2)]"
    >
      <div className="ph grid h-[72px] w-[72px] place-items-end rounded-[var(--r-md)] p-2 text-[9px] font-semibold tracking-[.06em] text-white/40">
        POSTER
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-[3px]">
        <h2 className="truncate text-[15px] font-bold tracking-[-.01em]">{concert.title}</h2>
        <p className="truncate text-[12.5px] text-[var(--cb-text-2)]">
          <span>{concert.artist}</span> · {concert.venue}
        </p>
        <p className="mt-[3px] flex items-center gap-1.5 text-[11.5px] text-[var(--cb-text-3)]">
          <CalendarDays size={14} /> {concert.date} · 열린 방 <b className="font-bold text-[var(--cb-yellow)]">{concert.roomCount}</b>
        </p>
      </div>
    </Link>
  );
}

export function RoomCard({
  room,
  href,
  compact = false,
  selectedTags = []
}: {
  room: Room;
  href: string;
  compact?: boolean;
  selectedTags?: string[];
}) {
  const isFull = room.currentMembers >= room.maxMembers;
  const matchCount = room.tags.filter((tag) => selectedTags.includes(tag)).length;
  const hasInterestMatch = selectedTags.length > 0;
  const matchLabel = hasInterestMatch ? `${matchCount}/${selectedTags.length} match` : `매칭률 ${room.match}%`;

  return (
    <Link href={href} className="block">
      <Card className={cn("flex flex-col gap-[11px] transition hover:border-[var(--cb-line-2)]", isFull && "opacity-50")}>
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-[9px]">
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full border bg-[var(--cb-surface-3)] text-[11px] font-bold uppercase text-[var(--cb-text-2)]",
                room.status === "host" ? "border-[var(--cb-yellow)] text-[var(--cb-yellow)] shadow-[0_0_0_1px_var(--cb-yellow-line)]" : "border-[var(--cb-line)]"
              )}
            >
              {(room.hostAvatar || room.hostNickname).slice(0, 1)}
            </span>
            <span className="truncate text-[13px] font-semibold">{room.hostNickname}</span>
          </div>
          {isFull ? (
            <span className="rounded-[var(--r-sm)] border border-[var(--cb-line-2)] bg-[var(--cb-surface-2)] px-[9px] py-1 text-[10.5px] font-bold uppercase tracking-[.04em] text-[var(--cb-text-3)]">
              정원 마감
            </span>
          ) : (
            <span
              className={cn(
                "rounded-[var(--r-sm)] border px-[9px] py-1 text-[11px] font-bold tracking-normal",
                hasInterestMatch && matchCount === selectedTags.length
                  ? "border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)]"
                  : "border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] text-[var(--cb-yellow-2)]"
              )}
            >
              {matchLabel}
            </span>
          )}
        </div>
        <h2 className={cn("font-bold leading-[1.4] tracking-[-.01em]", compact ? "text-[14px]" : "text-[15px]")}>{room.title}</h2>
        <div className="flex flex-wrap gap-1.5">
          {room.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} tone={selectedTags.includes(tag) ? "yellow" : "muted"}>
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="flex min-w-0 items-center gap-1.5 truncate text-[12px] text-[var(--cb-text-2)]">
            <MapPinIcon size={14} className="shrink-0 text-[var(--cb-text-3)]" />
            <span className="truncate">{room.meetPlace}</span>
            <span className="shrink-0 text-[var(--cb-text-3)]">·</span>
            <Clock3 size={14} className="shrink-0 text-[var(--cb-text-3)]" />
            <span className="shrink-0">{room.meetTime}</span>
          </div>
          <span className="shrink-0 rounded-[var(--r-pill)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] px-[11px] py-1 text-[11.5px] font-semibold text-[var(--cb-text-2)]">
            {room.currentMembers} / {room.maxMembers}
          </span>
        </div>
      </Card>
    </Link>
  );
}

export function MemberRow({ member }: { member: Member }) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--r-md)] bg-[var(--cb-surface-2)] p-3">
      <Avatar name={member.avatar || member.nickname} host={member.role === "host"} />
      <div className="flex-1 text-[13px] font-semibold">{member.nickname}</div>
      <Badge tone={member.role === "pending" ? "yellow" : "muted"}>
        {member.role === "host" ? "HOST" : member.role === "pending" ? "승인 대기" : "MEMBER"}
      </Badge>
    </div>
  );
}

export function TimelineBlock({ stops, detailed = false }: { stops: TimetableStop[]; detailed?: boolean }) {
  return (
    <div className="space-y-2">
      {stops.map((stop, index) => (
        <div key={stop.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--cb-yellow)] text-[12px] font-black text-[var(--cb-on-yellow)]">
              {stop.locked ? <Star size={13} fill="currentColor" /> : stop.id.replace("s", "")}
            </span>
            {index < stops.length - 1 ? <span className="h-10 w-px bg-[var(--cb-line-2)]" /> : null}
          </div>
          <div className="min-w-0 flex-1 rounded-[var(--r-md)] bg-[var(--cb-surface-2)] p-3">
            <div className="flex justify-between gap-2">
              <div className="truncate text-[13px] font-bold">{stop.place}</div>
              <div className="shrink-0 text-[11px] font-semibold text-[var(--cb-yellow)]">{stop.time}</div>
            </div>
            {detailed ? (
              <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--cb-text-3)]">
                <span>{stop.category}</span>
                <span>{stop.locked ? "공연 시간 잠김" : `${getModeLabel(stop.mode)} ${stop.transitMinutes}분`}</span>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MapFallback({ hasKey }: { hasKey: boolean }) {
  return (
    <div className="absolute inset-x-4 top-16 rounded-[var(--r-md)] border border-[var(--cb-yellow-line)] bg-[rgba(22,22,24,.88)] p-3 text-[11px] leading-5 text-[var(--cb-text-2)] backdrop-blur">
      Kakao Maps fallback · {hasKey ? "스크립트 로딩 중 또는 실패" : "NEXT_PUBLIC_KAKAO_MAP_KEY 미설정"}
    </div>
  );
}

export function MapPin({
  id,
  left,
  top,
  selected,
  onSelect
}: {
  id: number;
  left: number;
  top: number;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <button
      className={cn(
        "absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-[12px] font-black",
        selected
          ? "border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)]"
          : "border-[var(--cb-bg)] bg-[var(--cb-surface-3)]"
      )}
      style={{ left: `${left}%`, top: `${top}%` }}
      onClick={() => onSelect(id)}
      type="button"
    >
        {id === 4 ? <Star size={14} fill="currentColor" /> : id}
    </button>
  );
}

export function MapPlaceCard({ stop }: { stop: TimetableStop }) {
  return (
    <Card className="flex gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--cb-yellow)] text-[12px] font-black text-[var(--cb-on-yellow)]">
        {stop.id.replace("s", "")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold">{stop.place}</div>
        <div className="mt-1 text-[11px] text-[var(--cb-text-2)]">{stop.category} · Kakao fallback</div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--cb-text-3)]">
          <Clock3 size={13} /> {stop.time}
        </div>
      </div>
      <ChevronRight size={18} className="text-[var(--cb-text-3)]" />
    </Card>
  );
}
