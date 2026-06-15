import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { concerts } from "@/lib/data";
import { useAppStore } from "@/store/app-store";
import { HomeScreen } from "../home/_components/home-screen";
import { LoginScreen } from "../login/_components/login-screen";
import { MapScreen } from "../map/_components/map-screen";
import { MemoryFeedScreen } from "../memories/_components/memory-feed-screen";
import { MyRoomsScreen } from "../my-rooms/_components/my-rooms-screen";
import { NicknameScreen } from "../nickname/_components/nickname-screen";
import { PlaceSearchScreen } from "../places/_components/place-search-screen";
import { ProfileEditScreen } from "../profile/edit/_components/profile-edit-screen";
import { ProfileScreen } from "../profile/_components/profile-screen";
import { CreateRoomScreen } from "../rooms/create/_components/create-room-screen";
import { RoomDetailScreen } from "../rooms/_components/room-detail-screen";
import { RoomListScreen } from "../rooms/_components/room-list-screen";
import { TimetableEditScreen } from "../timetable/_components/timetable-edit-screen";
import { TimelineScreen } from "../timeline/_components/timeline-screen";
import { getScreenById, type ScreenId } from "../_lib/routes";
import { ScreenShell } from "./screen-shell";

const navigationMocks = vi.hoisted(() => ({
  back: vi.fn(),
  pathname: "/rooms",
  push: vi.fn()
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({
    back: navigationMocks.back,
    push: navigationMocks.push
  })
}));

function renderInShell(screenId: ScreenId, children: React.ReactNode) {
  return <ScreenShell screen={getScreenById(screenId)}>{children}</ScreenShell>;
}

