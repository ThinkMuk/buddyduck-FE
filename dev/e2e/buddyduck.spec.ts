import { expect, test } from "@playwright/test";

const coreRoutes = [
  ["/", "덕메를 찾고,"],
  ["/login", "덕메를 찾고,"],
  ["/home", "다가오는 공연"],
  ["/rooms", "이 공연에서 내 관심 태그"],
  ["/my-rooms", "오늘 / 이번 주"],
  ["/rooms/host", "내 역할: 방장"],
  ["/rooms/member", "참여 확정"],
  ["/rooms/pending", "승인 대기 중"],
  ["/rooms/visitor", "공개 방"],
  ["/rooms/r1", "내 역할: 방장"],
  ["/rooms/r2", "참여 확정"],
  ["/rooms/r3", "승인 대기 중"],
  ["/rooms/r4", "공개 방"],
  ["/timeline", "MAP PREVIEW"],
  ["/timetable", "일정 수정"],
  ["/map", "지도"],
  ["/memories", "사진 12 · 영상 3"],
  ["/profile", "프로필"]
] as const;

test.describe("BuddyDuck runtime UI", () => {
  for (const [path, marker] of coreRoutes) {
    test(`${path} renders inside centered app container`, async ({ page }) => {
      await page.goto(path);
      const screen = page.locator(".screen");
      await expect(screen).toBeVisible();
      await expect(page.getByText(marker).first()).toBeVisible();

      const box = await screen.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(430);
      expect(Math.round(box?.x ?? -1)).toBe(0);
      await expect(page.locator(".device, .notch, .statusbar")).toHaveCount(0);
    });
  }

  test("login and nickname onboarding navigate to home", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "카카오로 시작하기" }).click();
    await expect(page).toHaveURL(/\/nickname$/);
    await page.getByPlaceholder("닉네임 입력").fill("duck");
    await expect(page.getByText("사용 가능한 닉네임")).toBeVisible();
    await expect(page.getByRole("button", { name: "완료" })).toBeDisabled();
    await page.getByRole("button", { name: "20대" }).click();
    await expect(page.getByRole("button", { name: "완료" })).toBeDisabled();
    await page.getByRole("button", { name: "여성" }).click();
    await page.getByRole("link", { name: "완료" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("heading", { name: "공연 찾기" })).toBeVisible();
  });

  test("home and room list render cards, chips, filter modal, and bottom nav", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByPlaceholder("공연명 / 지역 / 아티스트 검색")).toBeVisible();
    await expect(page.getByText("LUMINA")).toBeVisible();
    await expect(page.getByText("이번 주 관심 태그")).toHaveCount(0);
    await page.getByRole("button", { name: "뮤지컬" }).click();
    await expect(page.getByText("AFTERGLOW")).toBeVisible();
    await expect(page.getByText("LUMINA")).toHaveCount(0);
    await page.getByRole("button", { name: "전체" }).click();
    await expect(page.getByText("LUMINA")).toBeVisible();

    const bottomNav = page.locator("nav").last();
    await expect(bottomNav.getByRole("link", { name: "홈", exact: true })).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "내 방", exact: true })).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "프로필", exact: true })).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "동행", exact: true })).toHaveCount(0);

    await page.getByRole("link", { name: /Moonlight Sync Live/ }).click();
    await expect(page).toHaveURL(/\/rooms$/);
    await expect(page.getByText("이 공연에서 내 관심 태그")).toBeVisible();
    await expect(page.getByText("설정해 둔 태그가 없습니다")).toBeVisible();
    await page.getByRole("link", { name: /편집/ }).click();
    await expect(page.getByRole("dialog", { name: "관심 태그 선택" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/rooms$/);

    await bottomNav.getByRole("link", { name: "프로필", exact: true }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(bottomNav.getByRole("link", { name: "프로필", exact: true })).toHaveClass(/text-\[var\(--cb-yellow\)\]/);
  });

  test("native scrollbars stay hidden on scrollable app surfaces", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/home");

    const bodyScroll = page.locator(".body-scroll").first();
    const chipScroller = page.getByRole("button", { name: "지역" }).locator("..");

    await expect(bodyScroll).toHaveCSS("scrollbar-width", "none");
    await expect(chipScroller).toHaveCSS("scrollbar-width", "none");

    const scrollState = await chipScroller.evaluate((element) => {
      const maxScrollLeft = element.scrollWidth - element.clientWidth;
      element.scrollLeft = maxScrollLeft;

      return {
        maxScrollLeft,
        scrollLeft: element.scrollLeft
      };
    });

    expect(scrollState.maxScrollLeft).toBeGreaterThan(0);
    expect(scrollState.scrollLeft).toBeGreaterThan(0);
  });

  test("key non-profile controls show hover and focus affordances", async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto("/home");

    const musicalChip = page.getByRole("button", { name: "뮤지컬" });
    await musicalChip.hover();
    await expect(musicalChip).toHaveCSS("background-color", "rgb(39, 39, 44)");
    await musicalChip.focus();
    await expect(musicalChip).toHaveCSS("outline-style", "solid");

    await page.goto("/rooms");
    const createRoomFab = page.getByRole("link", { name: "방 만들기" });
    await createRoomFab.hover();
    await expect(createRoomFab).toHaveCSS("background-color", "rgb(255, 210, 63)");
    await createRoomFab.focus();
    await expect(createRoomFab).toHaveCSS("outline-style", "solid");

    await page.goto("/memories");
    await expect(page.getByText("사진 12 · 영상 3")).toBeVisible();
    await expect(page.getByRole("button", { name: "더보기" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "업로드" })).toHaveCount(0);

    const backLink = page.getByRole("link", { name: "뒤로" });
    await backLink.hover();
    await expect(backLink).toHaveCSS("background-color", "rgb(39, 39, 44)");
  });

  test("room list create FAB stays fixed in the viewport while scrolling", async ({ page }) => {
    await page.goto("/rooms");
    const createRoomFab = page.getByRole("link", { name: "방 만들기" });

    await expect(createRoomFab).toBeInViewport();
    const initialBox = await createRoomFab.boundingBox();
    expect(initialBox).not.toBeNull();

    await page.mouse.wheel(0, 640);
    await page.waitForTimeout(100);

    const scrolledBox = await createRoomFab.boundingBox();
    expect(scrolledBox).not.toBeNull();
    expect(Math.round(scrolledBox!.x)).toBe(Math.round(initialBox!.x));
    expect(Math.round(scrolledBox!.y)).toBe(Math.round(initialBox!.y));
  });

  test("create room validates form and routes to host detail", async ({ page }) => {
    await page.goto("/rooms/create");
    await expect(page.getByRole("button", { name: "방 만들기" })).toBeDisabled();
    await page.getByRole("button", { name: "태그 추가" }).click();
    await expect(page.getByRole("dialog", { name: "방 태그 선택" })).toBeVisible();
    await page.getByRole("button", { name: "굿즈 줄서기" }).click();
    await page.getByRole("button", { name: "저장 (1/4)" }).click();
    await expect(page.getByRole("button", { name: "방 만들기" })).toBeEnabled();
    await page.getByLabel("방 제목").fill("공연 전 굿즈 줄 같이 서요");
    await page.getByLabel("한 줄 소개").fill("공연 전 굿즈 수령 후 카페에서 쉬다가 같이 입장해요.");
    await page.getByLabel("집합 장소").fill("잠실역 5번 출구");
    await page.getByRole("button", { name: "방 만들기" }).click();
    await expect(page).toHaveURL(/\/rooms\/host$/);
    await expect(page.getByText("내 역할: 방장")).toBeVisible();
  });

  test("room detail states and apply modal behave correctly", async ({ page }) => {
    await page.goto("/rooms/r1");
    await expect(page.getByText("내 역할: 방장 · 멤버 2 / 4")).toBeVisible();
    await expect(page.getByRole("heading", { name: "승인 대기 2" })).toBeVisible();
    await page.getByRole("button", { name: "army_p1 승인" }).click();
    const approveDialog = page.getByRole("dialog", { name: "멤버 승인 확인" });
    await expect(approveDialog).toBeVisible();
    await expect(page.getByRole("heading", { name: "승인 대기 2" })).toBeVisible();
    await approveDialog.getByRole("button", { name: "승인하기" }).click();
    await expect(page.getByRole("heading", { name: "승인 대기 1" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "참여 멤버 3" })).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("army_p1 님을 멤버로 추가했어요");
    await page.getByRole("button", { name: "borahae__ 거절" }).click();
    const rejectDialog = page.getByRole("dialog", { name: "신청 거절 확인" });
    await expect(rejectDialog).toBeVisible();
    await rejectDialog.getByRole("button", { name: "거절하기" }).click();
    await expect(page.getByRole("heading", { name: "승인 대기 0" })).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("borahae__ 님의 신청을 삭제했어요");

    await page.goto("/rooms/member");
    await expect(page.getByText("참여 확정 · 멤버 3 / 4")).toBeVisible();
    await expect(page.getByRole("button", { name: "탈퇴" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "오픈채팅" })).toBeVisible();

    await page.goto("/rooms/pending");
    await expect(page.getByText("승인 대기 중 · 신청 후 1시간")).toBeVisible();
    await expect(page.getByRole("button", { name: "방장의 승인을 기다리는 중이에요" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "오픈채팅" })).toHaveCount(0);

    await page.goto("/rooms/r4?modal=apply");
    const applyDialog = page.getByRole("dialog", { name: "입장 신청 메시지" });
    await expect(applyDialog).toBeVisible();
    await expect(applyDialog).toBeInViewport();
    await expect(applyDialog.getByLabel("신청 메시지")).toHaveAttribute("maxlength", "60");
    await applyDialog.getByRole("button", { name: "닫기" }).click();
    await expect(page).toHaveURL(/\/rooms\/r4$/);
    await page.goto("/rooms/visitor?modal=apply");
    await expect(page.getByRole("dialog", { name: "입장 신청 메시지" })).toBeInViewport();
    await page.getByRole("dialog", { name: "입장 신청 메시지" }).getByRole("link", { name: "신청하기", exact: true }).click();
    await expect(page).toHaveURL(/\/rooms\/pending$/);
  });

  test("room detail uses the fixed CB-07 bottom CTA instead of the global bottom nav", async ({ page }) => {
    await page.goto("/rooms/r2");

    await expect(page.locator("nav")).toHaveCount(0);
    const openTimeline = page.getByRole("link", { name: "Open Timeline" });
    await expect(openTimeline).toBeInViewport();
    const initialBox = await openTimeline.boundingBox();
    expect(initialBox).not.toBeNull();

    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(100);

    const scrolledBox = await openTimeline.boundingBox();
    expect(scrolledBox).not.toBeNull();
    expect(Math.abs(scrolledBox!.y - initialBox!.y)).toBeLessThanOrEqual(2);
  });

  test("open chat is exposed as an approved room modal", async ({ page }) => {
    await page.goto("/rooms/member?modal=open-chat");
    const memberOpenChatDialog = page.getByRole("dialog", { name: "오픈채팅 정보" });
    await expect(memberOpenChatDialog).toBeVisible();
    await expect(memberOpenChatDialog).toBeInViewport();
    await expect(page.getByText("open.kakao.com/o/aBcD9XyZ")).toBeVisible();
    await page.getByRole("button", { name: "닫기" }).click();
    await expect(page).toHaveURL(/\/rooms\/member$/);

    await page.goto("/rooms/host?modal=open-chat");
    const hostOpenChatDialog = page.getByRole("dialog", { name: "오픈채팅 정보" });
    await expect(hostOpenChatDialog).toBeVisible();
    await expect(hostOpenChatDialog).toBeInViewport();
    await expect(page.getByText("open.kakao.com/o/aBcD9XyZ")).toBeVisible();
    await page.getByRole("button", { name: "닫기" }).click();
    await expect(page).toHaveURL(/\/rooms\/host$/);
  });

  test("timetable edits, place add, timeline, and map share the same session data", async ({ page }) => {
    await page.goto("/timetable");
    await expect(page.getByText("2026.06.15 (월) — D-Day")).toBeVisible();
    await expect(page.locator("nav")).toHaveCount(0);

    for (let i = 0; i < 6; i += 1) {
      await page.getByRole("button", { name: "KSPO Dome 굿즈 라인 머무는 시간 감소" }).click();
      await page.getByRole("button", { name: "잠실 카페 mood 머무는 시간 감소" }).click();
    }

    await page.getByRole("link", { name: "장소 추가" }).click();
    await expect(page).toHaveURL(/\/places$/);
    await expect(page.locator("nav")).toHaveCount(0);
    await page.getByRole("searchbox", { name: "장소명 또는 주소 검색" }).fill("토스트");
    await page.getByRole("button", { name: "식당" }).click();
    await page.locator("[data-place-result]", { hasText: "테이크아웃 토스트 잠실점" }).getByRole("button", { name: "추가" }).click();

    await expect(page).toHaveURL(/\/timetable$/);
    await expect(page.getByText("테이크아웃 토스트 잠실점")).toBeVisible();
    await page.getByRole("button", { name: "수정 완료" }).click();
    await expect(page).toHaveURL(/\/timeline$/);
    await expect(page.getByText("테이크아웃 토스트 잠실점")).toBeVisible();
    await expect(page.getByText("머무는 시간 30분").first()).toBeVisible();

    await page.getByRole("link", { name: "지도 CB-12", exact: true }).click();
    await expect(page).toHaveURL(/\/map$/);
    const toastPin = page.getByRole("button", { name: "지도 핀 4: 테이크아웃 토스트 잠실점" });
    await expect(toastPin).toBeVisible();
    await toastPin.click();
    await expect(page.getByText("테이크아웃 토스트 잠실점")).toBeVisible();
  });

  test("timetable grip drag reorders place blocks before completing edits", async ({ page }) => {
    await page.goto("/timetable");
    await page
      .getByRole("button", { name: "잠실역 5번 출구 순서 이동" })
      .dragTo(page.locator("[data-timetable-stop='s3']"), { targetPosition: { x: 160, y: 88 } });

    await expect(page.locator("[data-timetable-stop]").nth(0)).toContainText("KSPO Dome 굿즈 라인");
    await expect(page.locator("[data-timetable-stop]").nth(1)).toContainText("잠실 카페 mood");
    await expect(page.locator("[data-timetable-stop]").nth(2)).toContainText("잠실역 5번 출구");
    await expect(page.locator("[data-timetable-stop]").last()).toContainText("공연 시작");

    await page.getByRole("button", { name: "수정 완료" }).click();
    await expect(page).toHaveURL(/\/timeline$/);
    await expect(page.getByRole("button", { name: /일정 1.*KSPO Dome 굿즈 라인/ })).toBeVisible();
  });

  test("over-time save is blocked and refresh resets the mock timetable", async ({ page }) => {
    await page.goto("/timetable");
    await page.getByRole("link", { name: "장소 추가" }).click();
    await page.getByRole("searchbox", { name: "장소명 또는 주소 검색" }).fill("포카샵");
    await page.getByRole("button", { name: "굿즈" }).click();
    await page.locator("[data-place-result]", { hasText: "롯데월드몰 포카샵" }).getByRole("button", { name: "추가" }).click();

    await expect(page).toHaveURL(/\/timetable$/);
    await expect(page.getByText("롯데월드몰 포카샵")).toBeVisible();
    await page.getByRole("button", { name: "수정 완료" }).click();
    await expect(page).toHaveURL(/\/timetable\?modal=warning$/);
    const warningDialog = page.getByRole("dialog", { name: "지금 일정을 전부 소화할 수 없습니다" });
    await expect(warningDialog).toBeVisible();
    await expect(warningDialog).toBeInViewport();
    await expect(page.getByText("초과 시간")).toBeVisible();
    await page.getByRole("button", { name: "되돌아가서 수정" }).click();
    await expect(page).toHaveURL(/\/timetable$/);
    await expect(page.getByText("롯데월드몰 포카샵")).toBeVisible();

    await page.reload();

    await expect(page.getByText("롯데월드몰 포카샵")).toHaveCount(0);
    await expect(page.getByText("잠실역 5번 출구 (집합)")).toBeVisible();
  });

  test("timeline map preview and schedule cards stay synchronized", async ({ page }) => {
    await page.goto("/timeline");
    await expect(page.getByText("MAP PREVIEW")).toBeVisible();
    await expect(page.getByText(/Kakao Maps fallback/)).toBeVisible();
    await expect(page.getByRole("link", { name: /추억/ })).toHaveCount(0);
    await expect(page.locator("polyline")).toHaveAttribute("points", "22,64 40,52 55,60 62,42");

    const pin3 = page.getByRole("button", { name: "지도 핀 3: 잠실 카페 mood" });
    const card3 = page.getByRole("button", { name: /일정 3.*잠실 카페 mood/ });

    await pin3.click();
    await expect(card3).toBeInViewport();
    await expect(pin3).toHaveAttribute("aria-current", "true");
    await expect(card3).toHaveAttribute("data-selected", "true");

    const pin2 = page.getByRole("button", { name: "지도 핀 2: KSPO Dome 굿즈 라인" });
    const card2 = page.getByRole("button", { name: /일정 2.*KSPO Dome 굿즈 라인/ });
    await card2.hover();
    await expect(pin2).toHaveAttribute("data-active", "true");
    await card2.focus();
    await expect(pin2).toHaveAttribute("data-active", "true");

    await page.getByRole("button", { name: "D+1 일정 보기" }).click();
    await expect(page.getByRole("button", { name: "D+1 일정 보기" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("잠실 숙소 체크아웃")).toBeVisible();
    await expect(page.getByRole("button", { name: "지도 핀 1: 잠실 숙소 체크아웃" })).toBeVisible();
    await expect(page.getByRole("button", { name: "지도 핀 1: 잠실역 5번 출구" })).toHaveCount(0);
    await expect(page.locator("polyline")).toHaveAttribute("points", "28,48 50,44 68,60");

    await page.getByRole("button", { name: "D-Day 일정 보기" }).click();
    await page.getByRole("link", { name: "지도 열기" }).click();
    await expect(page).toHaveURL(/\/map$/);
    await expect(page.locator("[data-map-focus-layer]")).toHaveAttribute("data-centered-stop", "s1");
    await page.getByRole("button", { name: "다음 동선으로 이동" }).click();
    await expect(page.getByText("KSPO Dome 굿즈 라인")).toBeVisible();
    await expect(page.getByRole("button", { name: "지도 핀 2: KSPO Dome 굿즈 라인" })).toHaveAttribute("aria-current", "true");
    await expect(page.locator("[data-map-focus-layer]")).toHaveAttribute("data-centered-stop", "s2");
  });

  test("map fallback and profile edit render required states", async ({ page }) => {
    await page.goto("/map");
    await expect(page.getByText(/Kakao Maps fallback/)).toBeVisible();
    await expect(page.getByText(/NEXT_PUBLIC_KAKAO_MAP_KEY 미설정|스크립트 로딩 중 또는 실패/)).toBeVisible();

    await page.goto("/profile");
    await expect(page.getByRole("link", { name: /moon_armies/ })).toHaveAttribute("href", "/profile/edit");
    await expect(page.getByText("추억 사진")).toHaveCount(0);
    await page.getByRole("button", { name: /알림 설정/ }).click();
    await expect(page.getByRole("status")).toContainText("개발중인 기능입니다");
    await page.getByRole("link", { name: /moon_armies/ }).click();
    await expect(page).toHaveURL(/\/profile\/edit$/);
    await page.getByLabel("닉네임").fill("newduck");
    await page.getByRole("button", { name: "30대" }).click();
    await page.getByRole("link", { name: "저장" }).click();
    await expect(page).toHaveURL(/\/profile$/);
  });

  test("CB-01 through CB-12 follows the Hi-Fi page flow", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "카카오로 시작하기" }).click();
    await page.getByPlaceholder("닉네임 입력").fill("duck");
    await page.getByRole("button", { name: "20대" }).click();
    await page.getByRole("button", { name: "여성" }).click();
    await page.getByRole("link", { name: "완료" }).click();
    await expect(page).toHaveURL(/\/home$/);

    await page.getByRole("link", { name: /Moonlight Sync Live/ }).click();
    await expect(page).toHaveURL(/\/rooms$/);

    await page.getByRole("link", { name: /첫콘이라 동선/ }).click();
    await expect(page).toHaveURL(/\/rooms\/r4$/);
    await page.getByRole("link", { name: "입장 신청" }).click();
    await expect(page.getByRole("dialog", { name: "입장 신청 메시지" })).toBeVisible();
    await page.getByRole("dialog", { name: "입장 신청 메시지" }).getByRole("link", { name: "신청하기", exact: true }).click();
    await expect(page).toHaveURL(/\/rooms\/pending$/);

    await page.goto("/rooms/member");
    await page.getByRole("link", { name: "오픈채팅", exact: true }).click();
    await expect(page).toHaveURL(/\/rooms\/member\?modal=open-chat$/);
    await expect(page.getByRole("dialog", { name: "오픈채팅 정보" })).toBeVisible();
    await page.getByRole("button", { name: "닫기" }).click();
    await expect(page).toHaveURL(/\/rooms\/member$/);

    await page.getByRole("link", { name: "Open Timeline" }).click();
    await expect(page).toHaveURL(/\/timeline$/);
    await page.getByRole("link", { name: /수정/ }).click();
    await expect(page).toHaveURL(/\/timetable$/);
    for (let i = 0; i < 6; i += 1) {
      await page.getByRole("button", { name: "KSPO Dome 굿즈 라인 머무는 시간 감소" }).click();
      await page.getByRole("button", { name: "잠실 카페 mood 머무는 시간 감소" }).click();
    }
    await page.getByRole("link", { name: "장소 추가" }).click();
    await expect(page).toHaveURL(/\/places$/);
    await page.getByRole("searchbox", { name: "장소명 또는 주소 검색" }).fill("토스트");
    await page.locator("[data-place-result]", { hasText: "테이크아웃 토스트 잠실점" }).getByRole("button", { name: "추가" }).click();
    await expect(page).toHaveURL(/\/timetable$/);
    await expect(page.getByText("테이크아웃 토스트 잠실점")).toBeVisible();
    await page.getByRole("button", { name: "수정 완료" }).click();
    await expect(page).toHaveURL(/\/timeline$/);
    await expect(page.getByText("테이크아웃 토스트 잠실점")).toBeVisible();
    await page.getByRole("link", { name: "지도 CB-12", exact: true }).click();
    await expect(page).toHaveURL(/\/map$/);
    await page.getByRole("button", { name: "지도 핀 4: 테이크아웃 토스트 잠실점" }).click();
    await expect(page.getByText("테이크아웃 토스트 잠실점")).toBeVisible();
  });
});
