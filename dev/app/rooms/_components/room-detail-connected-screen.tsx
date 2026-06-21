"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  Clock3,
  Lock,
  MapPin,
  Tag,
  Users,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale/ko";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppBar, Avatar, Button, Card, Input, Modal, Skeleton } from "@/components/ui";
import { BackButton, Badge } from "../../_components/buddy-patterns";
import { buildProfileMeta } from "../../profile/_lib/profile-display";
import type { AgeRange, Gender } from "@/lib/auth/profile";
import {
  getRoomTagLabel,
  useRoomDetail,
  type RoomDetail,
  type RoomMember,
  type SchedulePreviewSlot,
} from "@/lib/api/rooms";
import { useConcertDetail } from "@/lib/api/concerts";
import {
  useApplyToRoomMutation,
  useApproveJoinRequestMutation,
  useJoinRequests,
  useMyJoinRequest,
  useRejectJoinRequestMutation,
  type JoinRequestItem,
} from "@/lib/api/join-requests";
import { formatConcertDday, formatRoomMeetingTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type ViewerMode = "host" | "member" | "pending" | "visitor";

// Backend-driven role: ROOM-003 returns viewerRole + viewerJoinStatus, and the four
// CB-07 wireframe states collapse onto them — HOST / MEMBER are direct, while VISITOR
// splits into "pending" (an outstanding request) vs. "visitor" (can still apply).
function deriveMode(viewerRole: string, viewerJoinStatus: string): ViewerMode {
  if (viewerRole === "HOST") return "host";
  if (viewerRole === "MEMBER") return "member";
  if (viewerJoinStatus === "PENDING") return "pending";
  return "visitor";
}

// 한 번 신청(또는 참여)했던 방에는 재신청할 수 없다 — JOIN-001이 409(JOIN01,
// "이미 신청했거나 참여 중인 방입니다")로 차단한다. 거절(REJECTED)당한 방도 마찬가지라
// ROOM-003은 canRequestJoin=false를 내려준다. 따라서 신청 가능 여부는 백엔드 플래그를
// 그대로 신뢰하고, REJECTED는 "신청했던 방"으로 표시하며 CTA를 비활성화한다.

export function RoomDetailConnectedScreen({
  roomId,
  showApplyModal = false,
  backHref,
}: {
  roomId: string;
  showApplyModal?: boolean;
  backHref?: string;
}) {
  const detailHref = `/rooms/${roomId}`;
  const { data: room, isLoading, isError } = useRoomDetail(roomId);
  // Hybrid back target: explicit entry-link context wins; otherwise derive the room's
  // concert list from the response; last resort is the unfiltered list.
  const resolvedBackHref =
    backHref ??
    (room ? `/rooms?concertId=${room.concert.id}` : "/rooms");

  // ROOM-003 carries no poster, but it does return concert.id — so reuse the already
  // connected CONCERT-002 read (no mock) to pull the same posterUrl CB-04's header shows.
  // Called before the early returns to keep hook order stable; `enabled` gates on the id.
  const { data: concertDetail } = useConcertDetail(
    room?.concert.id != null ? String(room.concert.id) : null,
  );

  const [notice, setNotice] = useState<{ id: number; message: string } | null>(
    null,
  );
  const noticeIdRef = useRef(0);
  const showNotice = useCallback((message: string) => {
    noticeIdRef.current += 1;
    setNotice({ id: noticeIdRef.current, message });
  }, []);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 1600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (isLoading) {
    return (
      <>
        <AppBar title="방 상세" left={<BackButton href={resolvedBackHref} />} />
        <div className="flex flex-col gap-3 p-4" aria-hidden>
          <Skeleton className="h-[130px] w-full rounded-[var(--r-lg)]" />
          <Skeleton className="h-[88px] w-full rounded-[var(--r-md)]" />
          <Skeleton className="h-[160px] w-full rounded-[var(--r-md)]" />
        </div>
      </>
    );
  }

  if (isError || !room) {
    return (
      <>
        <AppBar title="방 상세" left={<BackButton href={resolvedBackHref} />} />
        <Card className="mx-4 mt-6 p-5 text-center">
          <p className="text-[13px] text-[var(--cb-text-2)]">
            방 정보를 불러오지 못했습니다.
          </p>
        </Card>
      </>
    );
  }

  const mode = deriveMode(room.viewerRole, room.viewerJoinStatus);

  return (
    <>
      <AppBar title="방 상세" left={<BackButton href={resolvedBackHref} />} />
      {notice ? <RoomToast key={notice.id} message={notice.message} /> : null}
      <div className="min-h-0 flex-1 overflow-y-auto pb-5">
        <RoomDetailHero
          room={room}
          mode={mode}
          posterUrl={concertDetail?.posterUrl ?? null}
        />
        <RoomStateStrip room={room} mode={mode} />
        <RoomInfo room={room} mode={mode} />
        <SchedulePreview slots={room.schedulePreview} />
        {room.permissions.canApproveJoinRequest ? (
          <ApplicantSection
            roomId={roomId}
            pendingRequestCount={room.pendingRequestCount}
            onNotice={showNotice}
          />
        ) : null}
        <MemberSection room={room} mode={mode} />
        {mode === "pending" ? <PendingMessage roomId={roomId} /> : null}
      </div>
      <RoomBottomCta room={room} mode={mode} detailHref={detailHref} />
      {showApplyModal && room.permissions.canRequestJoin ? (
        <ApplyModal
          roomId={roomId}
          detailHref={detailHref}
          onNotice={showNotice}
        />
      ) : null}
    </>
  );
}

function memberMeta(person: { ageRange: AgeRange; gender: Gender }) {
  return buildProfileMeta(person.ageRange, person.gender);
}

function rolePillClass(mode: ViewerMode) {
  if (mode === "host")
    return "border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)]";
  if (mode === "member")
    return "border-[var(--cb-yellow-line)] bg-[rgba(20,20,22,.72)] text-[var(--cb-yellow-2)]";
  return "border-[var(--cb-line-2)] border-dashed bg-[rgba(20,20,22,.72)] text-[var(--cb-text-2)]";
}

function RoomDetailHero({
  room,
  mode,
  posterUrl,
}: {
  room: RoomDetail;
  mode: ViewerMode;
  posterUrl: string | null;
}) {
  return (
    <section className="rd-banner relative h-[130px] shrink-0 overflow-hidden">
      <div className="ph h-full w-full" />
      {posterUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={posterUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* 불투명 검정 레이어: 포스터 위 분리감 + 텍스트 가독성 */}
          <div className="absolute inset-0 bg-[rgba(8,8,9,.5)]" />
        </>
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent from-25% to-[rgba(8,8,9,.9)]" />
      {mode !== "visitor" ? (
        <span
          className={cn(
            "absolute right-3.5 top-3.5 z-[1] rounded-[var(--r-pill)] border px-3 py-1 text-[10.5px] font-extrabold tracking-[.05em] backdrop-blur",
            rolePillClass(mode),
          )}
        >
          {mode === "host" ? "HOST" : mode === "member" ? "MEMBER" : "PENDING"}
        </span>
      ) : null}
      <div className="absolute bottom-3.5 left-4 z-[1]">
        <div className="text-[15px] font-bold">{room.concert.venueName}</div>
        <div className="mt-[3px] text-[11.5px] text-[var(--cb-text-2)]">
          {room.concert.title} ·{" "}
          <b className="font-bold text-[var(--cb-yellow)]">
            {formatConcertDday(room.concert.startAt)}
          </b>
        </div>
      </div>
    </section>
  );
}

function RoomStateStrip({ room, mode }: { room: RoomDetail; mode: ViewerMode }) {
  const stateText = {
    host: `내 역할: 방장 · 멤버 ${room.memberCount} / ${room.maxMembers}`,
    member: `참여 확정 · 멤버 ${room.memberCount} / ${room.maxMembers}`,
    pending: "승인 대기 중",
    visitor:
      room.viewerJoinStatus === "REJECTED"
        ? `신청이 거절된 방 · 멤버 ${room.memberCount} / ${room.maxMembers}`
        : `공개 방 · 멤버 ${room.memberCount} / ${room.maxMembers}`,
  }[mode];
  const rightText = {
    host: `승인 대기 ${room.pendingRequestCount}건`,
    member: "승인됨",
    pending: "취소 가능",
    visitor:
      room.viewerJoinStatus === "REJECTED"
        ? "신청했던 방"
        : room.permissions.canRequestJoin
          ? "신청 가능"
          : "신청 불가",
  }[mode];

  return (
    <div className="state-strip flex shrink-0 items-center justify-between border-b border-[var(--cb-line)] bg-[var(--cb-surface-1)] px-4 py-3 text-[12.5px]">
      <div className="flex min-w-0 items-center gap-[9px] font-semibold">
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full bg-[var(--cb-yellow)]",
            mode === "pending" &&
              "border border-dashed border-[var(--cb-yellow)] bg-transparent",
            mode === "visitor" && "bg-[var(--cb-text-3)]",
          )}
        />
        <span className="truncate">{stateText}</span>
      </div>
      <div className="shrink-0 text-[11.5px] font-medium text-[var(--cb-text-3)]">
        {rightText}
      </div>
    </div>
  );
}

