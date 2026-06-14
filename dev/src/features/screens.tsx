"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Info,
  Lock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  Share2,
  Star
} from "lucide-react";
import { addMinutes, format } from "date-fns";
import { ko } from "date-fns/locale";
import { useCreateRoomMutation, useRooms } from "@/lib/api";
import {
  calculateTimetableLoad,
  concerts as fallbackConcerts,
  getConcert,
  getModeLabel,
  memories,
  members,
  myProfile,
  places,
  rooms as fallbackRooms,
  tagCategories,
  timetableStops,
  type Room,
  type RoomStatus,
  type TimetableStop
} from "@/lib/data";
import { getKakaoMapKey, loadKakaoMap, type KakaoMapState } from "@/lib/kakao-map";
import { type AppScreen, getScreenById, SCREEN_ROUTES } from "@/lib/routes";
import { MAX_INTEREST_TAGS, useAppStore } from "@/store/app-store";
import { AppBar, Avatar, Button, Card, Chip, Input, Modal, Skeleton, Stepper } from "@/components/ui";
import {
  BackButton,
  Badge,
  ConcertCard,
  InfoRow,
  MapFallback,
  MapPin as MapPinMarker,
  MapPlaceCard,
  MemberRow,
  RoomCard,
  SectionTitle,
  TimelineBlock
} from "@/components/buddy-patterns";
import { MobileShell } from "@/components/shell";
import { cn } from "@/lib/utils";

const nicknameSchema = z.object({
  nickname: z
    .string()
    .min(2, "두 글자 이상 입력해 주세요")
    .max(12, "12자 이하로 입력해 주세요")
    .regex(/^[가-힣A-Za-z0-9_]+$/, "한글·영문·숫자·_ 만 사용할 수 있어요")
});

const roomSchema = z.object({
  title: z.string().min(5, "방 제목을 조금 더 구체적으로 적어 주세요"),
  intro: z.string().min(10, "소개는 10자 이상 필요해요"),
  meetPlace: z.string().min(1, "집합 장소를 입력해 주세요"),
  meetTime: z.string().min(1, "집합 시간을 입력해 주세요"),
  openChatUrl: z.string().optional(),
  openChatPassword: z.string().optional()
});

const homeCategoryFilters = ["전체", "K-POP", "뮤지컬", "페스티벌", "지역"];
const roomSortOptions = ["매칭 많은 순", "날짜순", "정원순", "시간순"] as const;
const CREATE_ROOM_MAX_TAGS = 4;
type MyRoomFilter = "all" | "host" | "member" | "pending";
type MyRoomCardStatus = Exclude<MyRoomFilter, "all"> | "past";
type MyRoomCardModel = {
  id: string;
  title: string;
  concertTitle: string;
  concertDate: string;
  dateLabel: string;
  meetPlace: string;
  meetTime: string;
  currentMembers: number;
  maxMembers: number;
  status: MyRoomCardStatus;
  href: string;
  countdown?: string;
  pendingCount?: number;
};
const myRoomFilters = [
  { key: "all", label: "전체" },
  { key: "host", label: "방장" },
  { key: "member", label: "참여중" },
  { key: "pending", label: "대기중" }
] as const;
const pastMyRooms: MyRoomCardModel[] = [
  {
    id: "past-spring-festival",
    title: "스프링 페스티벌 같이 가요",
    concertTitle: "완료",
    concertDate: "2026.04.20",
    dateLabel: "04.20 (토)",
    meetPlace: "합정역 1번 출구",
    meetTime: "12:00",
    currentMembers: 4,
    maxMembers: 4,
    status: "past",
    href: "/rooms/member"
  }
];

export function BuddyDuckApp({ screen, showOpenChatModal = false }: { screen: AppScreen; showOpenChatModal?: boolean }) {
  const showNav = Boolean(screen.nav) && !["CB-01", "CB-02", "CB-05", "CB-14prime"].includes(screen.id);

  return (
    <MobileShell screen={screen} showNav={showNav}>
      <ScreenContent screen={screen} showOpenChatModal={showOpenChatModal} />
    </MobileShell>
  );
}

function ScreenContent({ screen, showOpenChatModal = false }: { screen: AppScreen; showOpenChatModal?: boolean }) {
  switch (screen.id) {
    case "CB-01":
      return <LoginScreen />;
    case "CB-02":
      return <NicknameScreen />;
    case "CB-03":
      return <HomeScreen />;
    case "CB-04":
      return <RoomListScreen />;
    case "CB-04prime":
      return <RoomListScreen showTagModal />;
    case "CB-05":
      return <CreateRoomScreen />;
    case "CB-06":
      return <MyRoomsScreen />;
    case "CB-07A":
      return <RoomDetailScreen mode="host" showOpenChatModal={showOpenChatModal} />;
    case "CB-07B":
      return <RoomDetailScreen mode="member" showOpenChatModal={showOpenChatModal} />;
    case "CB-07C":
      return <RoomDetailScreen mode="pending" />;
    case "CB-07D":
      return <RoomDetailScreen mode="visitor" />;
    case "CB-07Dprime":
      return <RoomDetailScreen mode="visitor" showApplyModal />;
    case "CB-08":
      return <RoomDetailScreen mode="member" showOpenChatModal />;
    case "CB-09":
      return <TimelineScreen />;
    case "CB-10":
      return <PlaceSearchScreen />;
    case "CB-11":
      return <TimetableEditScreen />;
    case "CB-11prime":
      return <TimetableEditScreen showWarning />;
    case "CB-12":
      return <MapScreen />;
    case "CB-13":
      return <MemoryFeedScreen />;
    case "CB-14":
      return <ProfileScreen />;
    case "CB-14prime":
      return <ProfileEditScreen />;
  }
}

function LoginScreen() {
  return (
    <>
      <div className="login-hero flex flex-1 flex-col items-center px-6 pb-8 pt-[118px] text-center">
        <Image
          alt="BuddyDuck"
          className="h-24 w-24 rounded-[26px] object-cover shadow-[0_18px_50px_-14px_rgba(253,190,13,.55)]"
          height={96}
          priority
          src="/images/concert-buddy-logo.png"
          width={96}
        />
        <h1 className="mt-[22px] text-[28px] font-extrabold leading-tight tracking-normal">BuddyDuck</h1>
        <p className="mt-2 text-[14px] leading-[1.55] text-[var(--cb-text-2)]">
          덕메를 찾고,
          <br />
          함께 공연을 준비해요.
        </p>
        <div className="mt-auto w-full space-y-3">
          <p className="mb-1 text-[11px] leading-5 text-[var(--cb-text-3)]">
            로그인 시 서비스 약관과 개인정보 처리방침에 동의합니다.
          </p>
          <Link href="/nickname">
            <Button variant="kakao">
              <MessageCircle size={19} /> 카카오로 시작하기
            </Button>
          </Link>
          <button className="w-full py-2 text-[13px] text-[var(--cb-text-2)] underline underline-offset-[3px]" type="button">
            데모 로그인 (발표용)
          </button>
        </div>
      </div>
    </>
  );
}

