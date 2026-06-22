import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { concerts } from "@/lib/data";
import { pendingPlaceStorageKey } from "@/lib/api/places";
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
import { RoomDetailConnectedScreen } from "../rooms/_components/room-detail-connected-screen";
import { RoomListScreen } from "../rooms/_components/room-list-screen";
import { TimetableEditScreen } from "../timetable/_components/timetable-edit-screen";
import { TimelineScreen } from "../timeline/_components/timeline-screen";
import { getScreenById, type ScreenId } from "../_lib/routes";
import { ScreenShell } from "./screen-shell";

const navigationMocks = vi.hoisted(() => ({
  back: vi.fn(),
  pathname: "/rooms",
  push: vi.fn(),
  replace: vi.fn(),
  searchParams: "",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({
    back: navigationMocks.back,
    push: navigationMocks.push,
    replace: navigationMocks.replace,
  }),
  useSearchParams: () => new URLSearchParams(navigationMocks.searchParams),
}));

const concertListFixture = [
  {
    id: 1,
    title: "AURORA LIVE",
    venueName: "KSPO Dome",
    startAt: "2099-01-01T19:00:00+09:00",
    endAt: null,
    lat: 37.519,
    lng: 127.127,
    source: "KOPIS",
    posterUrl: null,
    area: "서울특별시",
    genre: "대중음악",
    timeGuidance: null,
    openRoomCount: 3,
  },
  {
    id: 2,
    title: "MOON SYNC TOUR",
    venueName: "잠실실내체육관",
    startAt: "2099-01-02T19:00:00+09:00",
    endAt: null,
    lat: 37.5133,
    lng: 127.1002,
    source: "KOPIS",
    posterUrl: null,
    area: "서울특별시",
    genre: "대중음악",
    timeGuidance: null,
    openRoomCount: 1,
  },
];

const httpMocks = vi.hoisted(() => ({
  patch: vi.fn().mockResolvedValue({ data: { result: {} } }),
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn().mockResolvedValue({
    data: { result: { roomId: 10, scheduleId: 20 } },
  }),
}));

vi.mock("@/lib/api/http", () => ({
  http: {
    patch: httpMocks.patch,
    get: httpMocks.get,
    put: httpMocks.put,
    post: httpMocks.post,
  },
}));

const concertDetailFixture = {
  id: 100,
  title: "Stadium Tour - Night 1",
  venueName: "KSPO Dome",
  startAt: "2099-06-15T19:00:00+09:00",
  endAt: null,
  lat: 37.5196,
  lng: 127.1273,
  source: "KOPIS",
  posterUrl: null,
  area: "서울특별시",
  genre: "대중음악",
  timeGuidance: null,
  openRoomCount: 12,
};

const userProfileFixture = {
  id: 1,
  nickname: "moon_armies",
  ageRange: "TWENTIES",
  gender: "FEMALE",
  profileCompleted: true,
  avatarColor: "#FACC15",
  participatingRoomCount: 2,
  pendingRoomCount: 1,
};

const roomListItemFixture = {
  id: 10,
  title: "굿즈 줄 같이 서고 카페까지 같이 가요",
  hostNickname: "moon_armies",
  status: "OPEN",
  isFull: false,
  memberCount: 2,
  maxMembers: 4,
  meetingAt: "2099-06-15T14:00:00+09:00",
  meetingPlaceName: "잠실역 5번 출구",
  roomTags: ["GOODS_BUYING", "CAFE_VISIT"],
  matchCount: 0,
};

function envelope<T>(result: T) {
  return {
    data: {
      isSuccess: true,
      code: "COMMON200",
      message: "요청에 성공했습니다.",
      result,
    },
  };
}

function mockCb04Endpoints({
  interestTags = [] as string[],
  roomItems = [roomListItemFixture],
} = {}) {
  httpMocks.get.mockImplementation((url: string) => {
    if (url.includes("/interest-tags/me")) {
      return Promise.resolve(envelope({ tags: interestTags }));
    }
    if (url.includes("/rooms")) {
      return Promise.resolve(
        envelope({ items: roomItems, page: 0, size: 20, hasNext: false }),
      );
    }
    if (url.startsWith("/api/concerts/")) {
      return Promise.resolve(envelope(concertDetailFixture));
    }
    return Promise.resolve(
      envelope({ items: [], page: 0, size: 3, hasNext: false }),
    );
  });
}

function renderInShell(screenId: ScreenId, children: React.ReactNode) {
  return <ScreenShell screen={getScreenById(screenId)}>{children}</ScreenShell>;
}

