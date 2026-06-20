"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Info } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppBar, Button, Input } from "@/components/ui";
import { BackButton, Badge } from "../../../_components/buddy-patterns";
import { useConcertDetail } from "@/lib/api/concerts";
import {
  getRoomTagLabel,
  useCreateRoomMutation,
  type RoomPlace,
  type RoomTag,
} from "@/lib/api/rooms";
import { cn } from "@/lib/utils";
import { TagSelectionSheet } from "../../_components/tag-selection-sheet";
import { roomSchema } from "../_lib/room-schema";
import { MeetingPlacePicker } from "./meeting-place-picker";

const CREATE_ROOM_MAX_TAGS = 4;

// datetime-local ("2026-06-15T14:00") -> ISO-8601 with KST offset.
function toMeetingAtIso(value: string): string {
  return `${value}:00+09:00`;
}

export function CreateRoomScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const concertId = searchParams.get("concertId");
  const roomsHref = concertId ? `/rooms?concertId=${concertId}` : "/rooms";

  const { data: concert } = useConcertDetail(concertId);
  const mutation = useCreateRoomMutation();

  const [selected, setSelected] = useState<string[]>([]);
  const [maxMembers, setMaxMembers] = useState(4);
  const [meetingPlace, setMeetingPlace] = useState<RoomPlace | null>(null);
  const [showTagModal, setShowTagModal] = useState(false);
  const meetTimeInputRef = useRef<HTMLInputElement | null>(null);

  const eventPlace = useMemo<RoomPlace | null>(
    () =>
      concert
        ? {
            name: concert.venueName,
            // ConcertDetail has no street address; use the region (area) as the
            // BE-required address, falling back to the venue name.
            address: concert.area ?? concert.venueName,
            lat: concert.lat,
            lng: concert.lng,
            provider: "CONCERT",
          }
        : null,
    [concert],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<z.infer<typeof roomSchema>>({
    resolver: zodResolver(roomSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      intro: "",
      meetTime: "",
      openChatUrl: "",
      openChatPassword: "",
    },
  });
  const meetTimeField = register("meetTime");
  const closeTagModal = useCallback(() => setShowTagModal(false), []);
  const openMeetTimePicker = useCallback(() => {
    const input = meetTimeInputRef.current;
    if (typeof input?.showPicker !== "function") return;

    try {
      input.showPicker();
    } catch {
      // Some browsers throw when native picker access is unavailable.
    }
  }, []);
  const handleMeetTimePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      event.preventDefault();
      openMeetTimePicker();
    },
    [openMeetTimePicker],
  );
  const toggleRoomTag = useCallback((tag: string) => {
    setSelected((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag);
      if (current.length >= CREATE_ROOM_MAX_TAGS) return current;
      return [...current, tag];
    });
  }, []);

  const canSubmit =
    isValid &&
    selected.length > 0 &&
    Boolean(concertId) &&
    Boolean(eventPlace) &&
    Boolean(meetingPlace) &&
    !mutation.isPending;

  const onSubmit = handleSubmit((values) => {
    if (!concertId || !eventPlace || !meetingPlace) return;

    mutation.mutate(
      {
        concertId: Number(concertId),
        title: values.title,
        description: values.intro.trim() ? values.intro : null,
        maxMembers,
        roomTags: selected as RoomTag[],
        meetingAt: toMeetingAtIso(values.meetTime),
        meetingPlace,
        eventPlace,
        openChatUrl: values.openChatUrl,
        openChatPassword: values.openChatPassword?.trim()
          ? values.openChatPassword
          : null,
      },
      {
        onSuccess: () => router.push(roomsHref),
      },
    );
  });

  return (
    <>
      <AppBar
        title="방 만들기"
        left={<BackButton href={roomsHref} icon="close" />}
        right={<span className="w-[38px]" />}
      />
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
        <div className="mx-4 mt-3 flex shrink-0 items-start gap-2.5 rounded-[var(--r-md)] border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] px-3.5 py-3 text-[12px] leading-[1.5] text-[var(--cb-yellow-2)]">
          <Info className="mt-px shrink-0 text-[var(--cb-yellow)]" size={17} />
          <div>
            이 방은{" "}
            <b className="font-bold text-[var(--cb-yellow)]">방장 승인</b>으로
            입장이 결정돼요. 선착순이 아니에요.
          </div>
        </div>
        {!concertId ? (
          <div className="mx-4 mt-3 flex shrink-0 items-start gap-2.5 rounded-[var(--r-md)] border border-[rgba(255,107,91,.35)] bg-[rgba(255,107,91,.14)] px-3.5 py-3 text-[12px] leading-[1.5] text-[var(--cb-danger)]">
            연결된 공연이 없어요. 공연 목록에서 방 만들기를 다시 시작해 주세요.
          </div>
        ) : null}
        <div className="body-scroll flex flex-col gap-4 !pb-28 !pt-[6px]">
          <CreateRoomField label="공연">
            <DisabledFormInput
              label="공연"
              value={concert?.title ?? "공연 정보를 불러오는 중…"}
            />
          </CreateRoomField>
          <Input
            label="방 제목"
            placeholder="어떤 동행을 찾는지 적어 주세요"
            error={errors.title?.message}
            {...register("title")}
          />
          <Input
            label="한 줄 소개"
            multiline
            placeholder="동행 스타일이나 준비물을 적어 주세요"
            error={errors.intro?.message}
            {...register("intro")}
          />
          <CreateRoomField label="방 태그" optional="(최대 4개)">
            <div className="flex flex-wrap gap-1.5">
              {selected.map((tag) => (
                <Badge key={tag} tone="yellow">
                  {getRoomTagLabel(tag)}
                </Badge>
              ))}
              <button
                aria-label="태그 추가"
                className="inline-flex items-center gap-1 rounded-[var(--r-pill)] border border-dashed border-[var(--cb-line-2)] bg-transparent px-2.5 py-1 text-[11px] font-semibold text-[var(--cb-text-2)] transition duration-150 hover:border-[var(--cb-yellow-line)] hover:bg-[var(--cb-yellow-dim)] hover:text-[var(--cb-yellow-2)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
                onClick={() => setShowTagModal(true)}
                type="button"
              >
                + 추가
              </button>
            </div>
          </CreateRoomField>
          <CreateRoomField label="최대 인원">
            <div className="relative">
              <select
                aria-label="최대 인원"
                className="min-h-[48px] w-full appearance-none rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] px-3.5 pr-9 text-sm text-[var(--cb-text)] outline-none transition duration-150 hover:border-[var(--cb-line-2)] focus:border-[var(--cb-yellow-line)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
                onChange={(event) => setMaxMembers(Number(event.target.value))}
                value={maxMembers}
              >
                {[2, 3, 4, 5, 6, 7, 8].map((count) => (
                  <option key={count} value={count}>
                    {count}명
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--cb-text-3)]"
                size={15}
              />
            </div>
          </CreateRoomField>
          <CreateRoomField
            label="행사 장소 (공연장)"
            hint="일정 역산과 도착 버퍼 30분의 기준점"
          >
            <DisabledFormInput
              label="행사 장소 (공연장)"
              value={concert?.venueName ?? "공연 정보를 불러오는 중…"}
            />
          </CreateRoomField>
          <CreateRoomField label="집합 장소">
            <MeetingPlacePicker
              value={meetingPlace}
              onChange={setMeetingPlace}
              center={
                concert ? { lat: concert.lat, lng: concert.lng } : null
              }
            />
          </CreateRoomField>
          <Input
            label="집합 시간"
            type="datetime-local"
            className="cursor-pointer select-none caret-transparent focus:border-[var(--cb-line)]"
            error={errors.meetTime?.message}
            {...meetTimeField}
            onPointerDown={handleMeetTimePointerDown}
            ref={(element) => {
              meetTimeField.ref(element);
              meetTimeInputRef.current = element as HTMLInputElement | null;
            }}
          />
          <Input
            label="오픈채팅 URL (승인 후 공개)"
            placeholder="https://open.kakao.com/..."
            error={errors.openChatUrl?.message}
            {...register("openChatUrl")}
          />
          <Input
            label="오픈채팅 비밀번호 (선택)"
            placeholder="4 ~ 8자리 숫자/문자"
            {...register("openChatPassword")}
          />
        </div>
        <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-[var(--cb-line)] bg-[rgba(14,14,16,.94)] p-4 pb-[calc(16px+env(safe-area-inset-bottom))] backdrop-blur">
          <Button disabled={!canSubmit}>
            {mutation.isPending ? "저장 중" : "방 만들기"}
          </Button>
        </div>
        {showTagModal ? (
          <TagSelectionSheet
            title="방 태그 선택"
            description={`최대 ${CREATE_ROOM_MAX_TAGS}개까지 선택 · 사전 정의된 태그에서 골라요`}
            selectedTags={selected}
            maxTags={CREATE_ROOM_MAX_TAGS}
            onToggle={toggleRoomTag}
            onDismiss={closeTagModal}
            actions={
              <>
                <button
                  className="inline-flex h-[50px] items-center justify-center rounded-[var(--r-md)] border border-[var(--cb-line-2)] bg-[var(--cb-surface-2)] text-[14px] font-bold text-[var(--cb-text)] transition duration-150 hover:bg-[var(--cb-surface-3)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
                  onClick={closeTagModal}
                  type="button"
                >
                  취소
                </button>
                <button
                  className="inline-flex h-[50px] items-center justify-center rounded-[var(--r-md)] border border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[14px] font-bold text-[var(--cb-on-yellow)] shadow-[var(--sh-glow)] transition duration-150 hover:bg-[var(--cb-yellow-2)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cb-yellow)]"
                  onClick={closeTagModal}
                  type="button"
                >
                  저장 ({selected.length}/{CREATE_ROOM_MAX_TAGS})
                </button>
              </>
            }
          />
        ) : null}
      </form>
    </>
  );
}

function CreateRoomField({
  label,
  optional,
  hint,
  children,
}: {
  label: string;
  optional?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12.5px] font-semibold text-[var(--cb-text-2)]">
        {label}{" "}
        {optional ? (
          <span className="font-normal text-[var(--cb-text-3)]">
            {optional}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? (
        <div className="text-[11.5px] leading-[1.55] text-[var(--cb-text-3)]">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function DisabledFormInput({
  label,
  value,
  right,
}: {
  label: string;
  value: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <input
        aria-label={label}
        className={cn(
          "min-h-[48px] w-full rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] px-3.5 py-3 text-sm text-[var(--cb-text-2)] outline-none disabled:cursor-not-allowed disabled:opacity-100",
          right && "pr-28",
        )}
        disabled
        readOnly
        value={value}
      />
      {right ? (
        <span className="pointer-events-none absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center text-sm text-[var(--cb-text-3)]">
          {right}
        </span>
      ) : null}
    </div>
  );
}