function RoomInfo({ room, mode }: { room: RoomDetail; mode: ViewerMode }) {
  const tagTone = mode === "visitor" ? "muted" : "yellow";
  const host = room.members.find((member) => member.role === "HOST");

  return (
    <section className="room-info px-4 py-4">
      <h1 className="text-[18px] font-extrabold leading-[1.35] tracking-[-.02em] text-balance">
        {room.title}
      </h1>
      {room.description ? (
        <p className="mt-[7px] text-[13px] leading-[1.6] text-[var(--cb-text-2)]">
          {room.description}
        </p>
      ) : null}
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-[11px] text-[12.5px]">
        <RoomInfoKey icon={<MapPin size={13} />}>집합</RoomInfoKey>
        <dd className="font-semibold">
          {room.meetingPlaceName} · {formatRoomMeetingTime(room.meetingAt)}
        </dd>
        <RoomInfoKey icon={<CalendarDays size={13} />}>공연</RoomInfoKey>
        <dd className="font-semibold">{room.concert.title}</dd>
        <RoomInfoKey icon={<Tag size={13} />}>방 태그</RoomInfoKey>
        <dd className="flex flex-wrap gap-1.5">
          {room.roomTags.map((tag) => (
            <Badge key={tag} tone={tagTone}>
              {getRoomTagLabel(tag)}
            </Badge>
          ))}
        </dd>
        {mode !== "host" && host ? (
          <>
            <RoomInfoKey icon={<Users size={13} />}>방장</RoomInfoKey>
            <dd className="font-semibold">{host.nickname}</dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}

function RoomInfoKey({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <dt className="flex items-center gap-1.5 text-[var(--cb-text-3)]">
      {icon}
      {children}
    </dt>
  );
}

function SchedulePreview({ slots }: { slots: SchedulePreviewSlot[] }) {
  if (slots.length === 0) return null;

  const ordered = [...slots].sort((a, b) => a.order - b.order);

  return (
    <section aria-labelledby="room-schedule-preview">
      <h2
        id="room-schedule-preview"
        className="mx-4 mb-3 mt-1 text-[15px] font-bold"
      >
        간단한 일정 미리보기
      </h2>
      <div className="sched mx-4 overflow-hidden rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-1)]">
        {ordered.map((slot, index) => (
          <div
            key={slot.slotId}
            className={cn(
              "flex items-center gap-3 border-b border-[var(--cb-line)] px-3.5 py-3 text-[13px] last:border-b-0",
              slot.locked && "bg-[var(--cb-yellow-dim)]",
            )}
          >
            <span
              className={cn(
                "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border border-[var(--cb-text-3)] text-[11px] font-bold text-[var(--cb-text-2)]",
                slot.locked &&
                  "border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)]",
              )}
            >
              {slot.locked ? <Lock size={12} /> : index + 1}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                slot.locked && "font-bold text-[var(--cb-yellow-2)]",
              )}
            >
              {slot.title}
            </span>
            <span className="shrink-0 text-[11.5px] font-semibold text-[var(--cb-text-3)]">
              {formatRoomMeetingTime(slot.startAt)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

type ApplicantDecision = {
  type: "approve" | "reject";
  applicant: JoinRequestItem;
};

function ApplicantSection({
  roomId,
  pendingRequestCount,
  onNotice,
}: {
  roomId: string;
  pendingRequestCount: number;
  onNotice: (message: string) => void;
}) {
  const { data, isLoading } = useJoinRequests(roomId, true);
  const approveMutation = useApproveJoinRequestMutation(roomId);
  const rejectMutation = useRejectJoinRequestMutation(roomId);
  const [pendingDecision, setPendingDecision] =
    useState<ApplicantDecision | null>(null);
  const [tagApplicant, setTagApplicant] = useState<JoinRequestItem | null>(
    null,
  );

  const applicants = data?.items ?? [];
  const count = data?.items.length ?? pendingRequestCount;

  const confirmDecision = useCallback(() => {
    if (!pendingDecision) return;
    const { type, applicant } = pendingDecision;
    const mutation = type === "approve" ? approveMutation : rejectMutation;
    mutation.mutate(applicant.requestId, {
      onSuccess: () => {
        onNotice(
          type === "approve"
            ? `${applicant.nickname} 님을 멤버로 추가했어요`
            : `${applicant.nickname} 님의 신청을 삭제했어요`,
        );
        setPendingDecision(null);
      },
      onError: () => {
        onNotice("요청을 처리하지 못했어요");
        setPendingDecision(null);
      },
    });
  }, [approveMutation, onNotice, pendingDecision, rejectMutation]);

  return (
    <>
      <section className="members mt-[18px] px-4" aria-labelledby="room-applicants">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 id="room-applicants" className="text-[14px] font-bold">
            승인 대기 {count}
          </h2>
          <span className="text-[11px] text-[var(--cb-text-3)]">방장만 보임</span>
        </div>
        <div className="rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-1)] px-3.5">
          {isLoading ? (
            <p className="py-4 text-center text-[12px] text-[var(--cb-text-3)]">
              신청자를 불러오는 중…
            </p>
          ) : applicants.length > 0 ? (
            applicants.map((applicant) => (
              <ApplicantRow
                key={applicant.requestId}
                applicant={applicant}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                onApprove={() =>
                  setPendingDecision({ type: "approve", applicant })
                }
                onReject={() =>
                  setPendingDecision({ type: "reject", applicant })
                }
                onShowTags={() => setTagApplicant(applicant)}
              />
            ))
          ) : (
            <p className="py-4 text-center text-[12px] text-[var(--cb-text-3)]">
              대기 중인 신청자가 없습니다.
            </p>
          )}
        </div>
      </section>
      {tagApplicant ? (
        <ApplicantTagsModal
          applicant={tagApplicant}
          onClose={() => setTagApplicant(null)}
        />
      ) : null}
      {pendingDecision ? (
        <ApplicantDecisionModal
          decision={pendingDecision}
          pending={approveMutation.isPending || rejectMutation.isPending}
          onCancel={() => setPendingDecision(null)}
          onConfirm={confirmDecision}
        />
      ) : null}
    </>
  );
}

function ApplicantRow({
  applicant,
  disabled,
  onApprove,
  onReject,
  onShowTags,
}: {
  applicant: JoinRequestItem;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
  onShowTags: () => void;
}) {
  const visibleTags = applicant.matchedTags.slice(0, 2);
  const hiddenTagCount = applicant.matchedTags.length - visibleTags.length;
  const appliedAgo = formatDistanceToNow(new Date(applicant.createdAt), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <div className="flex items-start gap-[11px] border-b border-[var(--cb-line)] py-[13px] last:border-b-0">
      <Avatar name={applicant.nickname} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[13px] font-bold">{applicant.nickname}</span>
            <span className="ml-1.5 rounded-[var(--r-pill)] border border-[var(--cb-line)] px-1.5 py-px text-[10px] font-semibold text-[var(--cb-text-3)]">
              {memberMeta(applicant)}
            </span>
          </div>
          <span className="shrink-0 text-[10.5px] text-[var(--cb-text-3)]">
            {appliedAgo}
          </span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-[1.5] text-[var(--cb-text-2)]">
          &quot;{applicant.message}&quot;
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {visibleTags.map((tag) => (
            <Badge key={tag} tone="yellow">
              {getRoomTagLabel(tag)}
            </Badge>
          ))}
          {hiddenTagCount > 0 ? (
            <button
              aria-label={`${applicant.nickname} 신청 태그 전체 보기`}
              className="inline-flex items-center gap-1 rounded-[var(--r-pill)] border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] px-2.5 py-1 text-[11px] font-semibold text-[var(--cb-yellow-2)] transition hover:border-[var(--cb-yellow)] hover:bg-[rgba(253,190,13,.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cb-yellow-line)] active:scale-[0.96]"
              type="button"
              onClick={onShowTags}
            >
              +{hiddenTagCount}
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button
          aria-label={`${applicant.nickname} 거절`}
          disabled={disabled}
          className="grid h-9 w-9 place-items-center rounded-full border border-[var(--cb-line-2)] bg-[var(--cb-surface-2)] text-[var(--cb-text-2)] transition duration-150 hover:bg-[rgba(255,107,91,.13)] hover:text-[var(--cb-danger)] active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)] disabled:opacity-50"
          type="button"
          onClick={onReject}
        >
          <X size={16} strokeWidth={2.4} />
        </button>
        <button
          aria-label={`${applicant.nickname} 승인`}
          disabled={disabled}
          className="grid h-9 w-9 place-items-center rounded-full border border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)] transition duration-150 hover:bg-[var(--cb-yellow-2)] active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)] disabled:opacity-50"
          type="button"
          onClick={onApprove}
        >
          <Check size={16} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

function ApplicantTagsModal({
  applicant,
  onClose,
}: {
  applicant: JoinRequestItem;
  onClose: () => void;
}) {
  return (
    <Modal
      title={`${applicant.nickname}님의 신청 태그`}
      position="center"
      onClose={onClose}
    >
      <div className="flex flex-wrap gap-1.5 rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] p-3">
        {applicant.matchedTags.map((tag) => (
          <Badge key={tag} tone="yellow">
            {getRoomTagLabel(tag)}
          </Badge>
        ))}
      </div>
    </Modal>
  );
}

function ApplicantDecisionModal({
  decision,
  pending,
  onCancel,
  onConfirm,
}: {
  decision: ApplicantDecision;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isApprove = decision.type === "approve";
  const title = isApprove ? "멤버 승인 확인" : "신청 거절 확인";
  const actionLabel = isApprove ? "승인하기" : "거절하기";

  return (
    <Modal title={title} position="center" onClose={onCancel}>
      <p className="text-[13px] leading-[1.6] text-[var(--cb-text-2)]">
        <b className="font-bold text-[var(--cb-text)]">
          {decision.applicant.nickname}
        </b>
        {isApprove
          ? " 님을 이 방 멤버로 승인할까요?"
          : " 님의 입장 신청을 거절할까요?"}
      </p>
      <p className="mt-2 rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] p-3 text-[12px] leading-5 text-[var(--cb-text-3)]">
        &quot;{decision.applicant.message}&quot;
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" type="button" onClick={onCancel}>
          취소
        </Button>
        <Button
          variant={isApprove ? "primary" : "danger"}
          type="button"
          disabled={pending}
          onClick={onConfirm}
        >
          {actionLabel}
        </Button>
      </div>
    </Modal>
  );
}

function MemberSection({ room, mode }: { room: RoomDetail; mode: ViewerMode }) {
  const seatsLeft = Math.max(0, room.maxMembers - room.memberCount);
  const compact = mode === "visitor" || mode === "pending";
  const title =
    mode === "visitor"
      ? `멤버 ${room.memberCount} / ${room.maxMembers} · 자리 ${seatsLeft} 남음`
      : `참여 멤버 ${room.memberCount}`;
  const maxShared = room.members.reduce(
    (max, member) => Math.max(max, member.sharedInterestCount),
    0,
  );
  const description = compact
    ? mode === "pending"
      ? "신청자에게 닉네임만 공개"
      : "공개 요약만 표시"
    : `공통 관심 ${maxShared}개`;

  return (
    <section className="members mt-[18px] px-4" aria-labelledby="room-members">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 id="room-members" className="text-[14px] font-bold">
          {title}
        </h2>
        <span className="text-[11px] text-[var(--cb-text-3)]">{description}</span>
      </div>
      <div className="rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-1)] px-3.5">
        {room.members.map((member) => (
          <RoomMemberRow key={member.userId} member={member} compact={compact} />
        ))}
      </div>
    </section>
  );
}

function RoomMemberRow({
  member,
  compact,
}: {
  member: RoomMember;
  compact: boolean;
}) {
  return (
    <div className="flex items-center gap-[11px] border-b border-[var(--cb-line)] py-[13px] last:border-b-0">
      <Avatar name={member.nickname} host={member.role === "HOST"} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13px] font-bold">
            {member.nickname}
          </span>
          {!compact ? (
            <span className="shrink-0 rounded-[var(--r-pill)] border border-[var(--cb-line)] px-1.5 py-px text-[10px] font-semibold text-[var(--cb-text-3)]">
              {memberMeta(member)}
            </span>
          ) : null}
        </div>
        {!compact ? (
          <div className="mt-1 text-[11.5px] text-[var(--cb-text-3)]">
            공통 관심 {member.sharedInterestCount}개
          </div>
        ) : null}
      </div>
      <span className="shrink-0 text-[11px] font-semibold text-[var(--cb-text-3)]">
        {member.role === "HOST" ? "방장" : "멤버"}
      </span>
    </div>
  );
}

function PendingMessage({ roomId }: { roomId: string }) {
  const { data } = useMyJoinRequest(roomId, true);
  if (!data?.message) return null;

  return (
    <section className="px-4 pt-[18px]">
      <div className="rounded-[var(--r-md)] border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] p-3.5">
        <div className="text-[11px] font-bold uppercase tracking-[.06em] text-[var(--cb-text-3)]">
          내 신청 메시지
        </div>
        <p className="mt-1.5 text-[13px] leading-[1.55] text-[var(--cb-text-2)]">
          &quot;{data.message}&quot;
        </p>
      </div>
    </section>
  );
}

function RoomBottomCta({
  room,
  mode,
  detailHref,
}: {
  room: RoomDetail;
  mode: ViewerMode;
  detailHref: string;
}) {
  if (mode === "pending") {
    return (
      <div className="sticky bottom-0 z-20 shrink-0 border-t border-[var(--cb-line)] bg-[linear-gradient(transparent,var(--cb-bg)_22%)] p-4">
        <Button disabled type="button">
          방장의 승인을 기다리는 중이에요
        </Button>
        <p className="mt-[9px] text-center text-[11px] text-[var(--cb-text-3)]">
          승인되면 알림으로 알려드려요 · Timeline 진입 불가
        </p>
      </div>
    );
  }

  if (mode === "visitor") {
    // 신청 가능 여부는 백엔드 canRequestJoin을 신뢰한다. false면 navigable Link 대신
    // 진짜 disabled <button>을 렌더한다 — Button asChild는 Slot으로 <a>를 그리는데
    // <a>는 disabled가 무효라, 그대로 두면 ?modal=apply로만 이동하고 모달은 게이트에
    // 막혀 안 뜨는 죽은 상태가 된다.
    const canApply = room.permissions.canRequestJoin;
    const isRejected = room.viewerJoinStatus === "REJECTED";
    return (
      <div className="sticky bottom-0 z-20 shrink-0 border-t border-[var(--cb-line)] bg-[linear-gradient(transparent,var(--cb-bg)_22%)] p-4">
        {canApply ? (
          <Button asChild>
            <Link href={`${detailHref}?modal=apply`}>입장 신청</Link>
          </Button>
        ) : (
          <Button disabled type="button">
            {isRejected ? "이미 신청했던 방이에요" : "입장 신청"}
          </Button>
        )}
        <p className="mt-[9px] text-center text-[11px] text-[var(--cb-text-3)]">
          {canApply
            ? "신청 메시지 한 줄 작성 모달이 열려요"
            : isRejected
              ? "한 번 신청한 방에는 다시 신청할 수 없어요"
              : "지금은 입장 신청을 할 수 없어요"}
        </p>
      </div>
    );
  }

  // host / member
  return (
    <div className="sticky bottom-0 z-20 shrink-0 border-t border-[var(--cb-line)] bg-[linear-gradient(transparent,var(--cb-bg)_22%)] p-4">
      <Button asChild disabled={!room.permissions.canOpenTimeline}>
        <Link href="/timeline">
          <Clock3 size={18} />
          Open Timeline
        </Link>
      </Button>
      <p className="mt-[9px] text-center text-[11px] text-[var(--cb-text-3)]">
        {mode === "host"
          ? "방장은 항상 일정 화면에 진입 가능"
          : "승인 멤버는 일정 화면에 진입 가능"}
      </p>
    </div>
  );
}

function ApplyModal({
  roomId,
  detailHref,
  onNotice,
}: {
  roomId: string;
  detailHref: string;
  onNotice: (message: string) => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const length = Array.from(message).length;
  const applyMutation = useApplyToRoomMutation(roomId);

  const submit = useCallback(() => {
    applyMutation.mutate(
      { message: message.trim() ? message.trim() : null },
      {
        onSuccess: () => {
          onNotice("입장 신청을 보냈어요");
          router.push(detailHref);
        },
        onError: () => onNotice("신청을 보내지 못했어요"),
      },
    );
  }, [applyMutation, detailHref, message, onNotice, router]);

  return (
    <Modal title="입장 신청 메시지" onClose={() => undefined}>
      <Input
        label="신청 메시지"
        multiline
        maxLength={60}
        placeholder="방장에게 보낼 한 줄 메시지"
        value={message}
        onChange={(event) =>
          setMessage(
            Array.from(event.currentTarget.value).slice(0, 60).join(""),
          )
        }
      />
      <div className="mt-1 flex justify-between text-[11px] text-[var(--cb-text-3)]">
        <span>최대 60자</span>
        <span>{length} / 60</span>
      </div>
      <p className="mt-3 rounded-[var(--r-md)] border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] p-3 text-[12px] leading-5 text-[var(--cb-yellow-2)]">
        닉네임 · 연령대 · 성별이 함께 전달돼요. 승인되기 전까지는 오픈채팅에 입장할 수 없어요.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button asChild variant="outline">
          <Link href={detailHref}>취소</Link>
        </Button>
        <Button type="button" disabled={applyMutation.isPending} onClick={submit}>
          신청하기
        </Button>
      </div>
    </Modal>
  );
}

function RoomToast({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="profile-toast pointer-events-none fixed bottom-[76px] left-1/2 z-50 w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2 rounded-[var(--r-md)] border border-[var(--cb-yellow-line)] bg-[rgba(22,22,24,.96)] px-3.5 py-3 text-[12px] font-semibold text-[var(--cb-yellow-2)] shadow-[var(--sh-pop)] backdrop-blur"
    >
      {message}
    </div>
  );
}
