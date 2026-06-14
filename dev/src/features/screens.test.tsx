import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BuddyDuckApp } from "./screens";
import { concerts } from "@/lib/data";
import { getScreenById } from "@/lib/routes";
import { useAppStore } from "@/store/app-store";

vi.mock("next/navigation", () => ({
  usePathname: () => "/rooms",
  useRouter: () => ({
    push: vi.fn()
  })
}));

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
    useAppStore.setState({
      selectedTags: [],
      selectedMapStop: 2
    });
  });

  it("starts with no default interest tags", () => {
    useAppStore.setState(useAppStore.getInitialState(), true);

    expect(useAppStore.getState().selectedTags).toEqual([]);
  });

  it("renders CB-01 as the Kakao login entry screen", () => {
    render(<BuddyDuckApp screen={getScreenById("CB-01")} />);

    expect(screen.getByText("BuddyDuck")).toBeInTheDocument();
    expect(screen.getByText(/덕메를 찾고,/)).toBeInTheDocument();
    expect(screen.getByText(/서비스 약관/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /카카오로 시작하기/ })).toHaveAttribute("href", "/nickname");
    expect(screen.getByRole("button", { name: "데모 로그인 (발표용)" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("requires nickname, age, and gender before enabling CB-02 completion", async () => {
    render(<BuddyDuckApp screen={getScreenById("CB-02")} />);

    expect(screen.getByRole("button", { name: "완료" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "비공개" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("닉네임 입력"), { target: { value: "duck_20" } });
    expect(screen.getByText("7 / 12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "완료" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "20대" }));
    expect(screen.getByRole("button", { name: "완료" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "여성" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "완료" })).toBeEnabled());
  });

  it("filters CB-03 concerts by search text and category", () => {
    renderWithConcerts(<BuddyDuckApp screen={getScreenById("CB-03")} />);

    expect(screen.getByText("공연 찾기")).toBeInTheDocument();
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
    renderWithConcerts(<BuddyDuckApp screen={getScreenById("CB-03")} />);

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveTextContent("홈");
    expect(nav).toHaveTextContent("내 방");
    expect(nav).toHaveTextContent("프로필");
    expect(screen.queryByRole("link", { name: "동행" })).not.toBeInTheDocument();
  });

  it("renders CB-04 as the hi-fi room list with an empty interest tag state and fixed create action", () => {
    renderWithConcerts(<BuddyDuckApp screen={getScreenById("CB-04")} />);

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
  });

  it("renders CB-04prime tag modal and prevents selecting more than five tags", () => {
    renderWithConcerts(<BuddyDuckApp screen={getScreenById("CB-04prime")} />);

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
    renderWithConcerts(<BuddyDuckApp screen={getScreenById("CB-05")} />);

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
    renderWithConcerts(<BuddyDuckApp screen={getScreenById("CB-06")} />);

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
    expect(screen.getByRole("link", { name: /굿즈 줄 같이 서고 카페까지 같이 가요/ })).toHaveAttribute("href", "/rooms/host");
    expect(screen.getByRole("link", { name: /근처 호텔 잡은 분/ })).toHaveAttribute("href", "/rooms/member");
    expect(screen.getByRole("link", { name: /포카 교환/ })).toHaveAttribute("href", "/rooms/pending");
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

  it("renders CB-14 profile with edit and my-room routing plus WIP feedback", () => {
    vi.useFakeTimers();
    try {
      renderWithConcerts(<BuddyDuckApp screen={getScreenById("CB-14")} />);

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
    renderWithConcerts(<BuddyDuckApp screen={getScreenById("CB-14prime")} />);

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