function NicknameScreen() {
  const [selectedAge, setSelectedAge] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const {
    register,
    control,
    formState: { errors, isValid }
  } = useForm<z.infer<typeof nicknameSchema>>({
    resolver: zodResolver(nicknameSchema),
    mode: "onChange",
    defaultValues: { nickname: "" }
  });
  const nickname = useWatch({ control, name: "nickname" }) ?? "";
  const nicknameLength = nickname.length;
  const isAvailable = isValid && nickname !== "admin";
  const canComplete = isAvailable && selectedAge && selectedGender;
  const ageOptions = ["10대", "20대", "30대", "40대+"];
  const genderOptions = ["여성", "남성"];

  return (
    <>
      <AppBar title="닉네임 설정" />
      <div className="body-scroll flex flex-col">
        <div className="pt-8">
          <h1 className="text-[21px] font-bold leading-tight">
            사용할 닉네임을
            <br />
            정해주세요
          </h1>
          <p className="mt-2 text-[13px] leading-6 text-[var(--cb-text-2)]">방장이 보는 카드, 오픈채팅에서 사용돼요.</p>
        </div>
        <div className="mt-8">
          <Input
            label="닉네임"
            maxLength={12}
            placeholder="닉네임 입력"
            error={errors.nickname?.message}
            {...register("nickname")}
          />
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className={isAvailable ? "font-semibold text-[var(--cb-yellow)]" : "text-[var(--cb-text-3)]"}>
              {nicknameLength === 0 ? "한글·영문·숫자·_ 만 가능. 2 ~ 12자." : isAvailable ? "사용 가능한 닉네임 형식이에요." : "닉네임을 확인해 주세요."}
            </span>
            <span className="text-[var(--cb-text-3)]">{nicknameLength} / 12</span>
          </div>
        </div>
        <section className="mt-6">
          <div className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-[var(--cb-text-2)]">
            연령대
            <span className="rounded-[var(--r-pill)] border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] px-2 py-0.5 text-[10px] font-bold text-[var(--cb-yellow)]">
              필수
            </span>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="연령대 선택">
            {ageOptions.map((age) => (
              <Chip
                key={age}
                active={selectedAge === age}
                aria-pressed={selectedAge === age}
                onClick={() => setSelectedAge(age)}
                type="button"
              >
                {age}
              </Chip>
            ))}
          </div>
        </section>
        <section className="mt-5">
          <div className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-[var(--cb-text-2)]">
            성별
            <span className="rounded-[var(--r-pill)] border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] px-2 py-0.5 text-[10px] font-bold text-[var(--cb-yellow)]">
              필수
            </span>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="성별 선택">
            {genderOptions.map((gender) => (
              <Chip
                key={gender}
                active={selectedGender === gender}
                aria-pressed={selectedGender === gender}
                onClick={() => setSelectedGender(gender)}
                type="button"
              >
                {gender}
              </Chip>
            ))}
          </div>
        </section>
        <p className="mt-5 rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-1)] p-3 text-[11.5px] leading-5 text-[var(--cb-text-3)]">
          연령대·성별은 방장이 승인 여부를 판단할 때 도움이 돼요. 선택한 정보는 나중에 프로필에서 수정할 수 있어요.
        </p>
        <div className="mt-auto pt-6">
          {canComplete ? (
            <Link href="/home">
              <Button>완료</Button>
            </Link>
          ) : (
            <Button disabled className="bg-[var(--cb-surface-2)] text-[var(--cb-text-3)] shadow-none">
              완료
            </Button>
          )}
          <p className="mt-2 text-center text-[11px] text-[var(--cb-text-3)]">
            {canComplete ? "입력한 정보로 BuddyDuck을 시작해요." : "닉네임, 연령대, 성별을 모두 입력해 주세요."}
          </p>
        </div>
      </div>
    </>
  );
}