function renderWithConcerts(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });
  queryClient.setQueryData(["concerts"], concerts);
  queryClient.setQueryData(["user", "me"], userProfileFixture);

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("BuddyDuckApp screens", () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true);
    navigationMocks.back.mockClear();
    navigationMocks.push.mockClear();
    navigationMocks.replace.mockClear();
    navigationMocks.searchParams = "";
    sessionStorage.clear();
    httpMocks.get.mockReset();
    httpMocks.put.mockReset();
    httpMocks.put.mockResolvedValue(envelope({ tags: [] }));
    httpMocks.get.mockResolvedValue({
      data: {
        isSuccess: true,
        code: "COMMON200",
        message: "요청에 성공했습니다.",
        result: { items: concertListFixture, page: 0, size: 3, hasNext: false },
      },
    });
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
    expect(
      screen
        .getByRole("link", { name: /카카오로 시작하기/ })
        .getAttribute("href"),
    ).toContain("https://kauth.kakao.com/oauth/authorize");
    expect(
      screen.queryByRole("button", { name: "데모 로그인 (발표용)" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("requires nickname, age, and gender before enabling CB-02 completion", async () => {
    httpMocks.patch.mockClear();
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        {renderInShell("CB-02", <NicknameScreen />)}
      </QueryClientProvider>,
    );

    expect(screen.getByRole("button", { name: "완료" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "비공개" }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("닉네임 입력"), {
      target: { value: "duck_20" },
    });
    expect(screen.getByText("7 / 12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "완료" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "20대" }));
    expect(screen.getByRole("button", { name: "완료" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "여성" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "완료" })).toBeEnabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    await waitFor(() =>
      expect(httpMocks.patch).toHaveBeenCalledWith("/api/users/me/profile", {
        nickname: "duck_20",
        ageRange: "TWENTIES",
        gender: "FEMALE",
      }),
    );
    await waitFor(() =>
      expect(navigationMocks.push).toHaveBeenCalledWith("/home"),
    );
  });

  it("debounces CB-03 search input and requests the API with the keyword", async () => {
    renderWithConcerts(renderInShell("CB-03", <HomeScreen />));

    expect(screen.getByText("공연 찾기")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "공연 필터" }),
    ).not.toBeInTheDocument();
    const search = screen.getByRole("searchbox", { name: "공연 검색" });
    expect(search).toHaveAttribute("placeholder", "공연명 / 지역 검색");
    expect(screen.queryByText("이번 주 관심 태그")).not.toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText("AURORA LIVE")).toBeInTheDocument(),
    );

    httpMocks.get.mockClear();
    fireEvent.change(search, { target: { value: "잠실" } });

    await waitFor(() =>
      expect(httpMocks.get).toHaveBeenCalledWith(
        "/api/concerts",
        expect.objectContaining({
          params: expect.objectContaining({ keyword: "잠실" }),
        }),
      ),
    );
  });

  it("renders CB-03 bottom navigation with home, my room, and profile only", async () => {
    renderWithConcerts(renderInShell("CB-03", <HomeScreen />));
    await waitFor(() =>
      expect(screen.getByText("AURORA LIVE")).toBeInTheDocument(),
    );

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveTextContent("홈");
    expect(nav).toHaveTextContent("내 방");
    expect(nav).toHaveTextContent("프로필");
    expect(
      screen.queryByRole("link", { name: "동행" }),
    ).not.toBeInTheDocument();
  });

  it("renders CB-04 as the hi-fi room list with an empty interest tag state and fixed create action", async () => {
    navigationMocks.searchParams = "concertId=100";
    mockCb04Endpoints();
    renderWithConcerts(renderInShell("CB-04", <RoomListScreen />));

    await waitFor(() =>
      expect(screen.getByText("Stadium Tour - Night 1")).toBeInTheDocument(),
    );
    expect(screen.getByText("이 공연에서 내 관심 태그")).toBeInTheDocument();
    expect(screen.getByText("설정해 둔 태그가 없습니다")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /편집/ })).toHaveAttribute(
      "href",
      "/rooms?concertId=100&modal=tags",
    );
    expect(screen.getByText("매칭 많은 순")).toBeInTheDocument();
    expect(screen.getByText("날짜순")).toBeInTheDocument();
    expect(screen.getByText("정원순")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText("굿즈 줄 같이 서고 카페까지 같이 가요"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("굿즈 구매")).toBeInTheDocument();
    expect(screen.getByText("카페 투어")).toBeInTheDocument();
    // The room card carries the concert-scoped list as its back target so the detail
    // screen's 뒤로가기 returns to /rooms?concertId=100 instead of the unfiltered list.
    expect(
      screen.getByRole("link", {
        name: /굿즈 줄 같이 서고 카페까지 같이 가요/,
      }),
    ).toHaveAttribute(
      "href",
      `/rooms/10?back=${encodeURIComponent("/rooms?concertId=100")}`,
    );
    expect(screen.queryByText(/match/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "방 만들기" })).toHaveAttribute(
      "href",
      "/rooms/create?concertId=100",
    );
    expect(
      screen.queryByRole("button", { name: "공유" }),
    ).not.toBeInTheDocument();
  });

  it("applies hover affordances to CB-04 room cards and controls", async () => {
    navigationMocks.searchParams = "concertId=100";
    mockCb04Endpoints();
    renderWithConcerts(renderInShell("CB-04", <RoomListScreen />));

    await waitFor(() =>
      expect(
        screen.getByText("굿즈 줄 같이 서고 카페까지 같이 가요"),
      ).toBeInTheDocument(),
    );

    expect(screen.getByRole("link", { name: "뒤로" })).toHaveClass(
      "hover:bg-[var(--cb-surface-3)]",
    );
    const roomLink = screen.getByRole("link", {
      name: /굿즈 줄 같이 서고 카페까지 같이 가요/,
    });
    expect(roomLink).toHaveClass("group");
    expect(roomLink.firstElementChild).toHaveClass("interactive-surface-card");

    expect(screen.getByRole("button", { name: "매칭 많은 순" })).toHaveClass(
      "hover:bg-[var(--cb-yellow-2)]",
    );
    expect(screen.getByRole("button", { name: "날짜순" })).toHaveClass(
      "hover:bg-[var(--cb-surface-3)]",
    );
    expect(screen.getByRole("link", { name: "방 만들기" })).toHaveClass(
      "hover:bg-[var(--cb-yellow-2)]",
    );
  });

  it("applies focus-visible affordances to concert cards and bottom navigation", async () => {
    renderWithConcerts(renderInShell("CB-03", <HomeScreen />));
    await waitFor(() =>
      expect(screen.getByText("AURORA LIVE")).toBeInTheDocument(),
    );

    const concertLink = screen.getByRole("link", {
      name: /AURORA LIVE/,
    });
    expect(concertLink).toHaveClass("hover:bg-[var(--cb-surface-2)]");
    expect(concertLink).toHaveClass("active:scale-[0.99]");
    expect(concertLink).toHaveClass("focus-visible:outline-2");

    const homeNav = screen.getByRole("link", { name: "홈" });
    expect(homeNav).toHaveClass("hover:bg-[var(--cb-surface-2)]");
    expect(homeNav).toHaveClass("active:scale-[0.98]");
    expect(homeNav).toHaveClass("focus-visible:outline-2");
  });

  it("renders CB-04prime tag modal and prevents selecting more than five tags", () => {
    renderWithConcerts(
      renderInShell("CB-04prime", <RoomListScreen showTagModal />),
    );

    expect(
      screen.getByRole("dialog", { name: "관심 태그 선택" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("최대 5개까지 선택 · 사전 정의된 태그에서 골라요"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "저장 (0/5)" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "굿즈 구매" }));
    fireEvent.click(screen.getByRole("button", { name: "카페 투어" }));
    fireEvent.click(screen.getByRole("button", { name: "식사 같이" }));
    fireEvent.click(screen.getByRole("button", { name: "포토 스팟" }));
    fireEvent.click(screen.getByRole("button", { name: "포카 교환" }));

    expect(
      screen.getByRole("button", { name: "저장 (5/5)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "입장 대기" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "입장 대기" }));
    expect(
      screen.getByRole("button", { name: "저장 (5/5)" }),
    ).toBeInTheDocument();
  });

  it("saves CB-04prime interest tags via PUT and navigates back to the room list", async () => {
    navigationMocks.searchParams = "concertId=100";
    mockCb04Endpoints();
    renderWithConcerts(
      renderInShell("CB-04prime", <RoomListScreen showTagModal />),
    );

    fireEvent.click(screen.getByRole("button", { name: "굿즈 구매" }));
    fireEvent.click(screen.getByRole("button", { name: "카페 투어" }));
    fireEvent.click(screen.getByRole("button", { name: "저장 (2/5)" }));

    await waitFor(() =>
      expect(httpMocks.put).toHaveBeenCalledWith(
        "/api/concerts/100/interest-tags/me",
        { tags: ["GOODS_BUYING", "CAFE_VISIT"] },
      ),
    );
    await waitFor(() =>
      expect(navigationMocks.push).toHaveBeenCalledWith("/rooms?concertId=100"),
    );
  });

  it("renders CB-05 create room wired to concert detail and the tag modal", async () => {
    navigationMocks.searchParams = "concertId=100";
    httpMocks.get.mockResolvedValue(envelope(concertDetailFixture));
    renderWithConcerts(renderInShell("CB-05", <CreateRoomScreen />));

    expect(screen.getByText(/방장 승인/)).toBeInTheDocument();
    // 공연 / 행사 장소 come from CONCERT-002 detail (eventPlace source), not hardcoded.
    const concertInput = screen.getByLabelText("공연");
    expect(concertInput).toBeDisabled();
    await waitFor(() =>
      expect(concertInput).toHaveValue("Stadium Tour - Night 1"),
    );
    expect(concertInput.closest(".body-scroll")).toHaveClass("!pt-[6px]");
    const venueInput = screen.getByLabelText("행사 장소 (공연장)");
    expect(venueInput).toBeDisabled();
    expect(venueInput).toHaveValue("KSPO Dome");

    expect(screen.getByText("방 태그")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "태그 추가" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("굿즈 구매")).not.toBeInTheDocument();

    // 1박 일정 toggle was removed; the meeting place is now a Kakao map picker.
    expect(screen.queryByText("1박 일정")).not.toBeInTheDocument();
    expect(screen.getByText("집합 장소")).toBeInTheDocument();
    expect(screen.getByLabelText("집합 장소 검색")).toBeInTheDocument();

    const meetTimeInput = screen.getByLabelText("집합 시간");
    expect(meetTimeInput).toHaveAttribute("type", "datetime-local");
    const showPicker = vi.fn();
    Object.defineProperty(meetTimeInput, "showPicker", {
      configurable: true,
      value: showPicker,
    });
    expect(meetTimeInput).toHaveClass("cursor-pointer");
    expect(fireEvent.pointerDown(meetTimeInput)).toBe(false);
    expect(showPicker).toHaveBeenCalledTimes(1);

    const submitButton = screen.getByRole("button", { name: "방 만들기" });
    expect(submitButton).toBeDisabled();
    expect(submitButton.parentElement).toHaveClass("fixed");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "태그 추가" }));

    expect(
      screen.getByRole("dialog", { name: "방 태그 선택" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("최대 4개까지 선택 · 사전 정의된 태그에서 골라요"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "저장 (0/4)" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "굿즈 구매" }));
    fireEvent.click(screen.getByRole("button", { name: "카페 투어" }));
    fireEvent.click(screen.getByRole("button", { name: "식사 같이" }));
    fireEvent.click(screen.getByRole("button", { name: "포토 스팟" }));
    expect(screen.getByRole("button", { name: "포카 교환" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "저장 (4/4)" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "저장 (4/4)" }));
    // Still disabled: required title / 집합 시간 / 오픈채팅 URL / 집합 장소 not yet provided.
    expect(submitButton).toBeDisabled();
    expect(httpMocks.post).not.toHaveBeenCalled();
  });

  it("renders CB-06 my rooms from ROOM-004 with client-derived status filters", async () => {
    httpMocks.get.mockResolvedValue(
      envelope({
        items: [
          {
            roomId: 10,
            title: "굿즈 동선 같이 맞출 분",
            viewerRole: "HOST",
            viewerJoinStatus: "APPROVED",
            roomStatus: "OPEN",
            concertTitle: "AURORA LIVE",
            concertStartAt: "2099-07-05T19:00:00+09:00",
            daysUntilConcert: 14,
            venueName: "KSPO Dome",
            meetingAt: "2099-07-05T14:00:00+09:00",
            meetingPlaceName: "잠실역 5번 출구",
            meetingPlaceAddress: "서울 송파구 잠실동",
            memberCount: 3,
            maxMembers: 4,
            pendingJoinRequestCount: 2,
          },
          {
            roomId: 11,
            title: "카페 투어 같이 가요",
            viewerRole: "MEMBER",
            viewerJoinStatus: "APPROVED",
            roomStatus: "OPEN",
            concertTitle: "MOON SYNC TOUR",
            concertStartAt: "2099-07-06T19:00:00+09:00",
            daysUntilConcert: 15,
            venueName: "잠실실내체육관",
            meetingAt: "2099-07-06T13:00:00+09:00",
            meetingPlaceName: "잠실역 3번 출구",
            meetingPlaceAddress: "서울 송파구 잠실동",
            memberCount: 2,
            maxMembers: 4,
            pendingJoinRequestCount: 0,
          },
          {
            roomId: 12,
            title: "포카 교환할 분 찾아요",
            viewerRole: "MEMBER",
            viewerJoinStatus: "PENDING",
            roomStatus: "OPEN",
            concertTitle: "AURORA LIVE",
            concertStartAt: "2099-07-05T19:00:00+09:00",
            daysUntilConcert: 14,
            venueName: "KSPO Dome",
            meetingAt: "2099-07-05T16:00:00+09:00",
            meetingPlaceName: "8번 출구",
            meetingPlaceAddress: "서울 송파구 잠실동",
            memberCount: 1,
            maxMembers: 4,
            pendingJoinRequestCount: 0,
          },
        ],
        page: 0,
        size: 20,
        hasNext: false,
      }),
    );

    renderWithConcerts(renderInShell("CB-06", <MyRoomsScreen />));

    expect(screen.getByRole("heading", { name: "내 방" })).toBeInTheDocument();

    // Wait for the ROOM-004 query to resolve, then scope assertions to the list region
    // so BottomNav links are excluded.
    await screen.findByRole("link", { name: /굿즈 동선 같이 맞출 분/ });
    // `tab` is optional with an undocumented enum, so it is omitted from the request.
    expect(httpMocks.get).toHaveBeenCalledWith(
      "/api/me/rooms",
      expect.objectContaining({ params: {} }),
    );

    const filterGroup = screen.getByRole("group", { name: "내 방 상태 필터" });
    expect(
      within(filterGroup)
        .getAllByRole("button")
        .map((button) => button.textContent?.replace(/\s+/g, " ").trim()),
    ).toEqual(["전체", "방장 1", "참여중 1", "대기중 1"]);

    const list = () => screen.getByRole("region", { name: "내 방 목록" });
    expect(
      within(list())
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      expect.stringContaining("굿즈 동선 같이 맞출 분"),
      expect.stringContaining("카페 투어 같이 가요"),
      expect.stringContaining("포카 교환할 분 찾아요"),
    ]);

    // Reduced card: title + role/status badge + link to the backend-driven per-id detail.
    // Each link carries /my-rooms as its back target so the detail 뒤로가기 returns here.
    const myRoomsBack = `?back=${encodeURIComponent("/my-rooms")}`;
    expect(
      within(list()).getByRole("link", { name: /굿즈 동선 같이 맞출 분/ }),
    ).toHaveAttribute("href", `/rooms/10${myRoomsBack}`);
    expect(
      within(list()).getByRole("link", { name: /카페 투어 같이 가요/ }),
    ).toHaveAttribute("href", `/rooms/11${myRoomsBack}`);
    const pendingCard = within(list()).getByRole("link", {
      name: /포카 교환할 분 찾아요/,
    });
    expect(pendingCard).toHaveAttribute("href", `/rooms/12${myRoomsBack}`);
    expect(within(pendingCard).getByText("승인 대기 중")).toBeInTheDocument();

    // Wireframe-style rich fields from the updated ROOM-004 payload.
    const hostCard = within(list()).getByRole("link", {
      name: /굿즈 동선 같이 맞출 분/,
    });
    expect(within(hostCard).getByText(/AURORA LIVE/)).toBeInTheDocument();
    expect(within(hostCard).getByText(/KSPO Dome/)).toBeInTheDocument();
    expect(within(hostCard).getByText("잠실역 5번 출구")).toBeInTheDocument();
    expect(within(hostCard).getByText("멤버 3 / 4")).toBeInTheDocument();
    expect(within(hostCard).getByText("승인 대기 2건")).toBeInTheDocument();
    expect(within(hostCard).getByText("D-14")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "참여중 1" }));
    expect(
      within(list())
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([expect.stringContaining("카페 투어 같이 가요")]);

    fireEvent.click(screen.getByRole("button", { name: "대기중 1" }));
    expect(
      within(list())
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([expect.stringContaining("포카 교환할 분 찾아요")]);
  });

  it("shows 종료 instead of D-DAY once the concert date has passed", async () => {
    // daysUntilConcert is intentionally 0 here to prove the badge is driven by the real
    // concert date, not a stale/clamped countdown value.
    httpMocks.get.mockResolvedValue(
      envelope({
        items: [
          {
            roomId: 20,
            title: "지난 공연 같이 간 방",
            viewerRole: "MEMBER",
            viewerJoinStatus: "APPROVED",
            roomStatus: "CLOSED",
            concertTitle: "PAST FEST",
            concertStartAt: "2020-01-01T19:00:00+09:00",
            daysUntilConcert: 0,
            venueName: "올림픽홀",
            meetingAt: "2020-01-01T16:00:00+09:00",
            meetingPlaceName: "올림픽공원역",
            meetingPlaceAddress: "서울 송파구",
            memberCount: 4,
            maxMembers: 4,
            pendingJoinRequestCount: 0,
          },
        ],
        page: 0,
        size: 1,
        hasNext: false,
      }),
    );

    renderWithConcerts(renderInShell("CB-06", <MyRoomsScreen />));

    const card = await screen.findByRole("link", {
      name: /지난 공연 같이 간 방/,
    });
    expect(within(card).getByText("종료")).toBeInTheDocument();
    expect(within(card).queryByText("D-DAY")).not.toBeInTheDocument();
  });

  it("renders CB-07 room detail from roomId with role-specific access", () => {
    const host = render(
      renderInShell("CB-07A", <RoomDetailScreen roomId="r1" />),
    );

    expect(screen.getByText("내 역할: 방장 · 멤버 2 / 4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "오픈채팅" })).toHaveAttribute(
      "href",
      "/rooms/r1?modal=open-chat",
    );
    expect(screen.getByRole("link", { name: "Open Timeline" })).toHaveAttribute(
      "href",
      "/timeline",
    );
    host.unmount();

    const member = render(
      renderInShell("CB-07B", <RoomDetailScreen roomId="r2" />),
    );

    expect(screen.getByText("참여 확정 · 멤버 3 / 4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "오픈채팅" })).toHaveAttribute(
      "href",
      "/rooms/r2?modal=open-chat",
    );
    expect(
      screen.queryByRole("button", { name: "탈퇴" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Timeline" })).toHaveAttribute(
      "href",
      "/timeline",
    );
    member.unmount();

    const pending = render(
      renderInShell("CB-07C", <RoomDetailScreen roomId="r3" />),
    );

    expect(
      screen.getByText("승인 대기 중 · 신청 후 1시간"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "방장의 승인을 기다리는 중이에요" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("link", { name: "오픈채팅" }),
    ).not.toBeInTheDocument();
    pending.unmount();

    render(renderInShell("CB-07D", <RoomDetailScreen roomId="r4" />));

    expect(screen.getByText("공개 방 · 멤버 1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "입장 신청" })).toHaveAttribute(
      "href",
      "/rooms/r4?modal=apply",
    );
    expect(
      screen.queryByRole("link", { name: "Open Timeline" }),
    ).not.toBeInTheDocument();
  });

  it("summarizes CB-07A applicant tags and opens the full tag modal from the overflow chip", () => {
    render(renderInShell("CB-07A", <RoomDetailScreen roomId="r1" />));

    const overflow = screen.getByRole("button", {
      name: "army_p1 신청 태그 전체 보기",
    });
    expect(overflow).toHaveTextContent("+1");
    expect(overflow).toHaveClass("font-semibold");
    expect(overflow).toHaveClass("hover:bg-[rgba(253,190,13,.22)]");
    expect(overflow).toHaveStyle({ fontSize: "11px", fontWeight: "600" });
    expect(
      screen.queryByRole("button", { name: "borahae__ 신청 태그 전체 보기" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("응원챈트")).not.toBeInTheDocument();

    fireEvent.click(overflow);

    const tagDialog = screen.getByRole("dialog", {
      name: "army_p1님의 신청 태그",
    });
    expect(within(tagDialog).getByText("굿즈 줄서기")).toBeInTheDocument();
    expect(within(tagDialog).getByText("역조공 카페")).toBeInTheDocument();
    expect(within(tagDialog).getByText("응원챈트")).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "멤버 승인 확인" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("승인 대기 2")).toBeInTheDocument();

    fireEvent.click(within(tagDialog).getByRole("button", { name: "닫기" }));
    expect(
      screen.queryByRole("dialog", { name: "army_p1님의 신청 태그" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "army_p1 신청 태그 전체 보기" }),
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "army_p1님의 신청 태그" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "army_p1 신청 태그 전체 보기" }),
    );
    fireEvent.click(screen.getByLabelText("모달 배경"));
    expect(
      screen.queryByRole("dialog", { name: "army_p1님의 신청 태그" }),
    ).not.toBeInTheDocument();
  });

  it("confirms CB-07A applicant approval or rejection before applying local changes", () => {
    render(renderInShell("CB-07A", <RoomDetailScreen roomId="r1" />));

    expect(screen.getByText("승인 대기 2")).toBeInTheDocument();
    expect(screen.getByText("참여 멤버 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "army_p1 승인" }));

    const approveDialog = screen.getByRole("dialog", {
      name: "멤버 승인 확인",
    });
    expect(within(approveDialog).getByText(/army_p1/)).toBeInTheDocument();
    expect(screen.getByText("승인 대기 2")).toBeInTheDocument();
    expect(screen.getByText("참여 멤버 2")).toBeInTheDocument();

    fireEvent.click(
      within(approveDialog).getByRole("button", { name: "취소" }),
    );

    expect(
      screen.queryByRole("dialog", { name: "멤버 승인 확인" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("승인 대기 2")).toBeInTheDocument();
    expect(screen.getByText("참여 멤버 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "army_p1 승인" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "멤버 승인 확인" })).getByRole(
        "button",
        { name: "승인하기" },
      ),
    );

    expect(screen.getByText("승인 대기 1")).toBeInTheDocument();
    expect(screen.getByText("참여 멤버 3")).toBeInTheDocument();
    expect(screen.getByText("army_p1")).toBeInTheDocument();
    const approvedMember = screen.getByText("방금 승인").closest("div");
    expect(approvedMember).not.toBeNull();
    expect(
      within(approvedMember as HTMLElement).getByText("공통 관심 3개"),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "army_p1 님을 멤버로 추가했어요",
    );

    fireEvent.click(screen.getByRole("button", { name: "borahae__ 거절" }));

    const rejectDialog = screen.getByRole("dialog", { name: "신청 거절 확인" });
    expect(within(rejectDialog).getByText(/borahae__/)).toBeInTheDocument();
    expect(screen.getByText("승인 대기 1")).toBeInTheDocument();

    fireEvent.click(
      within(rejectDialog).getByRole("button", { name: "거절하기" }),
    );

    expect(screen.queryByText("borahae__")).not.toBeInTheDocument();
    expect(screen.getByText("승인 대기 0")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "borahae__ 님의 신청을 삭제했어요",
    );
  });

  it("CB-07A renders ROOM-003 host detail with the JOIN-003 applicant list and approves via JOIN-004", async () => {
    const roomDetailHostFixture = {
      id: 77,
      title: "굿즈 동선 같이 맞출 분",
      description: "굿즈 구매 후 카페도 들러요.",
      roomStatus: "OPEN",
      viewerRole: "HOST",
      viewerJoinStatus: "APPROVED",
      permissions: {
        canRequestJoin: false,
        canApproveJoinRequest: true,
        canViewOpenChat: true,
        canOpenTimeline: true,
        canEditRoom: true,
      },
      pendingRequestCount: 1,
      concert: {
        id: 100,
        title: "Stadium Tour - Night 1",
        startAt: "2099-06-15T19:00:00+09:00",
        venueName: "KSPO Dome",
      },
      meetingAt: "2099-06-15T14:00:00+09:00",
      meetingPlaceName: "잠실역 5번 출구",
      meetingPlaceAddress: "서울 송파구 잠실동",
      roomTags: ["GOODS_BUYING", "CAFE_VISIT"],
      memberCount: 2,
      maxMembers: 4,
      members: [
        {
          userId: 1,
          nickname: "moon_armies",
          ageRange: "TWENTIES",
          gender: "FEMALE",
          role: "HOST",
          sharedInterestCount: 2,
        },
        {
          userId: 2,
          nickname: "goods_hunter",
          ageRange: "THIRTIES",
          gender: "MALE",
          role: "MEMBER",
          sharedInterestCount: 1,
        },
      ],
      schedulePreview: [
        {
          slotId: 501,
          order: 1,
          title: "잠실역 5번 출구",
          placeId: 11,
          placeName: "잠실역 5번 출구",
          slotType: "MEETING",
          category: "MEETING",
          startAt: "2099-06-15T14:00:00+09:00",
          endAt: "2099-06-15T14:00:00+09:00",
          dwellMinutes: 0,
          locked: true,
        },
      ],
    };
    const joinRequestsFixture = {
      items: [
        {
          requestId: 500,
          userId: 7,
          nickname: "winter_lover",
          ageRange: "TWENTIES",
          gender: "FEMALE",
          message: "처음이라 같이 이동하고 싶어요.",
          matchedTags: ["GOODS_BUYING"],
          createdAt: "2020-06-01T12:00:00+09:00",
        },
      ],
      page: 0,
      size: 20,
      hasNext: false,
    };

    httpMocks.post.mockClear();
    httpMocks.post.mockResolvedValue(
      envelope({ requestId: 500, status: "APPROVED", memberId: 7 }),
    );
    httpMocks.get.mockImplementation((url: string) => {
      if (url.includes("/join-requests/me")) {
        return Promise.resolve(envelope({ status: "APPROVED", message: "" }));
      }
      if (url.includes("/join-requests")) {
        return Promise.resolve(envelope(joinRequestsFixture));
      }
      if (url.includes("/api/rooms/")) {
        return Promise.resolve(envelope(roomDetailHostFixture));
      }
      if (url.includes("/api/concerts/")) {
        // CONCERT-002 supplies the poster the hero shows (ROOM-003 carries none).
        return Promise.resolve(
          envelope({
            ...concertDetailFixture,
            posterUrl: "https://cdn.example.com/poster.jpg",
          }),
        );
      }
      return Promise.resolve(envelope({}));
    });

    const { container } = renderWithConcerts(
      renderInShell("CB-07A", <RoomDetailConnectedScreen roomId="77" />),
    );

    await screen.findByText("굿즈 동선 같이 맞출 분");
    expect(httpMocks.get).toHaveBeenCalledWith("/api/rooms/77");
    // The concert poster (CONCERT-002, keyed off ROOM-003's concert.id) renders in the hero.
    await waitFor(() =>
      expect(
        container.querySelector('img[src="https://cdn.example.com/poster.jpg"]'),
      ).not.toBeNull(),
    );
    expect(
      screen.getByText("내 역할: 방장 · 멤버 2 / 4"),
    ).toBeInTheDocument();
    // ROOM-003 member.
    expect(screen.getByText("goods_hunter")).toBeInTheDocument();
    // JOIN-003 applicant list (host only).
    await screen.findByText("winter_lover");
    expect(
      screen.getByRole("heading", { name: "승인 대기 1" }),
    ).toBeInTheDocument();

    // JOIN-004 approve flow goes through the confirm modal to the real POST.
    fireEvent.click(screen.getByRole("button", { name: "winter_lover 승인" }));
    const dialog = screen.getByRole("dialog", { name: "멤버 승인 확인" });
    fireEvent.click(within(dialog).getByRole("button", { name: "승인하기" }));
    await waitFor(() =>
      expect(httpMocks.post).toHaveBeenCalledWith(
        "/api/rooms/77/join-requests/500/approve",
        {},
      ),
    );
  });

  it("CB-08 exposes the 오픈채팅 button to a permitted viewer and renders OPENCHAT-001 in the modal", async () => {
    const roomDetailMemberFixture = {
      id: 55,
      title: "굿즈 동선 같이 맞출 분",
      description: null,
      roomStatus: "OPEN",
      viewerRole: "MEMBER",
      viewerJoinStatus: "APPROVED",
      permissions: {
        canRequestJoin: false,
        canApproveJoinRequest: false,
        canViewOpenChat: true,
        canOpenTimeline: true,
        canEditRoom: false,
      },
      pendingRequestCount: 0,
      concert: {
        id: 100,
        title: "Stadium Tour - Night 1",
        startAt: "2099-06-15T19:00:00+09:00",
        venueName: "KSPO Dome",
      },
      meetingAt: "2099-06-15T14:00:00+09:00",
      meetingPlaceName: "잠실역 5번 출구",
      meetingPlaceAddress: "서울 송파구 잠실동",
      roomTags: ["GOODS_BUYING"],
      memberCount: 2,
      maxMembers: 4,
      members: [
        {
          userId: 1,
          nickname: "moon_armies",
          ageRange: "TWENTIES",
          gender: "FEMALE",
          role: "HOST",
          sharedInterestCount: 1,
        },
      ],
      schedulePreview: [],
    };

    httpMocks.get.mockImplementation((url: string) => {
      // OPENCHAT-001 — must be matched before the generic /api/rooms/ room-detail branch.
      if (url.includes("/open-chat")) {
        return Promise.resolve(
          envelope({
            openChatUrl: "https://open.kakao.com/o/aBcD9XyZ",
            openChatPassword: "buddy77",
          }),
        );
      }
      if (url.includes("/api/rooms/")) {
        return Promise.resolve(envelope(roomDetailMemberFixture));
      }
      return Promise.resolve(envelope({}));
    });

    // 1) Without the modal flag the AppBar still surfaces the 오픈채팅 entry button.
    const closed = renderWithConcerts(
      renderInShell("CB-07A", <RoomDetailConnectedScreen roomId="55" />),
    );
    const openChatButton = await screen.findByRole("link", {
      name: "오픈채팅",
    });
    expect(openChatButton).toHaveAttribute("href", "/rooms/55?modal=open-chat");
    closed.unmount();

    // 2) With the modal flag, OPENCHAT-001 is fetched and its URL/password render.
    renderWithConcerts(
      renderInShell(
        "CB-07A",
        <RoomDetailConnectedScreen roomId="55" showOpenChatModal />,
      ),
    );
    const dialog = await screen.findByRole("dialog", { name: "오픈채팅 정보" });
    await waitFor(() =>
      expect(httpMocks.get).toHaveBeenCalledWith("/api/rooms/55/open-chat"),
    );
    expect(
      await within(dialog).findByText("https://open.kakao.com/o/aBcD9XyZ"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("buddy77")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "오픈채팅 링크 복사" }),
    ).toBeInTheDocument();
  });

  it("CB-08 modal hides the password row when OPENCHAT-001 returns a null password", async () => {
    const roomDetailMemberFixture = {
      id: 56,
      title: "비번 없는 방",
      description: null,
      roomStatus: "OPEN",
      viewerRole: "MEMBER",
      viewerJoinStatus: "APPROVED",
      permissions: {
        canRequestJoin: false,
        canApproveJoinRequest: false,
        canViewOpenChat: true,
        canOpenTimeline: true,
        canEditRoom: false,
      },
      pendingRequestCount: 0,
      concert: {
        id: 100,
        title: "Stadium Tour - Night 1",
        startAt: "2099-06-15T19:00:00+09:00",
        venueName: "KSPO Dome",
      },
      meetingAt: "2099-06-15T14:00:00+09:00",
      meetingPlaceName: "잠실역 5번 출구",
      meetingPlaceAddress: "서울 송파구 잠실동",
      roomTags: ["GOODS_BUYING"],
      memberCount: 2,
      maxMembers: 4,
      members: [
        {
          userId: 1,
          nickname: "moon_armies",
          ageRange: "TWENTIES",
          gender: "FEMALE",
          role: "HOST",
          sharedInterestCount: 1,
        },
      ],
      schedulePreview: [],
    };

    httpMocks.get.mockImplementation((url: string) => {
      if (url.includes("/open-chat")) {
        return Promise.resolve(
          envelope({
            openChatUrl: "https://open.kakao.com/o/noPass",
            openChatPassword: null,
          }),
        );
      }
      if (url.includes("/api/rooms/")) {
        return Promise.resolve(envelope(roomDetailMemberFixture));
      }
      return Promise.resolve(envelope({}));
    });

    renderWithConcerts(
      renderInShell(
        "CB-07A",
        <RoomDetailConnectedScreen roomId="56" showOpenChatModal />,
      ),
    );

    const dialog = await screen.findByRole("dialog", { name: "오픈채팅 정보" });
    expect(
      await within(dialog).findByText("https://open.kakao.com/o/noPass"),
    ).toBeInTheDocument();
    // openChatPassword is nullable per the spec — no fake value, no password copy row.
    expect(
      within(dialog).queryByRole("button", { name: "오픈채팅 비밀번호 복사" }),
    ).not.toBeInTheDocument();
  });

  it("CB-07D renders a visitor whose 입장 신청 CTA is gated by ROOM-003 permissions", async () => {
    const roomDetailVisitorFixture = {
      id: 88,
      title: "포카 교환 같이 하실 분",
      description: null,
      roomStatus: "OPEN",
      viewerRole: "VISITOR",
      viewerJoinStatus: "NOT_REQUESTED",
      permissions: {
        canRequestJoin: true,
        canApproveJoinRequest: false,
        canViewOpenChat: false,
        canOpenTimeline: false,
        canEditRoom: false,
      },
      pendingRequestCount: 0,
      concert: {
        id: 100,
        title: "Stadium Tour - Night 1",
        startAt: "2099-06-15T19:00:00+09:00",
        venueName: "KSPO Dome",
      },
      meetingAt: "2099-06-15T14:00:00+09:00",
      meetingPlaceName: "잠실역 5번 출구",
      meetingPlaceAddress: "서울 송파구 잠실동",
      roomTags: ["PHOTOCARD_TRADE"],
      memberCount: 1,
      maxMembers: 4,
      members: [
        {
          userId: 1,
          nickname: "moon_armies",
          ageRange: "TWENTIES",
          gender: "FEMALE",
          role: "HOST",
          sharedInterestCount: 1,
        },
      ],
      schedulePreview: [],
    };

    httpMocks.get.mockImplementation((url: string) => {
      if (url.includes("/api/rooms/")) {
        return Promise.resolve(envelope(roomDetailVisitorFixture));
      }
      return Promise.resolve(envelope({}));
    });

    renderWithConcerts(
      renderInShell("CB-07A", <RoomDetailConnectedScreen roomId="88" />),
    );

    await screen.findByText("포카 교환 같이 하실 분");
    expect(screen.getByText(/공개 방 · 멤버 1 \/ 4/)).toBeInTheDocument();
    const applyLink = screen.getByRole("link", { name: "입장 신청" });
    expect(applyLink).toHaveAttribute("href", "/rooms/88?modal=apply");
    // The host-only applicant section is absent for a visitor.
    expect(screen.queryByText("방장만 보임")).not.toBeInTheDocument();
    // CB-08: canViewOpenChat=false hides the 오픈채팅 AppBar entry button.
    expect(
      screen.queryByRole("link", { name: "오픈채팅" }),
    ).not.toBeInTheDocument();
  });

  it("CB-07D disables the CTA and marks a rejected visitor's room as already-applied", async () => {
    const rejectedVisitorFixture = {
      id: 89,
      title: "포카 교환 같이 하실 분",
      description: null,
      roomStatus: "OPEN",
      viewerRole: "VISITOR",
      // 거절당하면 viewerJoinStatus=REJECTED + canRequestJoin=false (JOIN-001 재신청은
      // 409 JOIN01로 차단됨). CTA는 비활성화되고 "신청했던 방"으로 표시돼야 한다.
      viewerJoinStatus: "REJECTED",
      permissions: {
        canRequestJoin: false,
        canApproveJoinRequest: false,
        canViewOpenChat: false,
        canOpenTimeline: false,
        canEditRoom: false,
      },
      pendingRequestCount: 0,
      concert: {
        id: 100,
        title: "Stadium Tour - Night 1",
        startAt: "2099-06-15T19:00:00+09:00",
        venueName: "KSPO Dome",
      },
      meetingAt: "2099-06-15T14:00:00+09:00",
      meetingPlaceName: "잠실역 5번 출구",
      meetingPlaceAddress: "서울 송파구 잠실동",
      roomTags: ["PHOTOCARD_TRADE"],
      memberCount: 1,
      maxMembers: 4,
      members: [
        {
          userId: 1,
          nickname: "moon_armies",
          ageRange: "TWENTIES",
          gender: "FEMALE",
          role: "HOST",
          sharedInterestCount: 1,
        },
      ],
      schedulePreview: [],
    };

    httpMocks.get.mockImplementation((url: string) => {
      if (url.includes("/api/rooms/")) {
        return Promise.resolve(envelope(rejectedVisitorFixture));
      }
      return Promise.resolve(envelope({}));
    });

    renderWithConcerts(
      renderInShell("CB-07A", <RoomDetailConnectedScreen roomId="89" showApplyModal />),
    );

    await screen.findByText("포카 교환 같이 하실 분");
    // 거절 상태 표시.
    expect(
      screen.getByText(/신청이 거절된 방 · 멤버 1 \/ 4/),
    ).toBeInTheDocument();
    expect(screen.getByText("신청했던 방")).toBeInTheDocument();
    // CTA는 navigable Link가 아니라 disabled 버튼이어야 한다.
    expect(
      screen.queryByRole("link", { name: "입장 신청" }),
    ).not.toBeInTheDocument();
    const cta = screen.getByRole("button", { name: "이미 신청했던 방이에요" });
    expect(cta).toBeDisabled();
    expect(
      screen.getByText("한 번 신청한 방에는 다시 신청할 수 없어요"),
    ).toBeInTheDocument();
    // showApplyModal이 true여도 canRequestJoin=false면 신청 모달은 열리지 않는다.
    expect(
      screen.queryByRole("dialog", { name: "입장 신청 메시지" }),
    ).not.toBeInTheDocument();
  });

  it("resolves the room detail 뒤로가기 target from back param, then concert, then fallback", async () => {
    const roomDetailFixture = {
      id: 88,
      title: "포카 교환 같이 하실 분",
      description: null,
      roomStatus: "OPEN",
      viewerRole: "VISITOR",
      viewerJoinStatus: "NOT_REQUESTED",
      permissions: {
        canRequestJoin: true,
        canApproveJoinRequest: false,
        canViewOpenChat: false,
        canOpenTimeline: false,
        canEditRoom: false,
      },
      pendingRequestCount: 0,
      concert: {
        id: 100,
        title: "Stadium Tour - Night 1",
        startAt: "2099-06-15T19:00:00+09:00",
        venueName: "KSPO Dome",
      },
      meetingAt: "2099-06-15T14:00:00+09:00",
      meetingPlaceName: "잠실역 5번 출구",
      meetingPlaceAddress: "서울 송파구 잠실동",
      roomTags: ["PHOTOCARD_TRADE"],
      memberCount: 1,
      maxMembers: 4,
      members: [
        {
          userId: 1,
          nickname: "moon_armies",
          ageRange: "TWENTIES",
          gender: "FEMALE",
          role: "HOST",
          sharedInterestCount: 1,
        },
      ],
      schedulePreview: [],
    };
    httpMocks.get.mockImplementation((url: string) => {
      if (url.includes("/api/rooms/")) {
        return Promise.resolve(envelope(roomDetailFixture));
      }
      return Promise.resolve(envelope({}));
    });

    // (c) No context yet (initial render, room not loaded) → unfiltered list fallback.
    const fallback = renderWithConcerts(
      renderInShell("CB-07A", <RoomDetailConnectedScreen roomId="88" />),
    );
    expect(screen.getByRole("link", { name: "뒤로" })).toHaveAttribute(
      "href",
      "/rooms",
    );
    fallback.unmount();

    // (b) No back param, room loaded → derive the concert-scoped list from the response.
    const derived = renderWithConcerts(
      renderInShell("CB-07A", <RoomDetailConnectedScreen roomId="88" />),
    );
    await screen.findByText("포카 교환 같이 하실 분");
    expect(screen.getByRole("link", { name: "뒤로" })).toHaveAttribute(
      "href",
      "/rooms?concertId=100",
    );
    derived.unmount();

    // (a) Explicit back param wins, even after the room loads.
    renderWithConcerts(
      renderInShell(
        "CB-07A",
        <RoomDetailConnectedScreen roomId="88" backHref="/my-rooms" />,
      ),
    );
    await screen.findByText("포카 교환 같이 하실 분");
    expect(screen.getByRole("link", { name: "뒤로" })).toHaveAttribute(
      "href",
      "/my-rooms",
    );
  });

  it("keeps CB-07Dprime apply modal bounded to a 60 character message and routes actions", () => {
    render(
      renderInShell(
        "CB-07Dprime",
        <RoomDetailScreen roomId="r4" showApplyModal />,
      ),
    );

    const dialog = screen.getByRole("dialog", { name: "입장 신청 메시지" });
    const message = within(dialog).getByLabelText("신청 메시지");
    expect(message).toHaveAttribute("maxLength", "60");
    expect(within(dialog).getByText("0 / 60")).toBeInTheDocument();

    fireEvent.change(message, { target: { value: "가".repeat(65) } });

    expect(message).toHaveValue("가".repeat(60));
    expect(within(dialog).getByText("60 / 60")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "취소" })).toHaveAttribute(
      "href",
      "/rooms/r4",
    );
    expect(
      within(dialog).getByRole("link", { name: "신청하기" }),
    ).toHaveAttribute("href", "/rooms/pending");
  });

  it("guards CB-08 open chat modal to approved room roles only", () => {
    const pending = render(
      renderInShell(
        "CB-07C",
        <RoomDetailScreen roomId="r3" showOpenChatModal />,
      ),
    );

    expect(
      screen.queryByRole("dialog", { name: "오픈채팅 정보" }),
    ).not.toBeInTheDocument();
    pending.unmount();

    render(
      renderInShell(
        "CB-07B",
        <RoomDetailScreen roomId="r2" showOpenChatModal />,
      ),
    );

    expect(
      screen.getByRole("dialog", { name: "오픈채팅 정보" }),
    ).toBeInTheDocument();
  });

  it("copies CB-08 open chat fields and keeps only the close action", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      renderInShell(
        "CB-08",
        <RoomDetailScreen roomId="r1" showOpenChatModal />,
      ),
    );

    const dialog = screen.getByRole("dialog", { name: "오픈채팅 정보" });
    expect(
      within(dialog).getByText("승인된 멤버만 볼 수 있어요"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("open.kakao.com/o/aBcD9XyZ"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("2468")).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: /카카오톡 열기/ }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getAllByRole("button", { name: "닫기" }),
    ).toHaveLength(1);

    fireEvent.click(
      within(dialog).getByRole("button", { name: "오픈채팅 링크 복사" }),
    );

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("open.kakao.com/o/aBcD9XyZ"),
    );
    expect(within(dialog).queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("링크를 복사했어요");
    expect(screen.getByRole("status")).toHaveClass("profile-toast");

    fireEvent.click(
      within(dialog).getByRole("button", { name: "오픈채팅 비밀번호 복사" }),
    );

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("2468"));
    expect(within(dialog).queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "비밀번호를 복사했어요",
    );
    expect(screen.getByRole("status")).toHaveClass("profile-toast");
  });

  it("renders the CB-09 timeline from SCHEDULE-001 and forces the first and last slots locked", async () => {
    // Every slot in this fixture has locked:false on purpose — the screen must still pin
    // the first and last as fixed LOCKED anchors (steering requirement), leaving only the
    // middle slot interactive/non-anchor.
    httpMocks.get.mockReset();
    const timelineEnvelope = envelope({
        room: { id: 10, title: "굿즈 구매 동선 같이 맞출 분" },
        schedule: { id: 20, arrivalBufferMinutes: 30, timezone: "Asia/Seoul" },
        slots: [
          {
            clientId: "slot-meeting",
            slotId: 101,
            order: 1,
            title: "잠실역 5번 출구",
            placeId: 301,
            dwellMinutes: 15,
            startAt: "2099-06-15T14:00:00+09:00",
            endAt: "2099-06-15T14:15:00+09:00",
            locked: false,
          },
          {
            clientId: "slot-cafe",
            slotId: 102,
            order: 2,
            title: "잠실 카페 mood",
            placeId: 302,
            dwellMinutes: 60,
            startAt: "2099-06-15T14:35:00+09:00",
            endAt: "2099-06-15T15:35:00+09:00",
            locked: false,
          },
          {
            clientId: "slot-concert",
            slotId: 103,
            order: 3,
            title: "공연 시작 (KSPO Dome)",
            placeId: 303,
            dwellMinutes: 0,
            startAt: "2099-06-15T18:30:00+09:00",
            endAt: "2099-06-15T21:00:00+09:00",
            locked: false,
          },
        ],
        routeSegments: [
          {
            routeSegmentId: 1,
            fromSlotId: 101,
            toSlotId: 102,
            mode: "WALK",
            distanceMeters: 1261,
            durationMinutes: 22,
            provider: "DRIVING_DISTANCE_WALK_ESTIMATE",
            manuallyAdjusted: false,
          },
          {
            routeSegmentId: 2,
            fromSlotId: 102,
            toSlotId: 103,
            mode: "CAR_TAXI",
            distanceMeters: 5400,
            durationMinutes: 18,
            provider: "KAKAO_DRIVING",
            manuallyAdjusted: false,
          },
        ],
        warnings: ["카페 일정이 길어 도착이 빠듯할 수 있어요"],
      });
    // MAP-001 supplies the map preview pins + route + bounds; its clientIds match the
    // SCHEDULE-001 slots so the schedule list and map stay in sync. Slot lat/lng are the
    // inferred coordinate fields (see src/lib/api/timeline.ts MAP-001 note).
    const mapEnvelope = envelope({
      slots: [
        { clientId: "slot-meeting", slotId: 101, order: 1, title: "잠실역 5번 출구", placeId: 301, lat: 37.511, lng: 127.065, locked: false },
        { clientId: "slot-cafe", slotId: 102, order: 2, title: "잠실 카페 mood", placeId: 302, lat: 37.514, lng: 127.1, locked: false },
        { clientId: "slot-concert", slotId: 103, order: 3, title: "공연 시작 (KSPO Dome)", placeId: 303, lat: 37.5196, lng: 127.1273, locked: false },
      ],
      routeSegments: [],
      mapBounds: { southWest: { lat: 37.5, lng: 127.0 }, northEast: { lat: 37.52, lng: 127.13 } },
    });
    httpMocks.get.mockImplementation((url: string) =>
      Promise.resolve(url.includes("/map") ? mapEnvelope : timelineEnvelope),
    );

    renderWithConcerts(renderInShell("CB-09", <TimelineScreen roomId={10} />));

    await screen.findByText("잠실 카페 mood");
    expect(httpMocks.get).toHaveBeenCalledWith("/api/rooms/10/timeline");
    expect(httpMocks.get).toHaveBeenCalledWith("/api/rooms/10/map");

    // MAP-001 map preview renders with the MAP PREVIEW label; pins use the SAME
    // 출발/도착/number labels as the schedule list (no generic Star), and there is no day
    // toggle (CB-09 is a single schedule, not the CB-12 multi-day map).
    expect(screen.getByText("MAP PREVIEW")).toBeInTheDocument();
    await screen.findByRole("button", { name: "지도 핀 2: 잠실 카페 mood" });
    expect(
      screen.getByRole("button", { name: "지도 핀 출발: 잠실역 5번 출구" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "지도 핀 도착: 공연 시작 (KSPO Dome)" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "D+1 일정 보기" }),
    ).not.toBeInTheDocument();

    // Room title surfaces in the AppBar.
    expect(screen.getByText("굿즈 구매 동선 같이 맞출 분")).toBeInTheDocument();

    // In the schedule list the first slot is 출발 and the last is 도착 — distinct roles,
    // not one bundled anchor; the middle slot is a normal numbered item.
    expect(screen.queryByText("LOCKED")).not.toBeInTheDocument();
    expect(screen.getByLabelText("출발 잠실역 5번 출구")).toBeInTheDocument();
    expect(
      screen.getByLabelText("도착 공연 시작 (KSPO Dome)"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("일정 2: 잠실 카페 mood")).toBeInTheDocument();

    // List ↔ map sync (shared stopId): clicking the middle schedule card selects its map
    // pin too.
    fireEvent.click(screen.getByLabelText("일정 2: 잠실 카페 mood"));
    expect(
      screen.getByRole("button", { name: "지도 핀 2: 잠실 카페 mood" }),
    ).toHaveAttribute("data-selected", "true");

    // Route segments between consecutive slots render mode + duration + distance.
    expect(screen.getByText("도보 22분 · 1.3km")).toBeInTheDocument();
    expect(screen.getByText("택시 · 차량 18분 · 5.4km")).toBeInTheDocument();

    // Warnings render.
    expect(
      screen.getByText("카페 일정이 길어 도착이 빠듯할 수 있어요"),
    ).toBeInTheDocument();

    // Bottom actions still route to CB-11 edit / CB-12 map, now carrying ?roomId so the
    // schedule context survives the hop (CB-11 bootstraps its draft from ?roomId=).
    expect(screen.getByRole("link", { name: /수정\s+CB-11/ })).toHaveAttribute(
      "href",
      "/timetable?roomId=10",
    );
    expect(screen.getByRole("link", { name: /지도\s+CB-12/ })).toHaveAttribute(
      "href",
      "/map?roomId=10",
    );
    expect(
      screen.queryByRole("link", { name: /추억/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("shows CB-09 guidance and skips the timeline request when no roomId is provided", () => {
    renderWithConcerts(renderInShell("CB-09", <TimelineScreen roomId={null} />));

    expect(screen.getByText("방을 먼저 선택해 주세요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 방으로 가기" })).toHaveAttribute(
      "href",
      "/my-rooms",
    );
    // roomId is null → the SCHEDULE-001 query is disabled and never fires.
    expect(httpMocks.get).not.toHaveBeenCalledWith(
      expect.stringContaining("/timeline"),
    );
  });

  it("keeps CB-09 출발지/목적지 as separate objects when read slots have no clientId", async () => {
    // SCHEDULE-001/MAP-001 are reads, so clientId can come back empty. Selecting one card
    // must select only that slot — not bundle the first/last (출발지/목적지) together — so
    // selection is keyed by the unique slotId, not the shared empty clientId.
    const emptyClientSlot = (
      slotId: number,
      order: number,
      title: string,
    ) => ({
      clientId: "",
      slotId,
      order,
      title,
      placeId: slotId,
      dwellMinutes: 10,
      startAt: null,
      endAt: null,
      locked: false,
    });
    const timelineEnvelope = envelope({
      room: { id: 10, title: "방" },
      schedule: { id: 20, arrivalBufferMinutes: 30, timezone: "Asia/Seoul" },
      slots: [
        emptyClientSlot(101, 1, "잠실역 5번 출구"),
        emptyClientSlot(102, 2, "잠실 카페 mood"),
        emptyClientSlot(103, 3, "공연 시작 (KSPO Dome)"),
      ],
      routeSegments: [],
      warnings: [],
    });
    const mapEnvelope = envelope({
      slots: [
        { clientId: "", slotId: 101, order: 1, title: "잠실역 5번 출구", placeId: 101, lat: 37.51, lng: 127.06, locked: false },
        { clientId: "", slotId: 102, order: 2, title: "잠실 카페 mood", placeId: 102, lat: 37.514, lng: 127.1, locked: false },
        { clientId: "", slotId: 103, order: 3, title: "공연 시작 (KSPO Dome)", placeId: 103, lat: 37.5196, lng: 127.1273, locked: false },
      ],
      routeSegments: [],
      mapBounds: { southWest: { lat: 37.5, lng: 127.0 }, northEast: { lat: 37.52, lng: 127.13 } },
    });
    httpMocks.get.mockImplementation((url: string) =>
      Promise.resolve(url.includes("/map") ? mapEnvelope : timelineEnvelope),
    );

    renderWithConcerts(renderInShell("CB-09", <TimelineScreen roomId={10} />));

    const startCard = await screen.findByLabelText("출발 잠실역 5번 출구");
    const endCard = screen.getByLabelText("도착 공연 시작 (KSPO Dome)");

    // Selecting 도착 marks only it selected — 출발 does not get bundled along — and the
    // matching map pin syncs (shared stopId).
    fireEvent.click(endCard);
    expect(endCard).toHaveAttribute("data-selected", "true");
    expect(startCard).toHaveAttribute("data-selected", "false");
    expect(
      screen.getByRole("button", { name: "지도 핀 도착: 공연 시작 (KSPO Dome)" }),
    ).toHaveAttribute("data-selected", "true");
  });

  it("synthesizes a CB-09 fallback transit estimate when the backend returns no routeSegments", async () => {
    // Freshly created rooms come back with slots but no routeSegments; the FE shows a
    // straight-line estimate (provider FALLBACK_STRAIGHT_LINE → "(예상)") between
    // consecutive slots that have coordinates, until the BE provides the routed segment.
    const timelineEnvelope = envelope({
      room: { id: 10, title: "방" },
      schedule: { id: 20, arrivalBufferMinutes: 30, timezone: "Asia/Seoul" },
      slots: [
        { clientId: null, slotId: 201, order: 1, title: "잠실역 5번 출구", placeId: 301, dwellMinutes: 10, startAt: null, endAt: null, locked: false },
        { clientId: null, slotId: 202, order: 2, title: "공연 시작 (KSPO Dome)", placeId: 302, dwellMinutes: 0, startAt: null, endAt: null, locked: false },
      ],
      routeSegments: [],
      warnings: [],
    });
    const mapEnvelope = envelope({
      slots: [
        { clientId: null, slotId: 201, order: 1, title: "잠실역 5번 출구", placeId: 301, lat: 37.5, lng: 127.0, locked: false },
        { clientId: null, slotId: 202, order: 2, title: "공연 시작 (KSPO Dome)", placeId: 302, lat: 37.51, lng: 127.0, locked: false },
      ],
      routeSegments: [],
      mapBounds: { southWest: { lat: 37.49, lng: 126.99 }, northEast: { lat: 37.52, lng: 127.02 } },
    });
    httpMocks.get.mockImplementation((url: string) =>
      Promise.resolve(url.includes("/map") ? mapEnvelope : timelineEnvelope),
    );

    renderWithConcerts(renderInShell("CB-09", <TimelineScreen roomId={10} />));

    await screen.findByLabelText("출발 잠실역 5번 출구");
    // A transit estimate row appears between the two slots, flagged as an estimate.
    expect(
      screen.getByText(/택시 · 차량 \d+분 · [\d.]+km \(예상\)/),
    ).toBeInTheDocument();
  });

  it("CB-10 searches via PLACE-001, geocodes addresses via PLACE-002, and upserts via PLACE-003", async () => {
    httpMocks.get.mockImplementation((url: string) => {
      if (url.includes("/api/places/search")) {
        return Promise.resolve(
          envelope({
            items: [
              {
                name: "잠실 카페 무드",
                address: "서울 송파구 올림픽로 300",
                lat: 37.515,
                lng: 127.102,
                provider: "KAKAO_KEYWORD",
              },
            ],
          }),
        );
      }
      if (url.includes("/api/places/geocode")) {
        return Promise.resolve(
          envelope({
            items: [
              {
                address: "서울 송파구 송파대로 123",
                lat: 37.5,
                lng: 127.1,
                provider: "KAKAO_ADDRESS",
              },
            ],
          }),
        );
      }
      return Promise.resolve(envelope({ items: [] }));
    });
    httpMocks.post.mockResolvedValue(envelope({ placeId: 301 }));

    renderWithConcerts(renderInShell("CB-10", <PlaceSearchScreen />));

    expect(screen.getByText("장소 추가")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    const search = screen.getByRole("searchbox", {
      name: "장소명 또는 주소 검색",
    });
    expect(search).toHaveAttribute("placeholder", "장소명 또는 주소 검색");

    // "송파구 ..." is address-like → PLACE-001 search AND PLACE-002 geocode both fire.
    fireEvent.change(search, { target: { value: "송파구 카페" } });

    const card = await screen.findByText("잠실 카페 무드");
    expect(httpMocks.get).toHaveBeenCalledWith(
      "/api/places/search",
      expect.objectContaining({
        params: expect.objectContaining({ keyword: "송파구 카페" }),
      }),
    );
    expect(screen.getByText("서울 송파구 올림픽로 300")).toBeInTheDocument();

    // PLACE-002 geocode section.
    expect(
      await screen.findByText('주소 검색 결과 "송파구 카페"'),
    ).toBeInTheDocument();
    expect(screen.getByText("서울 송파구 송파대로 123")).toBeInTheDocument();
    expect(httpMocks.get).toHaveBeenCalledWith(
      "/api/places/geocode",
      expect.objectContaining({
        params: expect.objectContaining({ address: "송파구 카페" }),
      }),
    );

    const placeRow = card.closest("[data-place-result]");
    expect(placeRow).not.toBeNull();
    fireEvent.click(
      within(placeRow as HTMLElement).getByRole("button", { name: "추가" }),
    );

    await waitFor(() =>
      expect(httpMocks.post).toHaveBeenCalledWith("/api/places", {
        provider: "KAKAO_KEYWORD",
        name: "잠실 카페 무드",
        address: "서울 송파구 올림픽로 300",
        lat: 37.515,
        lng: 127.102,
      }),
    );
    // No roomId context → no handoff navigation; the row flips to 추가됨.
    expect(navigationMocks.push).not.toHaveBeenCalled();
    await within(placeRow as HTMLElement).findByRole("button", {
      name: "추가됨",
    });
  });

  it("CB-10 hands the upserted place to CB-11 via sessionStorage + a clean /timetable?roomId= when opened with a roomId", async () => {
    navigationMocks.searchParams = "roomId=10";
    httpMocks.get.mockImplementation((url: string) =>
      url.includes("/api/places/search")
        ? Promise.resolve(
            envelope({
              items: [
                {
                  name: "잠실 카페 무드",
                  address: "서울 송파구 올림픽로 300",
                  lat: 37.515,
                  lng: 127.102,
                  provider: "KAKAO_KEYWORD",
                },
              ],
            }),
          )
        : Promise.resolve(envelope({ items: [] })),
    );
    httpMocks.post.mockResolvedValue(envelope({ placeId: 301 }));

    renderWithConcerts(renderInShell("CB-10", <PlaceSearchScreen />));

    fireEvent.change(
      screen.getByRole("searchbox", { name: "장소명 또는 주소 검색" }),
      { target: { value: "잠실 카페" } },
    );
    const card = await screen.findByText("잠실 카페 무드");
    fireEvent.click(
      within(card.closest("[data-place-result]") as HTMLElement).getByRole(
        "button",
        { name: "추가" },
      ),
    );

    await waitFor(() =>
      expect(navigationMocks.push).toHaveBeenCalledWith("/timetable?roomId=10"),
    );
    // The place is handed off via sessionStorage (not a URL param).
    expect(sessionStorage.getItem(pendingPlaceStorageKey("10"))).toBe(
      JSON.stringify({ placeId: 301, name: "잠실 카페 무드" }),
    );
  });

  // CB-11 is now backend-driven (SCHEDULE-001 bootstrap + SCHEDULE-002/003 draft
  // mutations), no longer the shared Zustand store. CB-12 /map still uses the store; CB-10
  // /places is now backend-driven (PLACE-001/002/003).
  const timetableDraftResult = {
    room: { id: 10, title: "굿즈 동선 같이 맞출 분" },
    schedule: { id: 20, arrivalBufferMinutes: 30, timezone: "Asia/Seoul" },
    slots: [
      {
        clientId: "slot-meeting",
        slotId: 101,
        order: 1,
        title: "잠실역 5번 출구",
        placeId: 301,
        dwellMinutes: 15,
        startAt: "2026-06-15T14:00:00+09:00",
        endAt: "2026-06-15T14:15:00+09:00",
        locked: true,
      },
      {
        clientId: "slot-cafe",
        slotId: 102,
        order: 2,
        title: "잠실 카페 mood",
        placeId: 302,
        dwellMinutes: 60,
        startAt: "2026-06-15T14:37:00+09:00",
        endAt: "2026-06-15T15:37:00+09:00",
        locked: false,
      },
      {
        clientId: "slot-concert",
        slotId: 103,
        order: 3,
        title: "공연 시작 (KSPO Dome)",
        placeId: 303,
        dwellMinutes: 0,
        startAt: "2026-06-15T18:30:00+09:00",
        endAt: "2026-06-15T21:00:00+09:00",
        locked: true,
      },
    ],
    routeSegments: [
      {
        routeSegmentId: 1,
        fromSlotId: 101,
        toSlotId: 102,
        mode: "WALK",
        distanceMeters: 1261,
        durationMinutes: 22,
        provider: "DRIVING_DISTANCE_WALK_ESTIMATE",
        manuallyAdjusted: false,
      },
      {
        routeSegmentId: 2,
        fromSlotId: 102,
        toSlotId: 103,
        mode: "CAR_TAXI",
        distanceMeters: 5400,
        durationMinutes: 18,
        provider: "KAKAO_DRIVING",
        manuallyAdjusted: false,
      },
    ],
    warnings: [],
  };

  it("keeps route blocks linked to the right slots after a recommend reorders slots returned with empty clientId", async () => {
    window.sessionStorage.clear();
    // 3 saved slots the server returns with EMPTY clientId (so FE derives slot-auto-<slotId>),
    // and SCHEDULE-001 route segments keyed by slotId (the read contract).
    const threeSlots = {
      room: { id: 10, title: "동선" },
      schedule: { id: 20, arrivalBufferMinutes: 30, timezone: "Asia/Seoul" },
      slots: [
        { clientId: "", slotId: 11, order: 1, title: "집합 장소", placeId: 1, dwellMinutes: 10, startAt: null, endAt: null, locked: true, slotType: "MEETING", category: "MEETING" },
        { clientId: "", slotId: 12, order: 2, title: "카페 코너", placeId: 2, dwellMinutes: 60, startAt: null, endAt: null, locked: false, slotType: "PLACE", category: "CAFE_VISIT" },
        { clientId: "", slotId: 13, order: 3, title: "굿즈 부스", placeId: 3, dwellMinutes: 30, startAt: null, endAt: null, locked: false, slotType: "PLACE", category: "GOODS_BUYING" },
      ],
      routeSegments: [
        { fromSlotId: 11, toSlotId: 12, mode: "WALK", distanceMeters: 100, durationMinutes: 5, provider: null, manuallyAdjusted: false },
        { fromSlotId: 12, toSlotId: 13, mode: "WALK", distanceMeters: 200, durationMinutes: 8, provider: null, manuallyAdjusted: false },
      ],
      warnings: [],
    };
    httpMocks.get.mockResolvedValue(envelope(threeSlots));
    // Recommend swaps 카페/굿즈 and (like the real server) returns slots with empty clientId;
    // its preview segments reference the FE clientIds it was sent (slot-auto-<slotId>).
    httpMocks.post.mockResolvedValue(
      envelope({
        fitStatus: "OK",
        recommendedStartAt: null,
        effectiveStartAt: null,
        targetArrivalAt: null,
        overrunMinutes: 0,
        spareMinutes: 0,
        slots: [
          { clientId: "", slotId: 11, order: 1, title: "집합 장소", placeId: 1, dwellMinutes: 10, startAt: null, endAt: null, locked: true },
          { clientId: "", slotId: 13, order: 2, title: "굿즈 부스", placeId: 3, dwellMinutes: 30, startAt: null, endAt: null, locked: false },
          { clientId: "", slotId: 12, order: 3, title: "카페 코너", placeId: 2, dwellMinutes: 60, startAt: null, endAt: null, locked: false },
        ],
        routeSegments: [
          { fromClientId: "slot-auto-11", toClientId: "slot-auto-13", mode: "WALK", distanceMeters: 150, durationMinutes: 6, provider: null, manuallyAdjusted: false },
          { fromClientId: "slot-auto-13", toClientId: "slot-auto-12", mode: "WALK", distanceMeters: 250, durationMinutes: 9, provider: null, manuallyAdjusted: false },
        ],
        warnings: [],
      }),
    );

    renderWithConcerts(
      renderInShell("CB-11", <TimetableEditScreen roomId={10} />),
    );
    await screen.findByText("굿즈 부스");

    fireEvent.click(screen.getByRole("button", { name: "추천 순서" }));

    // After the reorder applies, 굿즈 부스 (now the middle slot) must own the outgoing route
    // block and 카페 코너 (now last) must have none. Index-based re-synthesis (the bug)
    // mislinks them, so this never becomes true. waitFor also covers the async apply.
    await waitFor(() => {
      const goodsClientId = screen
        .getByText("굿즈 부스")
        .closest("[data-timetable-stop]")
        ?.getAttribute("data-timetable-stop");
      const cafeClientId = screen
        .getByText("카페 코너")
        .closest("[data-timetable-stop]")
        ?.getAttribute("data-timetable-stop");
      expect(
        document.querySelector(`[data-route-block="${goodsClientId}"]`),
      ).not.toBeNull();
      expect(
        document.querySelector(`[data-route-block="${cafeClientId}"]`),
      ).toBeNull();
    });
  });

  it("renders CB-11 draft from SCHEDULE-001 and recalculates a dwell edit via SCHEDULE-002", async () => {
    httpMocks.get.mockResolvedValue(envelope(timetableDraftResult));
    httpMocks.post.mockResolvedValue(
      envelope({
        fitStatus: "OK",
        recommendedStartAt: null,
        effectiveStartAt: "2026-06-15T14:00:00+09:00",
        targetArrivalAt: "2026-06-15T18:30:00+09:00",
        overrunMinutes: 0,
        spareMinutes: 5,
        slots: timetableDraftResult.slots.map((slot) =>
          slot.clientId === "slot-cafe" ? { ...slot, dwellMinutes: 70 } : slot,
        ),
        routeSegments: timetableDraftResult.routeSegments,
        warnings: [],
      }),
    );

    renderWithConcerts(
      renderInShell("CB-11", <TimetableEditScreen roomId={10} />),
    );

    await screen.findByText("잠실 카페 mood");
    expect(httpMocks.get).toHaveBeenCalledWith("/api/rooms/10/timeline");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    // Header surfaces the room title from SCHEDULE-001.
    expect(screen.getByText(/굿즈 동선 같이 맞출 분/)).toBeInTheDocument();
    // CB-10 is connected — 장소 추가 carries the roomId so CB-10 can hand the place back.
    expect(screen.getByRole("link", { name: "장소 추가" })).toHaveAttribute(
      "href",
      "/places?roomId=10",
    );

    const cafeStop = screen
      .getByText("잠실 카페 mood")
      .closest("[data-timetable-stop]");
    expect(cafeStop).not.toBeNull();
    fireEvent.click(
      within(cafeStop as HTMLElement).getByRole("button", {
        name: "잠실 카페 mood 머무는 시간 증가",
      }),
    );

    await waitFor(() =>
      expect(httpMocks.post).toHaveBeenCalledWith(
        "/api/schedules/20/draft/recalculate",
        expect.objectContaining({ arrivalBufferMinutes: 30 }),
      ),
    );
    const recalcBody = httpMocks.post.mock.calls.at(-1)?.[1] as {
      slots: { clientId: string; dwellMinutes: number; slotType: string; category: string }[];
    };
    const cafeSlot = recalcBody.slots.find(
      (slot) => slot.clientId === "slot-cafe",
    );
    expect(cafeSlot?.dwellMinutes).toBe(70);
    // slotType is required by SCHEDULE-002; the fixture omits it, so the position fallback
    // supplies PLACE for the middle slot (first = MEETING, last = CONCERT). A PLACE slot with
    // no category falls back to the valid ETC enum — never the invalid "PLACE".
    expect(cafeSlot?.slotType).toBe("PLACE");
    expect(cafeSlot?.category).toBe("ETC");
  });

  it("keeps a movable place between the 집합/공연 anchors when dragged onto the first anchor", async () => {
    window.sessionStorage.clear();
    const threeSlots = {
      room: { id: 10, title: "동선" },
      schedule: { id: 20, arrivalBufferMinutes: 30, timezone: "Asia/Seoul" },
      slots: [
        { clientId: "", slotId: 11, order: 1, title: "집합 장소", placeId: 1, dwellMinutes: 10, startAt: null, endAt: null, locked: true, slotType: "MEETING", category: "MEETING" },
        { clientId: "", slotId: 12, order: 2, title: "카페 코너", placeId: 2, dwellMinutes: 60, startAt: null, endAt: null, locked: false, slotType: "PLACE", category: "CAFE_VISIT" },
        { clientId: "", slotId: 13, order: 3, title: "공연장", placeId: 3, dwellMinutes: 0, startAt: null, endAt: null, locked: true, slotType: "CONCERT", category: "CONCERT" },
      ],
      routeSegments: [],
      warnings: [],
    };
    httpMocks.get.mockResolvedValue(envelope(threeSlots));
    httpMocks.post.mockResolvedValue(
      envelope({
        fitStatus: "OK",
        recommendedStartAt: null,
        effectiveStartAt: null,
        targetArrivalAt: null,
        overrunMinutes: 0,
        spareMinutes: 0,
        slots: threeSlots.slots,
        routeSegments: [],
        warnings: [],
      }),
    );

    renderWithConcerts(
      renderInShell("CB-11", <TimetableEditScreen roomId={10} />),
    );
    await screen.findByText("카페 코너");

    // The 집합/공연 anchors render a drag handle but it is disabled (non-draggable).
    expect(
      screen.getByRole("button", { name: "집합 장소 순서 이동" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "공연장 순서 이동" }),
    ).toBeDisabled();

    // Drag 카페 코너 onto 집합 장소 (the first, locked anchor) trying to move it to the top.
    const grip = screen.getByRole("button", { name: "카페 코너 순서 이동" });
    const meetingStop = screen
      .getByText("집합 장소")
      .closest("[data-timetable-stop]") as HTMLElement;
    const dragData = new Map<string, string>();
    const dataTransfer = {
      dropEffect: "move",
      effectAllowed: "move",
      getData: (format: string) => dragData.get(format) ?? "",
      setData: (format: string, data: string) => dragData.set(format, data),
    };
    fireEvent.dragStart(grip, { dataTransfer });
    fireEvent.dragOver(meetingStop, { clientY: 1, dataTransfer });
    fireEvent.drop(meetingStop, { clientY: 1, dataTransfer });

    await waitFor(() => expect(httpMocks.post).toHaveBeenCalled());
    const body = httpMocks.post.mock.calls.at(-1)?.[1] as {
      slots: { title: string }[];
    };
    // 카페 코너 stays in the interior — 집합 first, 공연 last.
    expect(body.slots.map((slot) => slot.title)).toEqual([
      "집합 장소",
      "카페 코너",
      "공연장",
    ]);
  });

  it("blocks the editor with a loading overlay only while the add-place recalc is in flight", async () => {
    window.sessionStorage.clear();
    // Hand off a place from CB-10 so the add-place recalc fires on mount.
    sessionStorage.setItem(
      pendingPlaceStorageKey(10),
      JSON.stringify({ placeId: 305, name: "잠실 카페 무드" }),
    );
    httpMocks.get.mockResolvedValue(envelope(timetableDraftResult));
    // Hold the add-place recalc open so it stays pending.
    let resolvePost: (value: unknown) => void = () => {};
    httpMocks.post.mockImplementation(
      () => new Promise((resolve) => (resolvePost = resolve)),
    );

    renderWithConcerts(
      renderInShell("CB-11", <TimetableEditScreen roomId={10} />),
    );
    await screen.findByText("잠실 카페 mood");

    // The blocking loading overlay shows and the commit button is disabled mid add-recalc.
    expect(
      await screen.findByText("일정을 다시 계산하는 중…"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "수정 완료" })).toBeDisabled();

    resolvePost(
      envelope({
        fitStatus: "OK",
        recommendedStartAt: null,
        effectiveStartAt: null,
        targetArrivalAt: null,
        overrunMinutes: 0,
        spareMinutes: 0,
        slots: timetableDraftResult.slots,
        routeSegments: timetableDraftResult.routeSegments,
        warnings: [],
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByText("일정을 다시 계산하는 중…"),
      ).not.toBeInTheDocument(),
    );
  });

  it("does not block the editor for an ordinary edit recalc", async () => {
    window.sessionStorage.clear();
    httpMocks.get.mockResolvedValue(envelope(timetableDraftResult));
    httpMocks.post.mockResolvedValue(
      envelope({
        fitStatus: "OK",
        recommendedStartAt: null,
        effectiveStartAt: null,
        targetArrivalAt: null,
        overrunMinutes: 0,
        spareMinutes: 0,
        slots: timetableDraftResult.slots,
        routeSegments: timetableDraftResult.routeSegments,
        warnings: [],
      }),
    );

    renderWithConcerts(
      renderInShell("CB-11", <TimetableEditScreen roomId={10} />),
    );
    await screen.findByText("잠실 카페 mood");

    const cafeStop = screen
      .getByText("잠실 카페 mood")
      .closest("[data-timetable-stop]") as HTMLElement;
    fireEvent.click(
      within(cafeStop).getByRole("button", {
        name: "잠실 카페 mood 머무는 시간 증가",
      }),
    );

    // The edit recalc runs in the background — no blocking overlay, controls stay enabled.
    await waitFor(() => expect(httpMocks.post).toHaveBeenCalled());
    expect(
      screen.queryByText("일정을 다시 계산하는 중…"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "수정 완료" }),
    ).not.toBeDisabled();
  });

  it("blocks the editor while a route mode change recalculates", async () => {
    window.sessionStorage.clear();
    httpMocks.get.mockResolvedValue(envelope(timetableDraftResult));
    let resolvePost: (value: unknown) => void = () => {};
    httpMocks.post.mockImplementation(
      () => new Promise((resolve) => (resolvePost = resolve)),
    );

    renderWithConcerts(
      renderInShell("CB-11", <TimetableEditScreen roomId={10} />),
    );
    await screen.findByText("잠실 카페 mood");

    // Toggle the first route segment from 도보 to 택시 — a structural recalc that blocks.
    fireEvent.click(screen.getAllByRole("button", { name: "택시" })[0]);
    expect(
      await screen.findByText("일정을 다시 계산하는 중…"),
    ).toBeInTheDocument();

    resolvePost(
      envelope({
        fitStatus: "OK",
        recommendedStartAt: null,
        effectiveStartAt: null,
        targetArrivalAt: null,
        overrunMinutes: 0,
        spareMinutes: 0,
        slots: timetableDraftResult.slots,
        routeSegments: timetableDraftResult.routeSegments,
        warnings: [],
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByText("일정을 다시 계산하는 중…"),
      ).not.toBeInTheDocument(),
    );
  });

  it("preserves slotType/category across recalc responses that omit them", async () => {
    // Isolate from the CB-10→CB-11 sessionStorage place handoff so no pending place fires a
    // bootstrap recalc.
    window.sessionStorage.clear();
    // SCHEDULE-002 responses drop slotType/category. Without carry-over, a second edit would
    // resend the positional fallback (e.g. "PLACE" instead of the server's real category),
    // which the backend rejects with COMMON400. The bootstrap carries real meta; the recalc
    // response omits it; the next request must still carry the real values.
    const bootstrapWithMeta = {
      ...timetableDraftResult,
      slots: timetableDraftResult.slots.map((slot) => {
        if (slot.slotId === 101) return { ...slot, slotType: "MEETING", category: "MEETING" };
        if (slot.slotId === 102) return { ...slot, slotType: "PLACE", category: "GOODS_BUYING" };
        return { ...slot, slotType: "CONCERT", category: "CONCERT" };
      }),
    };
    httpMocks.get.mockResolvedValue(envelope(bootstrapWithMeta));
    // The recalc response intentionally has NO slotType/category (matches the real spec) and
    // bumps the cafe dwell to 90 so we can detect when it's been applied.
    httpMocks.post.mockResolvedValue(
      envelope({
        fitStatus: "OK",
        recommendedStartAt: null,
        effectiveStartAt: null,
        targetArrivalAt: null,
        overrunMinutes: 0,
        spareMinutes: 0,
        slots: timetableDraftResult.slots.map((slot) =>
          slot.slotId === 102 ? { ...slot, dwellMinutes: 90 } : slot,
        ),
        routeSegments: timetableDraftResult.routeSegments,
        warnings: [],
      }),
    );

    renderWithConcerts(
      renderInShell("CB-11", <TimetableEditScreen roomId={10} />),
    );
    await screen.findByText("잠실 카페 mood");

    const bumpCafe = () => {
      const cafeStop = screen
        .getByText("잠실 카페 mood")
        .closest("[data-timetable-stop]") as HTMLElement;
      fireEvent.click(
        within(cafeStop).getByRole("button", {
          name: "잠실 카페 mood 머무는 시간 증가",
        }),
      );
    };

    // First edit → recalc; the response (no slotType/category) gets applied — confirmed by
    // the cafe dwell becoming 90 ("1시간 30분"), overriding the optimistic 70.
    bumpCafe();
    await screen.findByText("1시간 30분");

    // Second edit → second recalc; the request must still carry the real server meta, not the
    // positional fallback, even though the prior response stripped it.
    const callsBefore = httpMocks.post.mock.calls.length;
    bumpCafe();
    await waitFor(() =>
      expect(httpMocks.post.mock.calls.length).toBeGreaterThan(callsBefore),
    );

    const secondBody = httpMocks.post.mock.calls.at(-1)?.[1] as {
      slots: { clientId: string; slotType: string; category: string }[];
    };
    const cafe = secondBody.slots.find((slot) => slot.clientId === "slot-cafe");
    // Real category survives; would be the slotType fallback ("PLACE") if it were lost.
    expect(cafe?.category).toBe("GOODS_BUYING");
    const concert = secondBody.slots.find(
      (slot) => slot.clientId === "slot-concert",
    );
    expect(concert?.slotType).toBe("CONCERT");
  });

  it("commits the draft and routes to the timeline on 수정 완료 (SCHEDULE-003)", async () => {
    httpMocks.get.mockResolvedValue(envelope(timetableDraftResult));
    httpMocks.put.mockResolvedValue(
      envelope({
        room: { id: 10, title: "굿즈 동선 같이 맞출 분" },
        schedule: { id: 20 },
        slots: [],
        routeSegments: [],
        warnings: [],
      }),
    );

    renderWithConcerts(
      renderInShell("CB-11", <TimetableEditScreen roomId={10} />),
    );

    await screen.findByText("잠실 카페 mood");
    fireEvent.click(screen.getByRole("button", { name: "수정 완료" }));

    await waitFor(() =>
      expect(httpMocks.put).toHaveBeenCalledWith(
        "/api/schedules/20/draft/commit",
        expect.objectContaining({ arrivalBufferMinutes: 30 }),
      ),
    );
    await waitFor(() =>
      expect(navigationMocks.push).toHaveBeenCalledWith("/timeline?roomId=10"),
    );
  });

  it("CB-11 inserts the place CB-10 handed off via sessionStorage and recalculates via SCHEDULE-002", async () => {
    sessionStorage.setItem(
      pendingPlaceStorageKey(10),
      JSON.stringify({ placeId: 305, name: "잠실 카페 무드" }),
    );
    httpMocks.get.mockResolvedValue(envelope(timetableDraftResult));
    httpMocks.post.mockResolvedValue(
      envelope({
        fitStatus: "OK",
        recommendedStartAt: null,
        effectiveStartAt: "2026-06-15T14:00:00+09:00",
        targetArrivalAt: "2026-06-15T18:30:00+09:00",
        overrunMinutes: 0,
        spareMinutes: 5,
        slots: timetableDraftResult.slots,
        routeSegments: timetableDraftResult.routeSegments,
        warnings: [],
      }),
    );

    renderWithConcerts(
      renderInShell("CB-11", <TimetableEditScreen roomId={10} />),
    );

    await screen.findByText("잠실 카페 mood");

    // The handoff place (placeId 305) is inserted into the draft and posted to recalculate.
    await waitFor(() => {
      const insertCall = httpMocks.post.mock.calls.find(
        ([url, body]) =>
          url === "/api/schedules/20/draft/recalculate" &&
          (body as { slots: { placeId: number | null; title: string }[] }).slots.some(
            (slot) => slot.placeId === 305 && slot.title === "잠실 카페 무드",
          ),
      );
      expect(insertCall).toBeTruthy();
    });
    // The pending place is consumed (cleared) so a refresh won't re-add it.
    expect(sessionStorage.getItem(pendingPlaceStorageKey(10))).toBeNull();
  });

  it("surfaces the CB-11′ over-time warning when commit returns 409 SCHEDULE01", async () => {
    httpMocks.get.mockResolvedValue(envelope(timetableDraftResult));
    httpMocks.put.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          isSuccess: false,
          code: "SCHEDULE01",
          message: "지금 일정을 전부 소화할 수 없습니다.",
          result: { overrunMinutes: 35 },
        },
      },
    });

    renderWithConcerts(
      renderInShell("CB-11", <TimetableEditScreen roomId={10} />),
    );

    await screen.findByText("잠실 카페 mood");
    fireEvent.click(screen.getByRole("button", { name: "수정 완료" }));

    await screen.findByText(/\+ 35분/);
    expect(
      screen.getByRole("dialog", {
        name: "지금 일정을 전부 소화할 수 없습니다",
      }),
    ).toBeInTheDocument();
    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/timetable?roomId=10&modal=warning",
    );
  });

  it("shows CB-11 guidance and skips the draft bootstrap when no roomId is provided", () => {
    renderWithConcerts(
      renderInShell("CB-11", <TimetableEditScreen roomId={null} />),
    );

    expect(screen.getAllByText("일정 수정").length).toBeGreaterThan(0);
    expect(screen.getByText("방을 먼저 선택해 주세요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 방으로 가기" })).toHaveAttribute(
      "href",
      "/my-rooms",
    );
    expect(httpMocks.get).not.toHaveBeenCalledWith("/api/rooms/10/timeline");
  });

  it("renders CB-11 without crashing when a SCHEDULE-001 slot has an empty clientId", async () => {
    // Real reads can return slots with an empty/missing clientId despite the spec marking
    // it non-null; the screen must synthesize a stable id rather than crash on the
    // drag-state guards (undefined === undefined → reading placement of null).
    const slotsWithEmptyClientId = timetableDraftResult.slots.map((slot) =>
      slot.slotId === 102 ? { ...slot, clientId: "" } : slot,
    );
    httpMocks.get.mockResolvedValue(
      envelope({ ...timetableDraftResult, slots: slotsWithEmptyClientId }),
    );

    renderWithConcerts(
      renderInShell("CB-11", <TimetableEditScreen roomId={10} />),
    );

    expect(await screen.findByText("잠실 카페 mood")).toBeInTheDocument();
    expect(screen.getByText("공연 시작 (KSPO Dome)")).toBeInTheDocument();
  });

  it("renders CB-12 map pins from the MAP-001 endpoint", async () => {
    // CB-12 /map is now driven by MAP-001 (GET /api/rooms/{roomId}/map) via the shared
    // useRoomMap client, not the static Zustand store. MAP-001 is a Bearer-gated read with
    // no MSW mock, so the rendering is covered here by mocking the envelope. Slots carry a
    // coordinate (lat/lng) + order/title only — there is no per-day data, so no D-Day/D+1
    // toggle, and the place card shows no fake category/address lines.
    httpMocks.get.mockResolvedValue(
      envelope({
        slots: [
          { clientId: null, slotId: 101, order: 1, title: "잠실역 5번 출구", placeId: 301, lat: 37.511, lng: 127.065, locked: false },
          { clientId: null, slotId: 102, order: 2, title: "잠실 카페 mood", placeId: 302, lat: 37.514, lng: 127.1, locked: false },
          { clientId: null, slotId: 103, order: 3, title: "공연 시작 (KSPO Dome)", placeId: 303, lat: 37.5196, lng: 127.1273, locked: false },
        ],
        routeSegments: [],
        mapBounds: { southWest: { lat: 37.5, lng: 127.0 }, northEast: { lat: 37.52, lng: 127.13 } },
      }),
    );

    renderWithConcerts(renderInShell("CB-12", <MapScreen roomId={10} />));

    await screen.findByRole("button", { name: "지도 핀 2: 잠실 카페 mood" });
    expect(httpMocks.get).toHaveBeenCalledWith("/api/rooms/10/map");

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "필터" }),
    ).not.toBeInTheDocument();

    // First/last slots mirror the app marker convention (출발 pin / 도착 star); the middle
    // slot is a numbered pin.
    expect(
      screen.getByRole("button", { name: "지도 핀 출발: 잠실역 5번 출구" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "지도 핀 도착: 공연 시작 (KSPO Dome)" }),
    ).toBeInTheDocument();

    // Single schedule → no day toggle.
    expect(
      screen.queryByRole("button", { name: "D+1 일정 보기" }),
    ).not.toBeInTheDocument();

    // Back link carries the roomId so the timeline context survives the hop.
    expect(screen.getByRole("link", { name: "뒤로" })).toHaveAttribute(
      "href",
      "/timeline?roomId=10",
    );

    // Clicking a pin selects it and surfaces it in the bottom place card.
    fireEvent.click(screen.getByRole("button", { name: "지도 핀 2: 잠실 카페 mood" }));
    expect(screen.getByText("잠실 카페 mood")).toBeInTheDocument();
    // MAP-001 carries no category/address → no fake "· Kakao" detail line.
    expect(screen.queryByText(/· Kakao/)).not.toBeInTheDocument();
  });

  it("renders CB-13 as a read-only memory feed without unconnected actions", () => {
    render(renderInShell("CB-13", <MemoryFeedScreen />));

    expect(screen.getByText("우리 방 추억")).toBeInTheDocument();
    expect(screen.getByText("사진 12 · 영상 3")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "더보기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /업로드/ }),
    ).not.toBeInTheDocument();
  });

  it("moves CB-12 to the next stop and centers the focused map pin", async () => {
    httpMocks.get.mockResolvedValue(
      envelope({
        slots: [
          { clientId: null, slotId: 101, order: 1, title: "잠실역 5번 출구", placeId: 301, lat: 37.511, lng: 127.065, locked: false },
          { clientId: null, slotId: 102, order: 2, title: "KSPO Dome 굿즈 라인", placeId: 302, lat: 37.514, lng: 127.1, locked: false },
          { clientId: null, slotId: 103, order: 3, title: "공연 시작 (KSPO Dome)", placeId: 303, lat: 37.5196, lng: 127.1273, locked: false },
        ],
        routeSegments: [],
        mapBounds: { southWest: { lat: 37.5, lng: 127.0 }, northEast: { lat: 37.52, lng: 127.13 } },
      }),
    );

    const { container } = renderWithConcerts(
      renderInShell("CB-12", <MapScreen roomId={10} />),
    );

    await screen.findByRole("button", { name: "지도 핀 출발: 잠실역 5번 출구" });

    const mockLayer = container.querySelector("[data-map-focus-layer]");
    // Focus layer centers on the first stop by default (keyed by the unique slotId).
    expect(mockLayer).toHaveAttribute("data-centered-stop", "s-101");

    fireEvent.click(screen.getByRole("button", { name: "다음 동선으로 이동" }));

    expect(screen.getByText("KSPO Dome 굿즈 라인")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "지도 핀 2: KSPO Dome 굿즈 라인" }),
    ).toHaveAttribute("aria-current", "true");
    expect(mockLayer).toHaveAttribute("data-centered-stop", "s-102");
  });

  it("shows CB-12 guidance and skips the map request when no roomId is provided", () => {
    renderWithConcerts(renderInShell("CB-12", <MapScreen roomId={null} />));

    expect(screen.getByText("방을 먼저 선택해 주세요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 방으로 가기" })).toHaveAttribute(
      "href",
      "/my-rooms",
    );
    // roomId is null → the MAP-001 query is disabled and never fires.
    expect(httpMocks.get).not.toHaveBeenCalledWith("/api/rooms/10/map");
  });

  it("renders the CB-11prime over-time warning representation and returns to the editor", () => {
    renderWithConcerts(
      renderInShell(
        "CB-11prime",
        <TimetableEditScreen roomId={null} showWarning />,
      ),
    );

    const dialog = screen.getByRole("dialog", {
      name: "지금 일정을 전부 소화할 수 없습니다",
    });
    expect(
      within(dialog).getByText("공연 시작 시간을 기준으로 역산했어요"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/초과 시간/)).toBeInTheDocument();
    expect(within(dialog).getByText(/\+\s*\d+분/)).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "되돌아가서 수정" }),
    );

    expect(navigationMocks.push).toHaveBeenCalledWith("/timetable");
  });

  it("does not render the CB-11prime warning while editing within the limit", async () => {
    httpMocks.get.mockResolvedValue(envelope(timetableDraftResult));

    renderWithConcerts(
      renderInShell("CB-11", <TimetableEditScreen roomId={10} />),
    );

    await screen.findByText("잠실 카페 mood");
    expect(
      screen.queryByRole("dialog", {
        name: "지금 일정을 전부 소화할 수 없습니다",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "수정 완료" }),
    ).toBeInTheDocument();
  });

  it("renders CB-14 profile with edit and my-room routing plus WIP feedback", () => {
    vi.useFakeTimers();
    try {
      renderWithConcerts(renderInShell("CB-14", <ProfileScreen />));

      expect(
        screen.getByRole("heading", { name: "프로필" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /moon_armies/ })).toHaveAttribute(
        "href",
        "/profile/edit",
      );
      expect(screen.getByText("20대 · 여성")).toBeInTheDocument();
      expect(screen.queryByText("추억 사진")).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /2\s*참여 중인 방/ }),
      ).toHaveAttribute("href", "/my-rooms");
      expect(
        screen.getByRole("link", { name: /1\s*신청 대기 중인 방/ }),
      ).toHaveAttribute("href", "/my-rooms");

      fireEvent.click(screen.getByRole("button", { name: /알림 설정/ }));
      expect(screen.getByRole("status")).toHaveTextContent(
        "개발중인 기능입니다",
      );
      expect(screen.getByRole("status")).toHaveClass(
        "fixed",
        "bottom-[76px]",
        "z-30",
        "profile-toast",
      );

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

  it("prefills CB-14prime from PROFILE-001 and saves edits via PROFILE-002", async () => {
    // renderWithConcerts seeds the ["user","me"] query with userProfileFixture, so the
    // edit form prefills from that cached PROFILE-001 read (no prop drilling from CB-14).
    httpMocks.patch.mockClear();
    httpMocks.get.mockResolvedValue(envelope(userProfileFixture));

    renderWithConcerts(renderInShell("CB-14prime", <ProfileEditScreen />));

    expect(
      screen.getByRole("heading", { name: "프로필 수정" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("닉네임")).toHaveValue("moon_armies");
    expect(screen.getByText("11 / 12")).toBeInTheDocument();
    expect(screen.queryByLabelText("소개글")).not.toBeInTheDocument();

    // 비공개 was removed; age/gender are required enums only.
    const ageGroup = screen.getByRole("group", { name: "연령대 선택" });
    expect(
      within(ageGroup)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["10대", "20대", "30대", "40대+"]);
    expect(
      within(ageGroup).getByRole("button", { name: "20대" }),
    ).toHaveAttribute("aria-pressed", "true");

    const genderGroup = screen.getByRole("group", { name: "성별 선택" });
    expect(
      within(genderGroup)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["여성", "남성"]);
    expect(
      within(genderGroup).getByRole("button", { name: "여성" }),
    ).toHaveAttribute("aria-pressed", "true");

    // Change the age 20대 → 30대, then save: PATCH the new enum body and route to /profile.
    fireEvent.click(within(ageGroup).getByRole("button", { name: "30대" }));
    expect(
      within(ageGroup).getByRole("button", { name: "30대" }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(httpMocks.patch).toHaveBeenCalledWith("/api/users/me/profile", {
        nickname: "moon_armies",
        ageRange: "THIRTIES",
        gender: "FEMALE",
      }),
    );
    await waitFor(() =>
      expect(navigationMocks.push).toHaveBeenCalledWith("/profile"),
    );
  });
});