function renderWithConcerts(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity
      }
    }
  });
  queryClient.setQueryData(["concerts"], concerts);

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("BuddyDuckApp screens", () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true);
    navigationMocks.back.mockClear();
    navigationMocks.push.mockClear();
  });

  it("starts with no default interest tags", () => {
    useAppStore.setState(useAppStore.getInitialState(), true);

    expect(useAppStore.getState().selectedTags).toEqual([]);
  });

  it("renders CB-01 as the Kakao login entry screen", () => {
    render(renderInShell("CB-01", <LoginScreen />));

    expect(screen.getByText("BuddyDuck")).toBeInTheDocument();
    expect(screen.getByText(/덕메를 찾고,/)).toBeInTheDocument();
    expect(screen.getByText(/서비스 약관/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /카카오로 시작하기/ })).toHaveAttribute("href", "/nickname");
    expect(screen.queryByRole("button", { name: "데모 로그인 (발표용)" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("requires nickname, age, and gender before enabling CB-02 completion", async () => {
    render(renderInShell("CB-02", <NicknameScreen />));

    expect(screen.getByRole("button", { name: "완료" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "비공개" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("닉네임 입력"), { target: { value: "duck_20" } });
    expect(screen.getByText("7 / 12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "완료" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "20대" }));
    expect(screen.getByRole("button", { name: "완료" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "여성" }));
    await waitFor(() => expect(screen.getByRole("link", { name: "완료" })).toHaveAttribute("href", "/home"));
  });

  it("filters CB-03 concerts by search text and category", () => {
    renderWithConcerts(renderInShell("CB-03", <HomeScreen />));

    expect(screen.getByText("공연 찾기")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "공연 필터" })).not.toBeInTheDocument();
    const search = screen.getByRole("searchbox", { name: "공연 검색" });
    expect(search).toHaveAttribute("placeholder", "공연명 / 지역 / 아티스트 검색");
    expect(screen.queryByText("이번 주 관심 태그")).not.toBeInTheDocument();
    expect(screen.getByText("LUMINA")).toBeInTheDocument();
    expect(screen.getByText("SEASON9")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "잠실" } });
    expect(screen.getByText("SEASON9")).toBeInTheDocument();
    expect(screen.queryByText("LUMINA")).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "뮤지컬" }));
    expect(screen.getByText("AFTERGLOW")).toBeInTheDocument();
    expect(screen.queryByText("LUMINA")).not.toBeInTheDocument();
    expect(screen.queryByText("SEASON9")).not.toBeInTheDocument();
  });

  it("renders CB-03 bottom navigation with home, my room, and profile only", () => {
    renderWithConcerts(renderInShell("CB-03", <HomeScreen />));

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveTextContent("홈");
    expect(nav).toHaveTextContent("내 방");
    expect(nav).toHaveTextContent("프로필");
    expect(screen.queryByRole("link", { name: "동행" })).not.toBeInTheDocument();
  });

  it("renders CB-04 as the hi-fi room list with an empty interest tag state and fixed create action", () => {
    renderWithConcerts(renderInShell("CB-04", <RoomListScreen />));

    expect(screen.getByText("Stadium Tour - Night 1")).toBeInTheDocument();
    expect(screen.getByText("이 공연에서 내 관심 태그")).toBeInTheDocument();
    expect(screen.getByText("설정해 둔 태그가 없습니다")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /편집/ })).toHaveAttribute("href", "/rooms?modal=tags");
    expect(screen.getByText("매칭 많은 순")).toBeInTheDocument();
    expect(screen.getByText("날짜순")).toBeInTheDocument();
    expect(screen.getByText("정원순")).toBeInTheDocument();
    expect(screen.getByText("굿즈 줄 같이 서고 카페까지 같이 가요")).toBeInTheDocument();
    expect(screen.getByText("매칭률 96%")).toBeInTheDocument();
    expect(screen.queryByText("3/3 match")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "방 만들기" })).toHaveAttribute("href", "/rooms/create");
    expect(screen.queryByRole("button", { name: "공유" })).not.toBeInTheDocument();
  });

  it("applies hover affordances to CB-04 room cards and controls", () => {
    renderWithConcerts(renderInShell("CB-04", <RoomListScreen />));

    expect(screen.getByRole("link", { name: "뒤로" })).toHaveClass("hover:bg-[var(--cb-surface-3)]");
    const roomLink = screen.getByRole("link", { name: /굿즈 줄 같이 서고 카페까지 같이 가요/ });
    expect(roomLink).toHaveClass("group");
    expect(roomLink.firstElementChild).toHaveClass("interactive-surface-card");

    expect(screen.getByRole("button", { name: "매칭 많은 순" })).toHaveClass("hover:bg-[var(--cb-yellow-2)]");
    expect(screen.getByRole("button", { name: "날짜순" })).toHaveClass("hover:bg-[var(--cb-surface-3)]");
    expect(screen.getByRole("link", { name: "방 만들기" })).toHaveClass("hover:bg-[var(--cb-yellow-2)]");
  });

  it("applies focus-visible affordances to shared chips, cards, and bottom navigation", () => {
    renderWithConcerts(renderInShell("CB-03", <HomeScreen />));

    expect(screen.getByRole("button", { name: "뮤지컬" })).toHaveClass("hover:bg-[var(--cb-surface-3)]");
    expect(screen.getByRole("button", { name: "뮤지컬" })).toHaveClass("focus-visible:outline-2");
    expect(screen.getByRole("button", { name: "전체" })).toHaveClass("hover:bg-[var(--cb-yellow-2)]");

    const concertLink = screen.getByRole("link", { name: /Moonlight Sync Live/ });
    expect(concertLink).toHaveClass("hover:bg-[var(--cb-surface-2)]");
    expect(concertLink).toHaveClass("active:scale-[0.99]");
    expect(concertLink).toHaveClass("focus-visible:outline-2");

    const homeNav = screen.getByRole("link", { name: "홈" });
    expect(homeNav).toHaveClass("hover:bg-[var(--cb-surface-2)]");
    expect(homeNav).toHaveClass("active:scale-[0.98]");
    expect(homeNav).toHaveClass("focus-visible:outline-2");
  });

  it("renders CB-04prime tag modal and prevents selecting more than five tags", () => {
    renderWithConcerts(renderInShell("CB-04prime", <RoomListScreen showTagModal />));

    expect(screen.getByRole("dialog", { name: "관심 태그 선택" })).toBeInTheDocument();
    expect(screen.getByText("최대 5개까지 선택 · 사전 정의된 태그에서 골라요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "저장 (0/5)" })).toHaveAttribute("href", "/rooms");

    fireEvent.click(screen.getByRole("button", { name: "굿즈 줄서기" }));
    fireEvent.click(screen.getByRole("button", { name: "역조공 카페" }));
    fireEvent.click(screen.getByRole("button", { name: "식사 같이" }));
    fireEvent.click(screen.getByRole("button", { name: "입장 같이" }));
    fireEvent.click(screen.getByRole("button", { name: "뒷풀이" }));

    expect(screen.getByRole("link", { name: "저장 (5/5)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "포카 교환" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "포카 교환" }));
    expect(screen.getByRole("link", { name: "저장 (5/5)" })).toBeInTheDocument();
  });

  it("renders CB-05 as the hi-fi create room form and reuses the tag modal selector", () => {
    renderWithConcerts(renderInShell("CB-05", <CreateRoomScreen />));

    expect(screen.getByText(/방장 승인/)).toBeInTheDocument();
    const concertInput = screen.getByLabelText("공연");
    expect(concertInput).toBeDisabled();
    expect(concertInput).toHaveValue("Stadium Tour — Night 1");
    expect(concertInput.closest(".body-scroll")).toHaveClass("!pt-[6px]");
    expect(screen.getByDisplayValue("굿즈 줄 같이 서고 카페까지 같이 가요")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/조용히 줄서고/)).toBeInTheDocument();
    expect(screen.getByText("방 태그")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "태그 추가" })).toBeInTheDocument();
    expect(screen.queryByText("굿즈 줄서기")).not.toBeInTheDocument();
    const venueInput = screen.getByLabelText("행사 장소 (공연장)");
    expect(venueInput).toBeDisabled();
    expect(venueInput).toHaveValue("KSPO Dome");
    expect(screen.getByText("집합 장소")).toBeInTheDocument();
    const meetTimeInput = screen.getByLabelText("집합 시간");
    expect(meetTimeInput).toHaveAttribute("type", "datetime-local");
    expect(meetTimeInput).toHaveValue("2026-06-15T14:00");
    const showPicker = vi.fn();
    Object.defineProperty(meetTimeInput, "showPicker", { configurable: true, value: showPicker });
    expect(meetTimeInput).toHaveClass("cursor-pointer");
    expect(fireEvent.pointerDown(meetTimeInput)).toBe(false);
    expect(showPicker).toHaveBeenCalledTimes(1);
    const submitButton = screen.getByRole("button", { name: "방 만들기" });
    expect(submitButton).toBeDisabled();
    expect(submitButton.parentElement).toHaveClass("fixed");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "태그 추가" }));

    expect(screen.getByRole("dialog", { name: "방 태그 선택" })).toBeInTheDocument();
    expect(screen.getByText("최대 4개까지 선택 · 사전 정의된 태그에서 골라요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장 (0/4)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "굿즈 줄서기" }));
    fireEvent.click(screen.getByRole("button", { name: "역조공 카페" }));
    fireEvent.click(screen.getByRole("button", { name: "식사 같이" }));
    fireEvent.click(screen.getByRole("button", { name: "입장 같이" }));
    expect(screen.getByRole("button", { name: "포카 교환" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "저장 (4/4)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "저장 (4/4)" }));
    expect(submitButton).toBeEnabled();
  });

  it("renders CB-06 as the hi-fi my rooms list with status filters and time sorting", () => {
    renderWithConcerts(renderInShell("CB-06", <MyRoomsScreen />));

    expect(screen.getByRole("heading", { name: "내 방" })).toBeInTheDocument();
    const filterGroup = screen.getByRole("group", { name: "내 방 상태 필터" });
    expect(within(filterGroup).getAllByRole("button").map((button) => button.textContent?.replace(/\s+/g, " ").trim())).toEqual([
      "전체",
      "방장 1",
      "참여중 2",
      "대기중 1"
    ]);

    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["오늘 / 이번 주", "지난 방"]);

    const currentSection = screen.getByRole("region", { name: "오늘 / 이번 주" });
    expect(within(currentSection).getAllByRole("link").map((link) => link.textContent)).toEqual([
      expect.stringContaining("근처 호텔 잡은 분, 굿즈만 같이 사실 분"),
      expect.stringContaining("굿즈 줄 같이 서고 카페까지 같이 가요"),
      expect.stringContaining("포카 교환 + 응원 챈트 맞춰봐요"),
      expect.stringContaining("공연 후 근처 맛집 사진 정리까지")
    ]);
    expect(within(currentSection).getByText("대기중")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /굿즈 줄 같이 서고 카페까지 같이 가요/ })).toHaveAttribute("href", "/rooms/r1");
    expect(screen.getByRole("link", { name: /근처 호텔 잡은 분/ })).toHaveAttribute("href", "/rooms/r2");
    expect(screen.getByRole("link", { name: /포카 교환/ })).toHaveAttribute("href", "/rooms/r3");
    expect(screen.queryByRole("heading", { name: "승인 대기" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "참여중 2" }));

    const joinedSection = screen.getByRole("region", { name: "오늘 / 이번 주" });
    expect(within(joinedSection).getAllByRole("link").map((link) => link.textContent)).toEqual([
      expect.stringContaining("근처 호텔 잡은 분, 굿즈만 같이 사실 분"),
      expect.stringContaining("공연 후 근처 맛집 사진 정리까지")
    ]);
    expect(screen.queryByRole("heading", { name: "승인 대기" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "대기중 1" }));

    const pendingSection = screen.getByRole("region", { name: "오늘 / 이번 주" });
    expect(within(pendingSection).getAllByRole("link").map((link) => link.textContent)).toEqual([
      expect.stringContaining("포카 교환 + 응원 챈트 맞춰봐요")
    ]);
  });

  it("renders CB-07 room detail from roomId with role-specific access", () => {
    const host = render(renderInShell("CB-07A", <RoomDetailScreen roomId="r1" />));

    expect(screen.getByText("내 역할: 방장 · 멤버 2 / 4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "오픈채팅" })).toHaveAttribute("href", "/rooms/r1?modal=open-chat");
    expect(screen.getByRole("link", { name: "Open Timeline" })).toHaveAttribute("href", "/timeline");
    host.unmount();

    const member = render(renderInShell("CB-07B", <RoomDetailScreen roomId="r2" />));

    expect(screen.getByText("참여 확정 · 멤버 3 / 4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "오픈채팅" })).toHaveAttribute("href", "/rooms/r2?modal=open-chat");
    expect(screen.queryByRole("button", { name: "탈퇴" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Timeline" })).toHaveAttribute("href", "/timeline");
    member.unmount();

    const pending = render(renderInShell("CB-07C", <RoomDetailScreen roomId="r3" />));

    expect(screen.getByText("승인 대기 중 · 신청 후 1시간")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "방장의 승인을 기다리는 중이에요" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "오픈채팅" })).not.toBeInTheDocument();
    pending.unmount();

    render(renderInShell("CB-07D", <RoomDetailScreen roomId="r4" />));

    expect(screen.getByText("공개 방 · 멤버 1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "입장 신청" })).toHaveAttribute("href", "/rooms/r4?modal=apply");
    expect(screen.queryByRole("link", { name: "Open Timeline" })).not.toBeInTheDocument();
  });

  it("summarizes CB-07A applicant tags and opens the full tag modal from the overflow chip", () => {
    render(renderInShell("CB-07A", <RoomDetailScreen roomId="r1" />));

    const overflow = screen.getByRole("button", { name: "army_p1 신청 태그 전체 보기" });
    expect(overflow).toHaveTextContent("+1");
    expect(overflow).toHaveClass("font-semibold");
    expect(overflow).toHaveClass("hover:bg-[rgba(253,190,13,.22)]");
    expect(overflow).toHaveStyle({ fontSize: "11px", fontWeight: "600" });
    expect(screen.queryByRole("button", { name: "borahae__ 신청 태그 전체 보기" })).not.toBeInTheDocument();
    expect(screen.queryByText("응원챈트")).not.toBeInTheDocument();

    fireEvent.click(overflow);

    const tagDialog = screen.getByRole("dialog", { name: "army_p1님의 신청 태그" });
    expect(within(tagDialog).getByText("굿즈 줄서기")).toBeInTheDocument();
    expect(within(tagDialog).getByText("역조공 카페")).toBeInTheDocument();
    expect(within(tagDialog).getByText("응원챈트")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "멤버 승인 확인" })).not.toBeInTheDocument();
    expect(screen.getByText("승인 대기 2")).toBeInTheDocument();

    fireEvent.click(within(tagDialog).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog", { name: "army_p1님의 신청 태그" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "army_p1 신청 태그 전체 보기" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "army_p1님의 신청 태그" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "army_p1 신청 태그 전체 보기" }));
    fireEvent.click(screen.getByLabelText("모달 배경"));
    expect(screen.queryByRole("dialog", { name: "army_p1님의 신청 태그" })).not.toBeInTheDocument();
  });

  it("confirms CB-07A applicant approval or rejection before applying local changes", () => {
    render(renderInShell("CB-07A", <RoomDetailScreen roomId="r1" />));

    expect(screen.getByText("승인 대기 2")).toBeInTheDocument();
    expect(screen.getByText("참여 멤버 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "army_p1 승인" }));

    const approveDialog = screen.getByRole("dialog", { name: "멤버 승인 확인" });
    expect(within(approveDialog).getByText(/army_p1/)).toBeInTheDocument();
    expect(screen.getByText("승인 대기 2")).toBeInTheDocument();
    expect(screen.getByText("참여 멤버 2")).toBeInTheDocument();

    fireEvent.click(within(approveDialog).getByRole("button", { name: "취소" }));

    expect(screen.queryByRole("dialog", { name: "멤버 승인 확인" })).not.toBeInTheDocument();
    expect(screen.getByText("승인 대기 2")).toBeInTheDocument();
    expect(screen.getByText("참여 멤버 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "army_p1 승인" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "멤버 승인 확인" })).getByRole("button", { name: "승인하기" }));

    expect(screen.getByText("승인 대기 1")).toBeInTheDocument();
    expect(screen.getByText("참여 멤버 3")).toBeInTheDocument();
    expect(screen.getByText("army_p1")).toBeInTheDocument();
    const approvedMember = screen.getByText("방금 승인").closest("div");
    expect(approvedMember).not.toBeNull();
    expect(within(approvedMember as HTMLElement).getByText("공통 관심 3개")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("army_p1 님을 멤버로 추가했어요");

    fireEvent.click(screen.getByRole("button", { name: "borahae__ 거절" }));

    const rejectDialog = screen.getByRole("dialog", { name: "신청 거절 확인" });
    expect(within(rejectDialog).getByText(/borahae__/)).toBeInTheDocument();
    expect(screen.getByText("승인 대기 1")).toBeInTheDocument();

    fireEvent.click(within(rejectDialog).getByRole("button", { name: "거절하기" }));

    expect(screen.queryByText("borahae__")).not.toBeInTheDocument();
    expect(screen.getByText("승인 대기 0")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("borahae__ 님의 신청을 삭제했어요");
  });

  it("keeps CB-07Dprime apply modal bounded to a 60 character message and routes actions", () => {
    render(renderInShell("CB-07Dprime", <RoomDetailScreen roomId="r4" showApplyModal />));

    const dialog = screen.getByRole("dialog", { name: "입장 신청 메시지" });
    const message = within(dialog).getByLabelText("신청 메시지");
    expect(message).toHaveAttribute("maxLength", "60");
    expect(within(dialog).getByText("0 / 60")).toBeInTheDocument();

    fireEvent.change(message, { target: { value: "가".repeat(65) } });

    expect(message).toHaveValue("가".repeat(60));
    expect(within(dialog).getByText("60 / 60")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "취소" })).toHaveAttribute("href", "/rooms/r4");
    expect(within(dialog).getByRole("link", { name: "신청하기" })).toHaveAttribute("href", "/rooms/pending");
  });

  it("guards CB-08 open chat modal to approved room roles only", () => {
    const pending = render(renderInShell("CB-07C", <RoomDetailScreen roomId="r3" showOpenChatModal />));

    expect(screen.queryByRole("dialog", { name: "오픈채팅 정보" })).not.toBeInTheDocument();
    pending.unmount();

    render(renderInShell("CB-07B", <RoomDetailScreen roomId="r2" showOpenChatModal />));

    expect(screen.getByRole("dialog", { name: "오픈채팅 정보" })).toBeInTheDocument();
  });

  it("copies CB-08 open chat fields and keeps only the close action", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });

    render(renderInShell("CB-08", <RoomDetailScreen roomId="r1" showOpenChatModal />));

    const dialog = screen.getByRole("dialog", { name: "오픈채팅 정보" });
    expect(within(dialog).getByText("승인된 멤버만 볼 수 있어요")).toBeInTheDocument();
    expect(within(dialog).getByText("open.kakao.com/o/aBcD9XyZ")).toBeInTheDocument();
    expect(within(dialog).getByText("2468")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /카카오톡 열기/ })).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole("button", { name: "닫기" })).toHaveLength(1);

    fireEvent.click(within(dialog).getByRole("button", { name: "오픈채팅 링크 복사" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("open.kakao.com/o/aBcD9XyZ"));
    expect(within(dialog).queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("링크를 복사했어요");
    expect(screen.getByRole("status")).toHaveClass("profile-toast");

    fireEvent.click(within(dialog).getByRole("button", { name: "오픈채팅 비밀번호 복사" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("2468"));
    expect(within(dialog).queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("비밀번호를 복사했어요");
    expect(screen.getByRole("status")).toHaveClass("profile-toast");
  });

  it("renders CB-09 map preview, today schedule, and route actions", () => {
    render(renderInShell("CB-09", <TimelineScreen />));

    expect(screen.getByText("MAP PREVIEW")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "D-Day 일정 보기" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "D+1 일정 보기" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("오늘 일정")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "지도 핀 1: 잠실역 5번 출구" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "지도 핀 2: KSPO Dome 굿즈 라인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "지도 핀 3: 잠실 카페 mood" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "지도 핀 공연: 공연 시작 (KSPO Dome)" })).toBeInTheDocument();
    expect(screen.getByText("공연 시작 19:00")).toBeInTheDocument();
    expect(screen.getByText("LOCKED")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /수정\s+CB-11/ })).toHaveAttribute("href", "/timetable");
    expect(screen.getByRole("link", { name: /지도\s+CB-12/ })).toHaveAttribute("href", "/map");
    expect(screen.queryByRole("link", { name: /추억/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("switches CB-09 to D+1 schedule without keeping D-Day map route artifacts", () => {
    const { container } = render(renderInShell("CB-09", <TimelineScreen />));

    expect(container.querySelector("polyline")).toHaveAttribute("points", "22,64 40,52 55,60 62,42");

    fireEvent.click(screen.getByRole("button", { name: "D+1 일정 보기" }));

    expect(screen.getByRole("button", { name: "D+1 일정 보기" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("D+1 일정")).toBeInTheDocument();
    expect(screen.queryByText("D+1 일정은 아직 등록되지 않았어요")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "지도 핀 1: 잠실 숙소 체크아웃" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /일정 1.*잠실 숙소 체크아웃/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "지도 핀 1: 잠실역 5번 출구" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /일정 1.*잠실역 5번 출구/ })).not.toBeInTheDocument();
    expect(container.querySelector("polyline")).toHaveAttribute("points", "28,48 50,44 68,60");
  });

  it("selects the matching CB-09 schedule card when a map pin is clicked", () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView
    });

    render(renderInShell("CB-09", <TimelineScreen />));

    const pin = screen.getByRole("button", { name: "지도 핀 3: 잠실 카페 mood" });
    fireEvent.click(pin);

    expect(pin).toHaveAttribute("aria-current", "true");
    expect(pin).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("button", { name: /일정 3.*잠실 카페 mood/ })).toHaveAttribute("data-selected", "true");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  });

  it("marks the matching CB-09 map pin active when schedule cards hover or focus", () => {
    render(renderInShell("CB-09", <TimelineScreen />));

    const pin = screen.getByRole("button", { name: "지도 핀 2: KSPO Dome 굿즈 라인" });
    const card = screen.getByRole("button", { name: /일정 2.*KSPO Dome 굿즈 라인/ });

    expect(pin).toHaveAttribute("data-active", "false");

    fireEvent.mouseEnter(card);
    expect(pin).toHaveAttribute("data-active", "true");
    expect(pin).toHaveClass("bg-[var(--cb-yellow)]");
    expect(pin).not.toHaveClass("bg-[var(--cb-yellow-dim)]");

    fireEvent.mouseLeave(card);
    expect(pin).toHaveAttribute("data-active", "false");

    fireEvent.focus(card);
    expect(pin).toHaveAttribute("data-active", "true");
    expect(pin).toHaveClass("bg-[var(--cb-yellow)]");
    expect(pin).not.toHaveClass("bg-[var(--cb-yellow-dim)]");
  });

  it("renders CB-10 search input, category chips, address candidates, and adds a place to the shared timetable", () => {
    render(renderInShell("CB-10", <PlaceSearchScreen />));

    expect(screen.getByText("장소 추가")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    const search = screen.getByRole("searchbox", { name: "장소명 또는 주소 검색" });
    expect(search).toHaveAttribute("placeholder", "장소명 또는 주소 검색");
    expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.change(search, { target: { value: "송파대로 123" } });

    expect(screen.getByText("주소 검색 결과 \"송파대로 123\"")).toBeInTheDocument();
    expect(screen.getByText("서울 송파구 송파대로 123")).toBeInTheDocument();
    expect(screen.getByText("서울 송파구 송파대로 123-1")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "토스트" } });
    fireEvent.click(screen.getByRole("button", { name: "식당" }));

    expect(screen.getByRole("button", { name: "식당" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("테이크아웃 토스트 잠실점")).toBeInTheDocument();
    expect(screen.queryByText("잠실 카페 mood")).not.toBeInTheDocument();

    const toastRow = screen.getByText("테이크아웃 토스트 잠실점").closest("[data-place-result]");
    expect(toastRow).not.toBeNull();

    fireEvent.click(within(toastRow as HTMLElement).getByRole("button", { name: "추가" }));

    expect(useAppStore.getState().timelineStopsByDay["d-day"].map((stop) => stop.place)).toContain("테이크아웃 토스트 잠실점");
    expect(within(toastRow as HTMLElement).getByRole("button", { name: "추가됨" })).toBeDisabled();
    expect(navigationMocks.push).toHaveBeenCalledWith("/timetable");
  });

  it("renders CB-11 block editor, updates steppers, and resets timetable changes", () => {
    act(() => {
      useAppStore.getState().addPlaceToTimetable("toast-jamsil");
    });

    render(renderInShell("CB-11", <TimetableEditScreen />));

    expect(screen.getByText("일정 수정")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "초기화" })).toBeInTheDocument();
    expect(screen.getByText("2026.06.15 (월) — D-Day")).toBeInTheDocument();
    expect(screen.getByText("장소 블록 · 이동 블록 · 잠긴 공연 블록 · (수정 모드) 여유 시간")).toBeInTheDocument();
    expect(screen.getByText("테이크아웃 토스트 잠실점")).toBeInTheDocument();

    const firstStop = screen.getByText("잠실역 5번 출구 (집합)").closest("[data-timetable-stop]");
    expect(firstStop).not.toBeNull();
    fireEvent.click(within(firstStop as HTMLElement).getByRole("button", { name: "잠실역 5번 출구 머무는 시간 증가" }));
    expect(within(firstStop as HTMLElement).getByText("25분")).toBeInTheDocument();

    const firstRoute = screen.getByText("도보 · 0.8km").closest("[data-route-block]");
    expect(firstRoute).not.toBeNull();
    fireEvent.click(within(firstRoute as HTMLElement).getByRole("button", { name: "택시" }));
    expect(within(firstRoute as HTMLElement).getByRole("button", { name: "택시" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "초기화" }));

    expect(screen.queryByText("테이크아웃 토스트 잠실점")).not.toBeInTheDocument();
    expect(screen.getByText("15분")).toBeInTheDocument();
  });

  it("reorders CB-11 timetable stops by dragging the grip handle", () => {
    render(renderInShell("CB-11", <TimetableEditScreen />));

    const firstGrip = screen.getByRole("button", { name: "잠실역 5번 출구 순서 이동" });
    const thirdStop = screen.getByText("잠실 카페 mood").closest("[data-timetable-stop]");
    const dragData = new Map<string, string>();
    const dataTransfer = {
      dropEffect: "move",
      effectAllowed: "move",
      getData: (format: string) => dragData.get(format) ?? "",
      setData: (format: string, data: string) => dragData.set(format, data)
    };
    expect(thirdStop).not.toBeNull();

    fireEvent.dragStart(firstGrip, { dataTransfer });
    fireEvent.dragOver(thirdStop as HTMLElement, { clientY: 1, dataTransfer });
    fireEvent.drop(thirdStop as HTMLElement, { clientY: 1, dataTransfer });

    expect(useAppStore.getState().timelineStopsByDay["d-day"].map((stop) => stop.place)).toEqual([
      "KSPO Dome 굿즈 라인",
      "잠실 카페 mood",
      "잠실역 5번 출구",
      "공연 시작 (KSPO Dome)"
    ]);
    expect(screen.getAllByTestId("timetable-place-name").map((node) => node.textContent)).toEqual([
      "KSPO Dome 굿즈 라인",
      "잠실 카페 mood",
      "잠실역 5번 출구 (집합)",
      "공연 시작 (KSPO Dome)"
    ]);
  });

  it("reflects CB-11 timetable edits in CB-09 timeline", () => {
    const timetable = render(renderInShell("CB-11", <TimetableEditScreen />));
    const firstStop = screen.getByText("잠실역 5번 출구 (집합)").closest("[data-timetable-stop]");
    expect(firstStop).not.toBeNull();

    fireEvent.click(within(firstStop as HTMLElement).getByRole("button", { name: "잠실역 5번 출구 머무는 시간 증가" }));
    timetable.unmount();

    render(renderInShell("CB-09", <TimelineScreen />));

    expect(screen.getByText("머무는 시간 25분")).toBeInTheDocument();
  });

  it("renders CB-12 from the same shared timetable data", () => {
    act(() => {
      useAppStore.getState().addPlaceToTimetable("toast-jamsil");
    });

    render(renderInShell("CB-12", <MapScreen />));

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "필터" })).not.toBeInTheDocument();
    const toastPin = screen.getByRole("button", { name: "지도 핀 4: 테이크아웃 토스트 잠실점" });
    expect(toastPin).toBeInTheDocument();

    fireEvent.click(toastPin);

    expect(screen.getByText("테이크아웃 토스트 잠실점")).toBeInTheDocument();
    expect(screen.getByText("식당 · Kakao")).toBeInTheDocument();
  });

  it("renders CB-13 as a read-only memory feed without unconnected actions", () => {
    render(renderInShell("CB-13", <MemoryFeedScreen />));

    expect(screen.getByText("우리 방 추억")).toBeInTheDocument();
    expect(screen.getByText("사진 12 · 영상 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "더보기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /업로드/ })).not.toBeInTheDocument();
  });

  it("moves CB-12 to the next route and centers the focused map pin", () => {
    const { container } = render(renderInShell("CB-12", <MapScreen />));

    const mockLayer = container.querySelector("[data-map-focus-layer]");
    expect(mockLayer).toHaveAttribute("data-centered-stop", "s1");
    expect(mockLayer).toHaveStyle({ transform: "translate(28%, -14%)" });

    fireEvent.click(screen.getByRole("button", { name: "다음 동선으로 이동" }));

    expect(screen.getByText("KSPO Dome 굿즈 라인")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "지도 핀 2: KSPO Dome 굿즈 라인" })).toHaveAttribute("aria-current", "true");
    expect(mockLayer).toHaveAttribute("data-centered-stop", "s2");
    expect(mockLayer).toHaveStyle({ transform: "translate(10%, -2%)" });
  });

  it("renders CB-11prime warning modal and returns to the editor without resetting edits", () => {
    act(() => {
      useAppStore.getState().addPlaceToTimetable("toast-jamsil");
    });

    render(renderInShell("CB-11prime", <TimetableEditScreen showWarning />));

    expect(screen.getByText("＋ 장소 1개 추가됨 · 자동 역산 결과")).toBeInTheDocument();
    const dialog = screen.getByRole("dialog", { name: "지금 일정을 전부 소화할 수 없습니다" });
    expect(within(dialog).getByText("공연 시작 시간을 기준으로 역산했어요")).toBeInTheDocument();
    expect(within(dialog).getByText("사용 가능 시간 14:00 – 18:30 · 4h 30m")).toBeInTheDocument();
    expect(within(dialog).getByText(/초과 시간/)).toBeInTheDocument();
    expect(within(dialog).getByText(/\+\s*\d+분/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "되돌아가서 수정" }));

    expect(useAppStore.getState().timelineStopsByDay["d-day"].map((stop) => stop.place)).toContain("테이크아웃 토스트 잠실점");
    expect(navigationMocks.push).toHaveBeenCalledWith("/timetable");
  });

  it("does not render CB-11prime warning modal when the current timetable is not over-time", () => {
    render(renderInShell("CB-11prime", <TimetableEditScreen showWarning />));

    expect(screen.queryByRole("dialog", { name: "지금 일정을 전부 소화할 수 없습니다" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "수정 완료" })).toBeInTheDocument();
  });

  it("renders CB-14 profile with edit and my-room routing plus WIP feedback", () => {
    vi.useFakeTimers();
    try {
      renderWithConcerts(renderInShell("CB-14", <ProfileScreen />));

      expect(screen.getByRole("heading", { name: "프로필" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /moon_armies/ })).toHaveAttribute("href", "/profile/edit");
      expect(screen.getByText("20대 · 여성")).toBeInTheDocument();
      expect(screen.getByText("가입 2026.05.10")).toBeInTheDocument();
      expect(screen.queryByText("추억 사진")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: /4\s*참여 중인 방/ })).toHaveAttribute("href", "/my-rooms");
      expect(screen.getByRole("link", { name: /1\s*완료한 공연/ })).toHaveAttribute("href", "/my-rooms");

      fireEvent.click(screen.getByRole("button", { name: /알림 설정/ }));
      expect(screen.getByRole("status")).toHaveTextContent("개발중인 기능입니다");
      expect(screen.getByRole("status")).toHaveClass("fixed", "bottom-[76px]", "z-30", "profile-toast");

      fireEvent.click(screen.getByRole("button", { name: /도움말 \/ FAQ/ }));
      expect(screen.getByRole("status")).toHaveTextContent("도움말 / FAQ");

      act(() => {
        vi.advanceTimersByTime(1800);
      });
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders CB-14prime profile edit with nickname, age, gender, and bottom save", () => {
    renderWithConcerts(renderInShell("CB-14prime", <ProfileEditScreen />));

    expect(screen.getByRole("heading", { name: "프로필 수정" })).toBeInTheDocument();
    expect(screen.getByLabelText("닉네임")).toHaveValue("moon_armies");
    expect(screen.getByText("11 / 12")).toBeInTheDocument();
    expect(screen.queryByLabelText("소개글")).not.toBeInTheDocument();

    const ageGroup = screen.getByRole("group", { name: "연령대 선택" });
    expect(within(ageGroup).getAllByRole("button").map((button) => button.textContent)).toEqual(["10대", "20대", "30대", "40대+", "비공개"]);
    expect(within(ageGroup).getByRole("button", { name: "20대" })).toHaveAttribute("aria-pressed", "true");

    const genderGroup = screen.getByRole("group", { name: "성별 선택" });
    expect(within(genderGroup).getAllByRole("button").map((button) => button.textContent)).toEqual(["여성", "남성"]);
    expect(within(genderGroup).getByRole("button", { name: "여성" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(ageGroup).getByRole("button", { name: "30대" }));
    expect(within(ageGroup).getByRole("button", { name: "30대" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "저장" })).toHaveAttribute("href", "/profile");
  });
});