function HomeScreen() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");
  const concertData = fallbackConcerts;
  const filteredConcerts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return concertData.filter((concert) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [concert.artist, concert.title, concert.category, concert.venue, ...concert.tags].some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesCategory = activeCategory === "전체" || concert.category === activeCategory;

      return matchesQuery && matchesCategory;
    });
  }, [activeCategory, concertData, query]);

  return (
    <>
      <AppBar
        left={<h1 className="text-[21px] font-bold leading-none tracking-[-.02em]">공연 찾기</h1>}
        right={
          <Button size="icon" variant="outline" aria-label="공연 필터">
            <Settings2 size={18} />
          </Button>
        }
      />
      <div className="body-scroll">
        <label className="mt-2 flex h-[46px] items-center gap-2.5 rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] px-3.5 text-[13.5px] text-[var(--cb-text-3)]">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="공연 검색"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[var(--cb-text)] outline-none placeholder:text-[var(--cb-text-3)]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="공연명 / 지역 / 아티스트 검색"
            type="search"
            value={query}
          />
        </label>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3">
          {homeCategoryFilters.map((filter) => (
            <Chip
              key={filter}
              active={activeCategory === filter}
              aria-pressed={activeCategory === filter}
              className="px-3.5"
              onClick={() => setActiveCategory(filter)}
              type="button"
            >
              {filter}
              {filter === "지역" ? <ChevronDown size={13} /> : null}
            </Chip>
          ))}
        </div>
        <div className="mb-3 mt-1 text-[15px] font-bold tracking-[-.01em]">다가오는 공연</div>
        <div className="space-y-3 pb-1">
          {filteredConcerts.map((concert) => <ConcertCard key={concert.id} concert={concert} />)}
          {filteredConcerts.length === 0 ? (
            <div className="rounded-[var(--r-lg)] border border-[var(--cb-line)] bg-[var(--cb-surface-1)] px-4 py-8 text-center text-[12.5px] text-[var(--cb-text-3)]">
              조건에 맞는 공연이 없어요.
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function RoomListScreen({ showTagModal = false }: { showTagModal?: boolean }) {
  const router = useRouter();
  const { data, isLoading } = useRooms();
  const roomData = data ?? fallbackRooms;
  const { selectedTags, toggleTag } = useAppStore();
  const [activeSort, setActiveSort] = useState<(typeof roomSortOptions)[number]>("매칭 많은 순");
  const sortedRooms = useMemo(() => {
    const nextRooms = [...roomData];

    if (activeSort === "날짜순") {
      return nextRooms.sort((a, b) => a.concertDate.localeCompare(b.concertDate));
    }
    if (activeSort === "정원순") {
      return nextRooms.sort((a, b) => b.maxMembers - b.currentMembers - (a.maxMembers - a.currentMembers));
    }
    if (activeSort === "시간순") {
      return nextRooms.sort((a, b) => a.meetTime.localeCompare(b.meetTime));
    }

    return nextRooms.sort((a, b) => b.match - a.match);
  }, [activeSort, roomData]);

  const closeTagModal = useCallback(() => router.push("/rooms"), [router]);

  useEffect(() => {
    if (!showTagModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTagModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeTagModal, showTagModal]);

  return (
    <>
      <AppBar
        title="Stadium Tour - Night 1"
        left={<BackButton href="/home" />}
        right={
          <Button size="icon" variant="outline" aria-label="공유">
            <Share2 size={18} />
          </Button>
        }
      />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className={cn("ph h-[140px]", showTagModal && "blur-[2px]")}>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-30% to-[rgba(8,8,9,.85)]" />
          <div className="absolute bottom-6 left-4 z-[1]">
            <h1 className="text-[17px] font-bold tracking-[-.01em]">KSPO Dome</h1>
            <p className="mt-[3px] flex items-center gap-[7px] text-[12px] text-[var(--cb-text-2)]">
              2026.06.15 (월) 19:00 · <b className="font-bold text-[var(--cb-yellow)]">D-25</b>
            </p>
          </div>
        </div>
        <div
          className={cn(
            "relative z-[3] mx-4 -mt-3 flex flex-col gap-2.5 rounded-[var(--r-md)] border border-[var(--cb-yellow-line)] bg-[var(--cb-surface-1)] px-3.5 py-[13px] shadow-[var(--sh-card)]",
            showTagModal && "blur-[2px]"
          )}
        >
          <div className="flex items-center justify-between text-[12.5px] font-semibold">
            <span>이 공연에서 내 관심 태그</span>
            <Link href="/rooms?modal=tags" className="flex items-center gap-1 text-[12px] font-semibold text-[var(--cb-yellow)]">
              편집 <Pencil size={13} />
            </Link>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.length > 0 ? (
              selectedTags.map((tag) => (
                <Badge key={tag} tone="yellow">
                  {tag}
                </Badge>
              ))
            ) : (
              <p className="text-[12px] font-medium text-[var(--cb-text-3)]">설정해 둔 태그가 없습니다</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-1.5 pt-3.5">
          {roomSortOptions.map((option) => (
            <button
              aria-pressed={activeSort === option}
              className={cn(
                "inline-flex h-8 shrink-0 items-center rounded-[var(--r-pill)] border px-[13px] text-[12px] font-semibold transition active:scale-[0.97]",
                activeSort === option
                  ? "border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)]"
                  : "border-[var(--cb-line)] bg-[var(--cb-surface-2)] text-[var(--cb-text-2)]"
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
            {isLoading && roomData.length === 0
              ? [0, 1, 2].map((item) => <Skeleton key={item} className="h-[150px]" />)
              : sortedRooms.map((room) => <RoomCard key={room.id} room={room} href={roomHref(room)} selectedTags={selectedTags} />)}
          </div>
        </div>
      </div>
      <Link
        href="/rooms/create"
        className="fixed bottom-[84px] z-30 grid h-[58px] w-[58px] place-items-center rounded-full bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)] shadow-[0_12px_28px_-8px_rgba(253,190,13,.6)] transition active:scale-[0.97]"
        style={{ right: "max(18px, calc((100vw - 430px) / 2 + 18px))" }}
        aria-label="방 만들기"
      >
        <Plus size={26} strokeWidth={2.4} />
      </Link>
      {showTagModal ? <InterestTagModal closeTagModal={closeTagModal} selectedTags={selectedTags} toggleTag={toggleTag} /> : null}
    </>
  );
}

function InterestTagModal({
  closeTagModal,
  selectedTags,
  toggleTag
}: {
  closeTagModal: () => void;
  selectedTags: string[];
  toggleTag: (tag: string) => void;
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
            className="inline-flex h-[50px] items-center justify-center rounded-[var(--r-md)] border border-[var(--cb-line-2)] bg-[var(--cb-surface-2)] text-[14px] font-bold text-[var(--cb-text)] transition active:scale-[0.97]"
            href="/rooms"
          >
            취소
          </Link>
          <Link
            className="inline-flex h-[50px] items-center justify-center rounded-[var(--r-md)] border border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[14px] font-bold text-[var(--cb-on-yellow)] shadow-[var(--sh-glow)] transition active:scale-[0.97]"
            href="/rooms"
          >
            저장 ({selectedTags.length}/{MAX_INTEREST_TAGS})
          </Link>
        </>
      }
    />
  );
}

function TagSelectionSheet({
  title,
  description,
  selectedTags,
  maxTags,
  onToggle,
  onDismiss,
  actions
}: {
  title: string;
  description: string;
  selectedTags: string[];
  maxTags: number;
  onToggle: (tag: string) => void;
  onDismiss: () => void;
  actions: React.ReactNode;
}) {
  const isAtLimit = selectedTags.length >= maxTags;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  return (
    <div
      aria-label="모달 배경"
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-3.5 backdrop-blur-[4px]"
      onClick={onDismiss}
      role="presentation"
    >
      <section
        aria-label={title}
        aria-modal="true"
        className="sheet-enter w-full max-w-[402px] rounded-[var(--r-xl)] border border-[var(--cb-line-2)] bg-[var(--cb-surface-1)] p-4 shadow-[var(--sh-pop)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r-md)] bg-[var(--cb-yellow-dim)] text-[18px] font-black text-[var(--cb-yellow)]">
            #
          </div>
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold leading-tight">{title}</h2>
            <p className="mt-1 text-[11.5px] leading-5 text-[var(--cb-text-3)]">{description}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3.5">
          {tagCategories.map((category) => (
            <div key={category.title}>
              <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[.1em] text-[var(--cb-text-3)]">{category.title}</div>
              <div className="flex flex-wrap gap-2">
                {category.tags.map((tag) => {
                  const active = selectedTags.includes(tag);
                  const disabled = !active && isAtLimit;

                  return (
                    <Chip
                      active={active}
                      aria-pressed={active}
                      className={cn(disabled && "opacity-45")}
                      disabled={disabled}
                      key={tag}
                      onClick={() => onToggle(tag)}
                      type="button"
                    >
                      {tag}
                    </Chip>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-[var(--r-md)] border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] p-3 text-[11.5px] leading-5 text-[var(--cb-yellow-2)]">
          선택한 태그로 <b className="font-bold text-[var(--cb-yellow)]">방 카드 매칭 수</b>가 결정돼요. 사용자 정의 태그는 지원하지 않아요.
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">{actions}</div>
      </section>
    </div>
  );
}

function CreateRoomScreen() {
  const router = useRouter();
  const mutation = useCreateRoomMutation();
  const [selected, setSelected] = useState<string[]>([]);
  const [maxMembers, setMaxMembers] = useState(4);
  const [hasOvernight, setHasOvernight] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const meetTimeInputRef = useRef<HTMLInputElement | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<z.infer<typeof roomSchema>>({
    resolver: zodResolver(roomSchema),
    mode: "onChange",
    defaultValues: {
      title: "굿즈 줄 같이 서고 카페까지 같이 가요",
      intro: "조용히 줄서고, 카페 갔다가 같이 입장해요. 응원봉 챙겨와주세요.",
      meetPlace: "",
      meetTime: "2026-06-15T14:00",
      openChatUrl: "",
      openChatPassword: ""
    }
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
    [openMeetTimePicker]
  );
  const toggleRoomTag = useCallback((tag: string) => {
    setSelected((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag);
      if (current.length >= CREATE_ROOM_MAX_TAGS) return current;
      return [...current, tag];
    });
  }, []);

  return (
    <>
      <AppBar title="방 만들기" left={<BackButton href="/rooms" icon="close" />} right={<span className="w-[38px]" />} />
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={handleSubmit((values) => {
          mutation.mutate({ title: values.title, tags: selected });
          router.push("/rooms/host");
        })}
      >
        <div className="mx-4 mt-3 flex shrink-0 items-start gap-2.5 rounded-[var(--r-md)] border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] px-3.5 py-3 text-[12px] leading-[1.5] text-[var(--cb-yellow-2)]">
          <Info className="mt-px shrink-0 text-[var(--cb-yellow)]" size={17} />
          <div>
            이 방은 <b className="font-bold text-[var(--cb-yellow)]">방장 승인</b>으로 입장이 결정돼요. 선착순이 아니에요.
          </div>
        </div>
        <div className="body-scroll flex flex-col gap-4 !pb-28 !pt-[6px]">
          <CreateRoomField label="공연">
            <DisabledFormInput label="공연" value="Stadium Tour — Night 1" right="2026.06.15" />
          </CreateRoomField>
          <Input label="방 제목" error={errors.title?.message} {...register("title")} />
          <Input label="한 줄 소개" multiline error={errors.intro?.message} {...register("intro")} />
          <CreateRoomField label="방 태그" optional="(최대 4개)">
            <div className="flex flex-wrap gap-1.5">
              {selected.map((tag) => (
                <Badge key={tag} tone="yellow">
                  {tag}
                </Badge>
              ))}
              <button
                aria-label="태그 추가"
                className="inline-flex items-center gap-1 rounded-[var(--r-pill)] border border-dashed border-[var(--cb-line-2)] bg-transparent px-2.5 py-1 text-[11px] font-semibold text-[var(--cb-text-2)] transition active:scale-[0.97]"
                onClick={() => setShowTagModal(true)}
                type="button"
              >
                + 추가
              </button>
            </div>
          </CreateRoomField>
          <div className="grid grid-cols-2 gap-3">
            <CreateRoomField label="최대 인원">
              <div className="relative">
                <select
                  aria-label="최대 인원"
                  className="min-h-[48px] w-full appearance-none rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] px-3.5 pr-9 text-sm text-[var(--cb-text)] outline-none"
                  onChange={(event) => setMaxMembers(Number(event.target.value))}
                  value={maxMembers}
                >
                  {[2, 3, 4, 5, 6, 7, 8].map((count) => (
                    <option key={count} value={count}>
                      {count}명
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--cb-text-3)]" size={15} />
              </div>
            </CreateRoomField>
            <CreateRoomField label="1박 일정">
              <button
                aria-pressed={hasOvernight}
                className="flex min-h-[48px] w-full items-center justify-between rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] px-3.5 text-left text-sm text-[var(--cb-text)]"
                onClick={() => setHasOvernight((value) => !value)}
                type="button"
              >
                <span>1박 포함</span>
                <span
                  className={cn(
                    "relative h-7 w-[46px] rounded-[var(--r-pill)] border transition",
                    hasOvernight ? "border-[var(--cb-yellow)] bg-[var(--cb-yellow)]" : "border-[var(--cb-line-2)] bg-[var(--cb-surface-3)]"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-[22px] w-[22px] rounded-full transition",
                      hasOvernight ? "right-0.5 bg-[var(--cb-on-yellow)]" : "left-0.5 bg-white"
                    )}
                  />
                </span>
              </button>
            </CreateRoomField>
          </div>
          <CreateRoomField label="행사 장소 (공연장)" hint="일정 역산과 도착 버퍼 30분의 기준점">
            <DisabledFormInput label="행사 장소 (공연장)" value="KSPO Dome" />
          </CreateRoomField>
          <Input label="집합 장소" placeholder="장소 검색 또는 주소로 등록" error={errors.meetPlace?.message} {...register("meetPlace")} />
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
          <Input label="오픈채팅 URL (승인 후 공개)" placeholder="https://open.kakao.com/..." {...register("openChatUrl")} />
          <Input label="오픈채팅 비밀번호 (선택)" placeholder="4 ~ 8자리 숫자/문자" {...register("openChatPassword")} />
        </div>
        <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-[var(--cb-line)] bg-[rgba(14,14,16,.94)] p-4 pb-[calc(16px+env(safe-area-inset-bottom))] backdrop-blur">
          <Button disabled={mutation.isPending || selected.length === 0}>{mutation.isPending ? "저장 중" : "방 만들기"}</Button>
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
                  className="inline-flex h-[50px] items-center justify-center rounded-[var(--r-md)] border border-[var(--cb-line-2)] bg-[var(--cb-surface-2)] text-[14px] font-bold text-[var(--cb-text)] transition active:scale-[0.97]"
                  onClick={closeTagModal}
                  type="button"
                >
                  취소
                </button>
                <button
                  className="inline-flex h-[50px] items-center justify-center rounded-[var(--r-md)] border border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[14px] font-bold text-[var(--cb-on-yellow)] shadow-[var(--sh-glow)] transition active:scale-[0.97]"
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
  children
}: {
  label: string;
  optional?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12.5px] font-semibold text-[var(--cb-text-2)]">
        {label} {optional ? <span className="font-normal text-[var(--cb-text-3)]">{optional}</span> : null}
      </div>
      {children}
      {hint ? <div className="text-[11.5px] leading-[1.55] text-[var(--cb-text-3)]">{hint}</div> : null}
    </div>
  );
}

function DisabledFormInput({
  label,
  value,
  right
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
          right && "pr-28"
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

function MyRoomsScreen() {
  const [filter, setFilter] = useState<MyRoomFilter>("all");
  const activeRooms = useMemo(() => getActiveMyRoomCards(), []);
  const counts = {
    host: activeRooms.filter((room) => room.status === "host").length,
    member: activeRooms.filter((room) => room.status === "member").length,
    pending: activeRooms.filter((room) => room.status === "pending").length
  };
  const currentRooms = activeRooms.filter((room) => {
    if (filter === "all") return true;
    return room.status === filter;
  });
  const pastRooms = filter === "all" ? getPastMyRoomCards() : [];
  const sections = [
    { id: "current", title: "오늘 / 이번 주", rooms: currentRooms },
    { id: "past", title: "지난 방", rooms: pastRooms }
  ].filter((section) => section.rooms.length > 0);

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
                "inline-flex h-[34px] shrink-0 items-center gap-[7px] rounded-[var(--r-pill)] border px-3.5 text-[12.5px] font-semibold transition active:scale-[0.97]",
                filter === item.key
                  ? "border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)]"
                  : "border-[var(--cb-line)] bg-[var(--cb-surface-2)] text-[var(--cb-text-2)]"
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
        <div className="min-h-0 flex-1 overflow-y-auto pb-[88px] pt-0">
          {sections.length > 0 ? (
            sections.map((section) => (
              <section aria-labelledby={`my-rooms-${section.id}`} key={section.id}>
                <h2
                  className="mx-4 mb-2.5 mt-[18px] text-[10.5px] font-bold uppercase tracking-[.1em] text-[var(--cb-text-3)]"
                  id={`my-rooms-${section.id}`}
                >
                  {section.title}
                </h2>
                {section.rooms.map((room) => (
                  <MyRoomCard key={room.id} room={room} />
                ))}
              </section>
            ))
          ) : (
            <Card className="mx-4 mt-[18px] p-5 text-center">
              <p className="text-[13px] text-[var(--cb-text-2)]">아직 표시할 방이 없습니다.</p>
              <Link href="/rooms/create" className="mt-4 block">
                <Button>방 만들기</Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function MyRoomCard({ room }: { room: MyRoomCardModel }) {
  const isPendingOrPast = room.status === "pending" || room.status === "past";

  return (
    <Link
      href={room.href}
      className={cn(
        "relative mx-4 mb-3 flex gap-3 rounded-[var(--r-lg)] border border-[var(--cb-line)] bg-[var(--cb-surface-1)] p-3 shadow-[var(--sh-card)] transition hover:border-[var(--cb-line-2)]",
        room.status === "past" && "opacity-[.62]"
      )}
    >
      <div className="ph h-[60px] w-[60px] rounded-[var(--r-md)]">
        <span className="absolute bottom-2 left-[9px] font-mono text-[9px] font-semibold leading-none tracking-[.06em] text-white/35">
          ROOM
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div
          className={cn(
            "truncate pr-[42px] text-[14px] font-bold tracking-[-.01em]",
            isPendingOrPast && "text-[var(--cb-text-2)]"
          )}
        >
          {room.title}
        </div>
        <div className="text-[11.5px] text-[var(--cb-text-3)]">
          {room.concertTitle} · {room.dateLabel}
        </div>
        <div className="mt-[5px] flex items-center gap-1.5 text-[12px] text-[var(--cb-text-2)]">
          <MapPin size={13} className="shrink-0 text-[var(--cb-text-3)]" />
          <span className="min-w-0 truncate">{room.meetPlace}</span>
          <span className="shrink-0 text-[var(--cb-text-3)]">·</span>
          <span className="shrink-0">{room.meetTime}</span>
        </div>
        <div className="mt-[7px] flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-[11.5px] text-[var(--cb-text-3)]">
            <span className={myRoomRoleBadgeClass(room.status)}>{myRoomRoleLabel(room.status)}</span>
            <span className="truncate">{myRoomFooterText(room)}</span>
          </div>
          {room.pendingCount ? (
            <span className="shrink-0 rounded-[var(--r-pill)] bg-[var(--cb-yellow)] px-[9px] py-[3px] text-[10.5px] font-extrabold text-[var(--cb-on-yellow)]">
              승인 대기 {room.pendingCount}건
            </span>
          ) : null}
        </div>
      </div>
      {room.countdown ? (
        <div className="absolute right-3 top-3 rounded-[var(--r-sm)] border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] px-2 py-[3px] text-[11px] font-extrabold text-[var(--cb-yellow)]">
          {room.countdown}
        </div>
      ) : null}
    </Link>
  );
}

function createMyRoomCard(room: Room): MyRoomCardModel | null {
  if (room.status !== "host" && room.status !== "member" && room.status !== "pending") return null;

  return {
    id: room.id,
    title: room.title,
    concertTitle: myRoomConcertTitle(room.concertId),
    concertDate: room.concertDate,
    dateLabel: formatMyRoomDate(room.concertDate),
    meetPlace: room.meetPlace,
    meetTime: room.meetTime,
    currentMembers: room.currentMembers,
    maxMembers: room.maxMembers,
    status: room.status,
    href: roomHref(room),
    countdown: room.status === "pending" ? undefined : myRoomCountdown(room.concertId),
    pendingCount: room.status === "host" ? 2 : undefined
  };
}

function getActiveMyRoomCards() {
  return fallbackRooms
    .flatMap((room) => {
      const card = createMyRoomCard(room);
      return card ? [card] : [];
    })
    .sort(compareMyRoomCards);
}

function getPastMyRoomCards() {
  return [...pastMyRooms].sort(compareMyRoomCards);
}

function getMyRoomStats() {
  return {
    activeRoomCount: getActiveMyRoomCards().length,
    completedConcertCount: getPastMyRoomCards().length
  };
}

function compareMyRoomCards(a: MyRoomCardModel, b: MyRoomCardModel) {
  const scheduleCompare = `${a.concertDate} ${a.meetTime}`.localeCompare(`${b.concertDate} ${b.meetTime}`);
  if (scheduleCompare !== 0) return scheduleCompare;
  return a.title.localeCompare(b.title);
}

function formatMyRoomDate(date: string) {
  return format(new Date(`${date.replaceAll(".", "-")}T00:00:00+09:00`), "MM.dd (eee)", { locale: ko });
}

function myRoomConcertTitle(concertId: string) {
  if (concertId === "c1") return "Stadium Tour — Night 1";
  return getConcert(concertId).title;
}

function myRoomCountdown(concertId: string) {
  if (concertId === "c1") return "D-3";
  return getConcert(concertId).dday;
}

function myRoomRoleLabel(status: MyRoomCardStatus) {
  return {
    host: "HOST",
    member: "참여중",
    pending: "대기중",
    past: "완료"
  }[status];
}

function myRoomFooterText(room: MyRoomCardModel) {
  if (room.status === "pending") return "신청 후 1시간";
  return `멤버 ${room.currentMembers} / ${room.maxMembers}`;
}

function myRoomRoleBadgeClass(status: MyRoomCardStatus) {
  return cn(
    "shrink-0 rounded-[var(--r-sm)] px-2 py-[3px] text-[10px] font-extrabold uppercase tracking-[.04em]",
    status === "host" && "bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)]",
    status === "member" && "border border-[var(--cb-yellow-line)] bg-[var(--cb-yellow-dim)] text-[var(--cb-yellow-2)]",
    status === "pending" && "border border-[var(--cb-line-2)] text-[var(--cb-text-2)]",
    status === "past" && "border border-[var(--cb-line)] text-[var(--cb-text-3)]"
  );
}

function RoomDetailScreen({
  mode,
  showApplyModal = false,
  showOpenChatModal = false
}: {
  mode: RoomStatus;
  showApplyModal?: boolean;
  showOpenChatModal?: boolean;
}) {
  const room = fallbackRooms.find((item) => item.status === mode) ?? fallbackRooms[0];
  const concert = getConcert(room.concertId);
  const detailHref = `/rooms/${mode === "host" ? "host" : mode === "member" ? "member" : mode === "pending" ? "pending" : "visitor"}`;
  const canOpenChat = mode === "host" || mode === "member";

  return (
    <>
      <AppBar
        title={room.title}
        left={<BackButton href="/rooms" />}
        right={
          mode === "host" || mode === "member" ? (
            <Link href={`${detailHref}?modal=open-chat`} className="inline-flex h-[34px] items-center gap-1.5 rounded-[var(--r-pill)] bg-[var(--cb-yellow)] px-3 text-[12px] font-bold text-[var(--cb-on-yellow)]">
              <MessageCircle size={15} /> 오픈채팅
            </Link>
          ) : mode === "visitor" ? (
            null
          ) : mode === "pending" ? (
            null
          ) : null
        }
      />
      <div className="body-scroll">
        <Badge tone="yellow">{modeLabel(mode)}</Badge>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar name={room.hostAvatar} host />
              <div>
                <div className="text-[13px] font-semibold">{room.hostNickname}</div>
                <div className="text-[11px] text-[var(--cb-text-3)]">매칭률 {room.match}%</div>
              </div>
            </div>
            <Badge>
              {room.isLocked ? <Lock size={12} /> : null}
              {room.currentMembers}/{room.maxMembers}
            </Badge>
          </div>
          <h1 className="mt-4 text-[19px] font-bold leading-7 text-balance">{room.title}</h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {room.tags.map((tag) => (
              <Badge key={tag} tone="yellow">
                {tag}
              </Badge>
            ))}
          </div>
        </Card>
        <SectionTitle title="콘서트 정보" />
        <Card className="p-4">
          <div className="text-[15px] font-bold">{concert.artist}</div>
          <div className="mt-1 text-[13px] text-[var(--cb-text-2)]">{concert.title}</div>
          <div className="mt-3 grid gap-2 text-[12px] text-[var(--cb-text-3)]">
            <InfoRow label="날짜" value={concert.date} />
            <InfoRow label="장소" value={concert.venue} />
          </div>
        </Card>
        <SectionTitle title="멤버" />
        <div className="space-y-2">
          {members.map((member) => (
            <MemberRow key={member.id} member={member} />
          ))}
        </div>
        <SectionTitle title="동행 일정" />
        <TimelineBlock stops={timetableStops} detailed />
        {mode === "pending" ? (
          <Card className="mt-4 border-[rgba(253,190,13,.24)] bg-[var(--cb-yellow-dim)] text-[12px] leading-5 text-[var(--cb-yellow-2)]">
            <b>신청 대기 중</b>
            <br />
            호스트가 수락하면 오픈채팅과 일정표가 열립니다.
          </Card>
        ) : null}
      </div>
      {mode === "host" ? (
        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-[var(--cb-line)] bg-[linear-gradient(transparent,var(--cb-bg)_20%)] p-4">
          <Button variant="outline">방 공유</Button>
          <Link href="/timeline">
            <Button>Open Timeline</Button>
          </Link>
        </div>
      ) : null}
      {mode === "member" ? (
        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-[var(--cb-line)] bg-[linear-gradient(transparent,var(--cb-bg)_20%)] p-4">
          <Link href="/timeline">
            <Button>Open Timeline</Button>
          </Link>
          <Button variant="danger">탈퇴</Button>
        </div>
      ) : null}
      {mode === "pending" ? (
        <div className="shrink-0 border-t border-[var(--cb-line)] bg-[linear-gradient(transparent,var(--cb-bg)_20%)] p-4">
          <Link href="/rooms">
            <Button variant="outline">신청 취소</Button>
          </Link>
        </div>
      ) : null}
      {mode === "visitor" ? (
        <div className="shrink-0 border-t border-[var(--cb-line)] bg-[linear-gradient(transparent,var(--cb-bg)_20%)] p-4">
          <Link href="/rooms/visitor?modal=apply">
            <Button>동행 신청하기</Button>
          </Link>
        </div>
      ) : null}
      {showApplyModal ? <ApplyModal /> : null}
      {canOpenChat && showOpenChatModal ? <OpenChatInfoModal /> : null}
    </>
  );
}

function OpenChatInfoModal() {
  return (
    <Modal title="오픈채팅 정보" onClose={() => undefined}>
      <div className="rounded-[var(--r-md)] bg-[var(--cb-surface-2)] p-3 text-[12px] leading-5">
        <InfoRow label="링크" value="open.kakao.com/o/aBcD9XyZ" strong />
        <InfoRow label="비밀번호" value="2468" />
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[var(--cb-text-2)]">
        승인된 멤버만 볼 수 있어요. 오픈채팅 정보는 외부에 공유하지 말아주세요.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" type="button">복사</Button>
        <Button type="button">카카오톡 열기</Button>
      </div>
    </Modal>
  );
}

function ApplyModal() {
  return (
    <Modal title="동행 신청" onClose={() => undefined}>
      <Input multiline placeholder="호스트에게 보낼 짧은 메시지" defaultValue="굿즈 줄과 카페 일정 모두 함께하고 싶어요." />
      <div className="mt-3 flex gap-2">
        <Link href="/rooms/visitor" className="flex-1">
          <Button variant="outline">취소</Button>
        </Link>
        <Link href="/rooms/pending" className="flex-1">
          <Button>신청하기</Button>
        </Link>
      </div>
    </Modal>
  );
}

function TimelineScreen() {
  return (
    <>
      <AppBar
        title="타임라인"
        left={<BackButton href="/my-rooms" />}
        right={
          <Link href="/map">
            <Button size="icon" variant="outline" aria-label="지도 미리보기">
              <MapPin size={18} />
            </Button>
          </Link>
        }
      />
      <div className="body-scroll">
        <div className="mb-3 flex items-center justify-between rounded-[var(--r-md)] bg-[var(--cb-surface-2)] p-3">
          <div>
            <div className="text-[13px] font-bold">2026.06.15 (월)</div>
            <div className="text-[11px] text-[var(--cb-text-3)]">공연 시작 19:00 기준 자동 역산</div>
          </div>
          <Link href="/timetable" className="text-[12px] font-bold text-[var(--cb-yellow)]">
            편집
          </Link>
        </div>
        <TimelineBlock stops={timetableStops} detailed />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link href="/timetable">
            <Button variant="outline" size="sm">일정 수정</Button>
          </Link>
          <Link href="/map">
            <Button variant="outline" size="sm">지도</Button>
          </Link>
          <Link href="/memories">
            <Button variant="outline" size="sm">추억</Button>
          </Link>
        </div>
      </div>
    </>
  );
}

function PlaceSearchScreen() {
  const router = useRouter();
  const [added, setAdded] = useState<string[]>([]);
  const selectPlace = (placeName: string) => {
    setAdded((current) => (current.includes(placeName) ? current : [...current, placeName]));
    if (window.history.length > 1) router.back();
    else router.push("/timetable");
  };

  return (
    <>
      <AppBar title="장소 검색" left={<BackButton href="/timetable" />} />
      <div className="mx-4 mb-2 flex h-[46px] shrink-0 items-center gap-2 rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] px-3 text-[13.5px] text-[var(--cb-text-2)]">
        <Search size={18} /> 송파대로 123 또는 장소명
      </div>
      <div className="body-scroll">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[.1em] text-[var(--cb-text-3)]">장소 검색 결과</div>
        <div className="space-y-2">
          {places.map((place) => (
            <div key={place.name} className="flex gap-3 rounded-[var(--r-md)] bg-[var(--cb-surface-1)] p-3">
              <div className="ph h-14 w-14 rounded-[var(--r-sm)]" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold">{place.name}</div>
                <div className="mt-1 text-[11px] text-[var(--cb-text-2)]">{place.category} · {place.distance}</div>
                <div className="mt-1 truncate text-[11px] text-[var(--cb-text-3)]">{place.address}</div>
              </div>
              <Button
                size="sm"
                variant={added.includes(place.name) ? "outline" : "primary"}
                className="h-8 w-[66px] text-[12px]"
                onClick={() => selectPlace(place.name)}
              >
                {added.includes(place.name) ? <Check size={14} /> : <Plus size={14} />}
                추가
              </Button>
            </div>
          ))}
        </div>
        <SectionTitle title='주소 검색 결과 "송파대로 123"' />
        <Card className="flex gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--cb-yellow-dim)] text-[var(--cb-yellow)]">
            <MapPin size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold">서울 송파구 송파대로 123</div>
            <div className="mt-1 text-[11px] text-[var(--cb-text-3)]">(우) 05552 · 좌표 37.5113, 127.0837</div>
          </div>
        </Card>
      </div>
    </>
  );
}

function TimetableEditScreen({ showWarning = false }: { showWarning?: boolean }) {
  const [stops, setStops] = useState<TimetableStop[]>(timetableStops);
  const [extra, setExtra] = useState(showWarning ? 42 : 0);
  const load = calculateTimetableLoad(stops, extra);
  const updateStopMinutes = (id: string, field: "dwellMinutes" | "transitMinutes", delta: number) => {
    setStops((current) =>
      current.map((stop) =>
        stop.id === id ? { ...stop, [field]: Math.max(field === "dwellMinutes" ? 10 : 0, stop[field] + delta) } : stop
      )
    );
  };

  return (
    <>
      <AppBar
        title="일정표 편집"
        left={<BackButton href="/timeline" icon="close" />}
        right={<Link href="/timeline" className="text-[13px] font-semibold text-[var(--cb-yellow)]">저장</Link>}
      />
      <div className="px-4 py-3">
        <div className="text-[13px] font-bold">2026.06.15 (월) - D-Day</div>
        <div className="text-[11px] text-[var(--cb-text-3)]">드래그 핸들 · 체류 시간 · 이동 수단</div>
      </div>
      <div className="body-scroll">
        <div className="space-y-2">
          {stops.map((stop) => (
            <div key={stop.id}>
              <Card className={cn("p-0", stop.locked && "border-[var(--cb-yellow-line)]")}>
                <div className="flex items-center gap-2 p-3">
                  <GripVertical size={16} className="text-[var(--cb-text-3)]" />
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--cb-yellow)] text-[12px] font-black text-[var(--cb-on-yellow)]">
                    {stop.locked ? <Star size={14} fill="currentColor" /> : stop.id.replace("s", "")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold">
                      {stop.place} {stop.locked ? <Lock className="inline" size={13} /> : null}
                    </div>
                    <div className="text-[11px] text-[var(--cb-text-3)]">{stop.time}</div>
                  </div>
                  <Stepper
                    value={`${stop.dwellMinutes}분`}
                    onMinus={() => updateStopMinutes(stop.id, "dwellMinutes", -10)}
                    onPlus={() => updateStopMinutes(stop.id, "dwellMinutes", 10)}
                  />
                </div>
              </Card>
              {stop.transitMinutes > 0 ? (
                <div className="mx-4 my-1 flex items-center justify-between rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] px-3 py-2 text-[12px] text-[var(--cb-text-2)]">
                  <span>{getModeLabel(stop.mode)} 이동</span>
                  <Stepper
                    value={`${stop.transitMinutes}분`}
                    onMinus={() => updateStopMinutes(stop.id, "transitMinutes", -5)}
                    onPlus={() => updateStopMinutes(stop.id, "transitMinutes", 5)}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <Link href="/places" className="mt-3 block">
          <Button variant="outline">
            <Plus size={18} /> 장소 추가
          </Button>
        </Link>
      </div>
      <div className="shrink-0 border-t border-[var(--cb-line)] p-4">
        <div className="mb-2 text-[11px] text-[var(--cb-text-3)]">
          총 소요 {load.usedMinutes}분 · 사용 가능 {load.availableMinutes}분
        </div>
        <Link href={load.isOverTime ? "/timetable?modal=warning" : "/timeline"} onClick={() => setExtra(42)}>
          <Button>수정 완료</Button>
        </Link>
      </div>
      {showWarning ? <OverTimeModal load={load} /> : null}
    </>
  );
}

function OverTimeModal({ load }: { load: ReturnType<typeof calculateTimetableLoad> }) {
  return (
    <Modal title="지금 일정을 전부 소화할 수 없습니다" position="center" onClose={() => undefined}>
      <div className="rounded-[var(--r-md)] bg-[var(--cb-surface-2)] p-3 text-[12px]">
        <InfoRow label="사용 가능 시간" value="14:00 - 18:30 · 4h 30m" />
        <InfoRow label="현재 일정 총 소요" value={`${load.usedMinutes}분`} />
        <InfoRow label="초과 시간" value={`+ ${load.overMinutes}분`} strong />
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[var(--cb-text-2)]">장소를 줄이거나 체류 시간을 줄여 주세요. 저장은 차단됩니다.</p>
      <Link href="/timetable" className="mt-4 block">
        <Button>되돌아가서 수정</Button>
      </Link>
    </Modal>
  );
}

function MapScreen() {
  const [state, setState] = useState<KakaoMapState>("loading");
  const { selectedMapStop, setSelectedMapStop } = useAppStore();
  const selected = timetableStops[selectedMapStop - 1] ?? timetableStops[1];

  useEffect(() => {
    loadKakaoMap().then(setState);
  }, []);

  return (
    <>
      <AppBar
        title="지도"
        left={<BackButton href="/timeline" />}
        right={
          <Button size="icon" variant="outline" aria-label="필터">
            <Settings2 size={18} />
          </Button>
        }
      />
      <div className="relative min-h-0 flex-1">
        <div className="map-grid absolute inset-0">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points="18,18 42,52 68,62 60,34" fill="none" stroke="#FDBE0D" strokeWidth="0.7" strokeDasharray="2 1.6" />
          </svg>
          {[
            [1, 18, 18],
            [2, 42, 52],
            [3, 68, 62],
            [4, 60, 34]
          ].map(([id, left, top]) => (
            <MapPinMarker
              key={id}
              id={Number(id)}
              left={Number(left)}
              top={Number(top)}
              selected={selectedMapStop === id}
              onSelect={setSelectedMapStop}
            />
          ))}
        </div>
        <div className="absolute left-4 right-4 top-3 flex gap-2">
          <Chip active>D-Day</Chip>
          <Chip>D+1</Chip>
        </div>
        {state !== "ready" ? (
          <MapFallback hasKey={Boolean(getKakaoMapKey())} />
        ) : null}
      </div>
      <div className="shrink-0 border-t border-[var(--cb-line)] p-4">
        <MapPlaceCard stop={selected} />
      </div>
    </>
  );
}

function MemoryFeedScreen() {
  return (
    <>
      <AppBar
        title="우리 방 추억"
        left={<BackButton href="/timeline" />}
        right={
          <Button size="icon" variant="outline" aria-label="더보기">
            <MoreHorizontal size={18} />
          </Button>
        }
      />
      <div className="flex items-center justify-between border-y border-[var(--cb-line)] px-4 py-3">
        <Badge tone="yellow">그룹</Badge>
        <span className="text-[11px] text-[var(--cb-text-3)]">사진 12 · 영상 3</span>
      </div>
      <div className="body-scroll">
        <div className="grid grid-cols-2 gap-3">
          {memories.map((memory, index) => (
            <Card key={memory.id} className="overflow-hidden p-0">
              <div className="ph grid aspect-square place-items-center text-[12px] font-black text-white/60">MEM {index + 1}</div>
              <div className="p-3">
                <div className="truncate text-[12.5px] font-bold">{memory.concertTitle}</div>
                <div className="mt-1 text-[11px] text-[var(--cb-text-3)]">{memory.date}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <div className="shrink-0 border-t border-[var(--cb-line)] p-3">
        <div className="mb-2 flex gap-2 text-[11px] text-[var(--cb-text-2)]">
          <Badge><Camera size={13} /> 사진</Badge>
          <Badge>VIDEO ≤60s</Badge>
        </div>
        <Button>
          <Plus size={18} /> 업로드
        </Button>
      </div>
    </>
  );
}

function ProfileScreen() {
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);
  const noticeIdRef = useRef(0);
  const showWipNotice = useCallback((label: string) => {
    noticeIdRef.current += 1;
    setNotice({ id: noticeIdRef.current, message: `${label}은 개발중인 기능입니다` });
  }, []);
  useEffect(() => {
    if (!notice) return undefined;

    const timer = window.setTimeout(() => setNotice(null), 1600);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const myRoomStats = getMyRoomStats();
  const stats = [
    { label: "참여 중인 방", value: myRoomStats.activeRoomCount },
    { label: "완료한 공연", value: myRoomStats.completedConcertCount }
  ];

  return (
    <>
      <AppBar left={<h1 className="text-[21px] font-bold leading-none tracking-[-.02em]">프로필</h1>} />
      {notice ? (
        <div
          key={notice.id}
          role="status"
          aria-live="polite"
          className="profile-toast pointer-events-none fixed bottom-[76px] left-1/2 z-30 w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2 rounded-[var(--r-md)] border border-[var(--cb-yellow-line)] bg-[rgba(22,22,24,.96)] px-3.5 py-3 text-[12px] font-semibold text-[var(--cb-yellow-2)] shadow-[var(--sh-pop)] backdrop-blur"
        >
          {notice.message}
        </div>
      ) : null}
      <div className="flex flex-1 flex-col overflow-auto px-4 pb-[18px] pt-2">
        <Link
          href="/profile/edit"
          className="flex items-center gap-3.5 rounded-[var(--r-lg)] border border-[var(--cb-line)] bg-[var(--cb-surface-1)] p-4 shadow-[var(--sh-card)] transition hover:border-[var(--cb-line-2)]"
        >
          <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full border border-[var(--cb-yellow)] bg-[var(--cb-surface-3)] text-[16px] font-bold text-[var(--cb-yellow)] shadow-[0_0_0_1px_var(--cb-yellow-line)]">
            {myProfile.avatar}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-bold tracking-[-.01em]">{myProfile.nickname}</span>
            <span className="mt-1 block text-[12.5px] text-[var(--cb-text-2)]">
              {myProfile.ageGroup} · {myProfile.gender}
            </span>
            <span className="mt-0.5 block text-[11px] text-[var(--cb-text-3)]">가입 {myProfile.joinedAt}</span>
          </span>
          <ChevronRight size={24} className="shrink-0 text-[var(--cb-text-3)]" />
        </Link>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href="/my-rooms"
              className="rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-1)] px-2 py-3.5 text-center transition hover:border-[var(--cb-line-2)]"
            >
              <span className="block text-[20px] font-extrabold text-[var(--cb-yellow)]">{stat.value}</span>
              <span className="mt-1 block text-[11px] text-[var(--cb-text-2)]">{stat.label}</span>
            </Link>
          ))}
        </div>

        <ProfileMenuGroup title="설정">
          <ProfileMenuButton label="알림 설정" onClick={showWipNotice} />
          <ProfileMenuButton label="차단한 사용자" value="2명" onClick={showWipNotice} />
          <ProfileMenuButton label="관심 공연 알림" value="ON" onClick={showWipNotice} />
        </ProfileMenuGroup>

        <ProfileMenuGroup title="고객 지원">
          <ProfileMenuButton label="도움말 / FAQ" onClick={showWipNotice} />
          <ProfileMenuButton label="문의하기" onClick={showWipNotice} />
          <ProfileMenuButton label="약관 및 정책" onClick={showWipNotice} />
          <ProfileMenuButton label="앱 버전" value="v1.0.0" onClick={showWipNotice} />
        </ProfileMenuGroup>

        <ProfileMenuGroup title="계정">
          <Link
            href="/login"
            className="flex w-full items-center justify-between border-b border-[var(--cb-line)] px-1 py-[15px] text-left text-[14px] transition hover:text-[var(--cb-yellow)]"
          >
            <span>로그아웃</span>
            <span className="flex items-center gap-1.5 text-[13px] text-[var(--cb-text-3)]">
              <ChevronRight size={16} />
            </span>
          </Link>
          <ProfileMenuButton label="회원 탈퇴" muted onClick={showWipNotice} />
        </ProfileMenuGroup>
      </div>
    </>
  );
}

function ProfileMenuGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-[22px]">
      <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[.1em] text-[var(--cb-text-3)]">{title}</div>
      {children}
    </section>
  );
}

function ProfileMenuButton({
  label,
  value,
  muted,
  onClick
}: {
  label: string;
  value?: string;
  muted?: boolean;
  onClick: (label: string) => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between border-b border-[var(--cb-line)] px-1 py-[15px] text-left text-[14px] transition hover:text-[var(--cb-yellow)]"
      onClick={() => onClick(label)}
      type="button"
    >
      <span className={muted ? "text-[var(--cb-text-3)]" : undefined}>{label}</span>
      <span className="flex items-center gap-1.5 text-[13px] text-[var(--cb-text-3)]">
        {value ? <span>{value}</span> : null}
        <ChevronRight size={16} />
      </span>
    </button>
  );
}

const profileAgeOptions = ["10대", "20대", "30대", "40대+", "비공개"];
const profileGenderOptions = ["여성", "남성"];

function ProfileEditScreen() {
  const [nickname, setNickname] = useState(myProfile.nickname);
  const [selectedAge, setSelectedAge] = useState(myProfile.ageGroup);
  const [selectedGender, setSelectedGender] = useState(myProfile.gender);
  const nicknameLength = Array.from(nickname).length;
  const canSave = nicknameLength >= 2 && nicknameLength <= 12;
  const onNicknameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Array.from(event.target.value).slice(0, 12).join("");
    setNickname(nextValue);
  };

  return (
    <>
      <AppBar title="프로필 수정" left={<BackButton href="/profile" />} right={<span className="w-[38px]" />} />
      <h1 className="sr-only">프로필 수정</h1>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => event.preventDefault()}>
        <div className="flex min-h-0 flex-1 flex-col overflow-auto px-4 pb-[18px] pt-2">
          <button className="relative mx-auto my-1 h-[104px] w-[104px]" type="button" aria-label="사진 변경">
            <span className="flex h-[104px] w-[104px] items-center justify-center rounded-full border border-[var(--cb-line-2)] bg-[var(--cb-surface-3)] text-[34px] font-extrabold text-[var(--cb-text-2)]">
              {myProfile.avatar}
            </span>
            <span className="absolute bottom-0 right-0 flex h-[34px] w-[34px] items-center justify-center rounded-full border-[3px] border-[var(--cb-bg)] bg-[var(--cb-yellow)] text-[var(--cb-on-yellow)]">
              <Camera size={16} />
            </span>
          </button>
          <button className="mx-auto mb-[18px] mt-1 text-[12px] font-semibold text-[var(--cb-yellow)]" type="button">
            사진 변경
          </button>

          <label className="flex flex-col gap-2">
            <span className="text-[12.5px] font-semibold text-[var(--cb-text-2)]">닉네임</span>
            <input
              aria-describedby="profile-nickname-count"
              className="min-h-[48px] rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] px-3.5 py-3 text-[14px] text-[var(--cb-text)] outline-none placeholder:text-[var(--cb-text-3)] focus:border-[var(--cb-yellow-line)]"
              maxLength={12}
              onChange={onNicknameChange}
              value={nickname}
            />
          </label>
          <div id="profile-nickname-count" className="mt-1 text-right text-[11px] text-[var(--cb-text-3)]">
            {nicknameLength} / 12
          </div>

          <ProfileChoiceGroup
            label="연령대"
            options={profileAgeOptions}
            selected={selectedAge}
            onSelect={setSelectedAge}
            className="mt-4"
          />
          <ProfileChoiceGroup
            label="성별"
            options={profileGenderOptions}
            selected={selectedGender}
            onSelect={setSelectedGender}
            className="mt-[18px]"
          />

          <p className="mt-4 text-[11.5px] leading-[1.55] text-[var(--cb-text-3)]">
            연령대·성별은 방장이 승인 여부를 판단할 때 도움이 돼요. 언제든 다시 수정/숨김 가능합니다.
          </p>
        </div>
        <div className="shrink-0 border-t border-[var(--cb-line)] bg-[linear-gradient(transparent,var(--cb-bg)_22%)] px-4 py-3">
          {canSave ? (
            <Link
              href="/profile"
              className="flex h-[54px] w-full items-center justify-center rounded-[var(--r-md)] border border-[var(--cb-yellow)] bg-[var(--cb-yellow)] text-[15px] font-bold text-[var(--cb-on-yellow)] shadow-[var(--sh-glow)]"
            >
              저장
            </Link>
          ) : (
            <button
              className="flex h-[54px] w-full cursor-not-allowed items-center justify-center rounded-[var(--r-md)] border border-[var(--cb-line)] bg-[var(--cb-surface-2)] text-[15px] font-bold text-[var(--cb-text-3)]"
              disabled
              type="button"
            >
              저장
            </button>
          )}
        </div>
      </form>
    </>
  );
}

function ProfileChoiceGroup({
  label,
  options,
  selected,
  onSelect,
  className
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-[9px] text-[12.5px] font-semibold text-[var(--cb-text-2)]">
        {label} <span className="font-normal text-[var(--cb-text-3)]">(선택)</span>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={`${label} 선택`}>
        {options.map((option) => (
          <Chip
            key={option}
            active={selected === option}
            aria-pressed={selected === option}
            onClick={() => onSelect(option)}
            type="button"
          >
            {option}
          </Chip>
        ))}
      </div>
    </section>
  );
}

function roomHref(room: Room) {
  if (room.status === "host") return "/rooms/host";
  if (room.status === "member") return "/rooms/member";
  if (room.status === "pending") return "/rooms/pending";
  return "/rooms/visitor";
}

function modeLabel(mode: RoomStatus) {
  return {
    host: "호스트 뷰",
    member: "멤버 뷰",
    pending: "신청 대기",
    visitor: "방문자 뷰"
  }[mode];
}

export function ScreenIndex() {
  const today = useMemo(() => format(addMinutes(new Date("2026-06-15T14:00:00"), 0), "yyyy.MM.dd (eee)", { locale: ko }), []);

  return (
    <div>
      <div>{today}</div>
      {SCREEN_ROUTES.map((screen) => (
        <Link key={screen.id} href={screen.href}>
          {screen.label} {screen.name}
        </Link>
      ))}
      <span>{getScreenById("CB-01").name}</span>
    </div>
  );
}
