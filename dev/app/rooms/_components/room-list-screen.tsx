"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppBar, Skeleton } from "@/components/ui";
import { BackButton, Badge, RoomCard } from "../../_components/buddy-patterns";
import { useConcertDetail } from "@/lib/api/concerts";
import {
  useInterestTags,
  useSaveInterestTagsMutation,
} from "@/lib/api/interest-tags";
import { getRoomTagLabel, useRoomList } from "@/lib/api/rooms";
import { cn } from "@/lib/utils";
import { formatConcertDateTime, formatConcertDday } from "@/lib/format";
import { MAX_INTEREST_TAGS, useAppStore } from "@/store/app-store";
import { TagSelectionSheet } from "./tag-selection-sheet";

const roomSortOptions = ["매칭 많은 순", "날짜순", "정원순", "시간순"] as const;

export function RoomListScreen({
  showTagModal = false,
}: {
  showTagModal?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const concertId = searchParams.get("concertId");
  const roomsHref = concertId ? `/rooms?concertId=${concertId}` : "/rooms";
  const createHref = concertId
    ? `/rooms/create?concertId=${concertId}`
    : "/rooms/create";
  const tagModalHref = concertId
    ? `/rooms?concertId=${concertId}&modal=tags`
    : "/rooms?modal=tags";

  const { data: concert } = useConcertDetail(concertId);
  const { data: interestTagsData } = useInterestTags(concertId);
  const { selectedTags, toggleTag, setSelectedTags } = useAppStore();
  const { data: roomListData, isLoading } = useRoomList(
    concertId,
    selectedTags,
  );
  const saveInterestTagsMutation = useSaveInterestTagsMutation(concertId);

  useEffect(() => {
    if (interestTagsData) {
      setSelectedTags(interestTagsData.tags);
    }
  }, [interestTagsData, setSelectedTags]);

  const roomItems = useMemo(
    () => roomListData?.items ?? [],
    [roomListData?.items],
  );
  const [activeSort, setActiveSort] =
    useState<(typeof roomSortOptions)[number]>("매칭 많은 순");
  const sortedRooms = useMemo(() => {
    const nextRooms = [...roomItems];

    if (activeSort === "날짜순" || activeSort === "시간순") {
      return nextRooms.sort((a, b) => a.meetingAt.localeCompare(b.meetingAt));
    }
    if (activeSort === "정원순") {
      return nextRooms.sort(
        (a, b) => a.maxMembers - a.memberCount - (b.maxMembers - b.memberCount),
      );
    }

    return nextRooms.sort((a, b) => b.matchCount - a.matchCount);
  }, [activeSort, roomItems]);

  const closeTagModal = useCallback(
    () => router.push(roomsHref),
    [router, roomsHref],
  );

  const handleSaveTags = useCallback(() => {
    if (!concertId) {
      router.push(roomsHref);
      return;
    }

    saveInterestTagsMutation.mutate(selectedTags, {
      onSuccess: () => {
        setSelectedTags(selectedTags);
        router.push(roomsHref);
      },
    });
  }, [
    concertId,
    roomsHref,
    router,
    saveInterestTagsMutation,
    selectedTags,
    setSelectedTags,
  ]);

  useEffect(() => {
    if (!showTagModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTagModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeTagModal, showTagModal]);

  const headerTitle = concert?.title ?? "Stadium Tour - Night 1";
  const headerVenue = concert?.venueName ?? "KSPO Dome";
  const headerDateTime = concert
    ? formatConcertDateTime(concert.startAt)
    : "2026.06.15 (월) 19:00";
  const headerDday = concert ? formatConcertDday(concert.startAt) : "D-25";

  return (
    <>
      <AppBar title={headerTitle} left={<BackButton href="/home" />} />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className={cn("ph h-[140px]", showTagModal && "blur-[2px]")}>
          {concert?.posterUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={concert.posterUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* 불투명 검정 레이어: 포스터 위 분리감 + 텍스트 가독성 */}
              <div className="absolute inset-0 bg-[rgba(8,8,9,.5)]" />
            </>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-30% to-[rgba(8,8,9,.85)]" />
          <div className="absolute bottom-6 left-4 z-[1]">
            <h1 className="text-[17px] font-bold tracking-[-.01em]">
              {headerVenue}
            </h1>
            <p className="mt-[3px] flex items-center gap-[7px] text-[12px] text-[var(--cb-text-2)]">
              {headerDateTime} ·{" "}
              <b className="font-bold text-[var(--cb-yellow)]">{headerDday}</b>
            </p>
          </div>
        </div>
        <div
          className={cn(
            "relative z-[3] mx-4 -mt-3 flex flex-col gap-2.5 rounded-[var(--r-md)] border border-[var(--cb-yellow-line)] bg-[var(--cb-surface-1)] px-3.5 py-[13px] shadow-[var(--sh-card)]",
            showTagModal && "blur-[2px]",
          )}
        >
          <div className="flex items-center justify-between text-[12.5px] font-semibold">
            <span>이 공연에서 내 관심 태그</span>
            <Link
              href={tagModalHref}
              className="flex items-center gap-1 rounded-[var(--r-sm)] text-[12px] font-semibold text-[var(--cb-yellow)] transition duration-150 hover:text-[var(--cb-yellow-2)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
            >
              편집 <Pencil size={13} />
            </Link>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.length > 0 ? (
              selectedTags.map((tag) => (
                <Badge key={tag} tone="yellow">
                  {getRoomTagLabel(tag)}
                </Badge>
              ))
            ) : (
              <p className="text-[12px] font-medium text-[var(--cb-text-3)]">
                설정해 둔 태그가 없습니다
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-1.5 pt-3.5">
          {roomSortOptions.map((option) => (
            <button
              aria-pressed={activeSort === option}
              className={cn(
                "inline-flex h-8 shrink-0 items-center rounded-[var(--r-pill)] border px-[13px] text-[12px] font-semibold transition duration-150 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]",
                activeSort === option
                  ? "border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)] hover:bg-[var(--cb-yellow-2)]"
                  : "border-[var(--cb-line)] bg-[var(--cb-surface-2)] text-[var(--cb-text-2)] hover:border-[var(--cb-line-2)] hover:bg-[var(--cb-surface-3)] hover:text-[var(--cb-text)]",
              )}
              key={option}
              onClick={() => setActiveSort(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-1.5">
          <div className="space-y-3">
            {isLoading && roomItems.length === 0
              ? [0, 1, 2].map((item) => (
                  <Skeleton key={item} className="h-[150px]" />
                ))
              : sortedRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    href={`/rooms/${room.id}?back=${encodeURIComponent(roomsHref)}`}
                    selectedTags={selectedTags}
                  />
                ))}
          </div>
        </div>
      </div>
      <Link
        href={createHref}
        className="fixed bottom-[84px] z-30 grid h-[58px] w-[58px] place-items-center rounded-full bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)] shadow-[0_12px_28px_-8px_rgba(253,190,13,.6)] transition duration-150 hover:bg-[var(--cb-yellow-2)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
        style={{ right: "max(18px, calc((100vw - 430px) / 2 + 18px))" }}
        aria-label="방 만들기"
      >
        <Plus size={26} strokeWidth={2.4} />
      </Link>
      {showTagModal ? (
        <InterestTagModal
          closeTagModal={closeTagModal}
          selectedTags={selectedTags}
          toggleTag={toggleTag}
          roomsHref={roomsHref}
          onSave={handleSaveTags}
          isSaving={saveInterestTagsMutation.isPending}
        />
      ) : null}
    </>
  );
}

function InterestTagModal({
  closeTagModal,
  selectedTags,
  toggleTag,
  roomsHref,
  onSave,
  isSaving,
}: {
  closeTagModal: () => void;
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  roomsHref: string;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <TagSelectionSheet
      title="관심 태그 선택"
      description={`최대 ${MAX_INTEREST_TAGS}개까지 선택 · 사전 정의된 태그에서 골라요`}
      selectedTags={selectedTags}
      maxTags={MAX_INTEREST_TAGS}
      onToggle={toggleTag}
      onDismiss={closeTagModal}
      actions={
        <>
          <Link
            className="inline-flex h-[50px] items-center justify-center rounded-[var(--r-md)] border border-[var(--cb-line-2)] bg-[var(--cb-surface-2)] text-[14px] font-bold text-[var(--cb-text)] transition duration-150 hover:bg-[var(--cb-surface-3)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
            href={roomsHref}
          >
            취소
          </Link>
          <button
            className="inline-flex h-[50px] items-center justify-center rounded-[var(--r-md)] border border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[14px] font-bold text-[var(--cb-on-yellow)] shadow-[var(--sh-glow)] transition duration-150 hover:bg-[var(--cb-yellow-2)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={onSave}
            type="button"
          >
            저장 ({selectedTags.length}/{MAX_INTEREST_TAGS})
          </button>
        </>
      }
    />
  );
}
