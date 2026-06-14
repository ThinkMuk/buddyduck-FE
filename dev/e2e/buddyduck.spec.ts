import { expect, test } from "@playwright/test";

const coreRoutes = [
  ["/", "덕메를 찾고,"],
  ["/login", "덕메를 찾고,"],
  ["/home", "다가오는 공연"],
  ["/rooms", "이 공연에서 내 관심 태그"],
  ["/my-rooms", "오늘 / 이번 주"],
  ["/rooms/host", "호스트 뷰"],
  ["/rooms/member", "멤버 뷰"],
  ["/rooms/pending", "신청 대기"],
  ["/rooms/visitor", "방문자 뷰"],
  ["/timetable", "일정표 편집"],
  ["/map", "지도"],
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
    await expect(bottomNav.getByRole("link", { name: "프로필", exact: true })).toHaveCSS("color", "rgb(253, 190, 13)");
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
    await expect(page.getByText("호스트 뷰")).toBeVisible();
  });

  test("room detail states and apply modal behave correctly", async ({ page }) => {
    await page.goto("/rooms/member");
    await expect(page.getByRole("button", { name: "탈퇴" })).toBeVisible();
    await expect(page.getByRole("link", { name: "오픈채팅" })).toBeVisible();

    await page.goto("/rooms/pending");
    await expect(page.getByText("신청 대기 중")).toBeVisible();
    await expect(page.getByRole("link", { name: "신청 취소" })).toBeVisible();

    await page.goto("/rooms/visitor?modal=apply");
    await expect(page.getByRole("dialog", { name: "동행 신청" })).toBeVisible();
    await page.locator('[aria-label="모달 배경"]').click({ position: { x: 8, y: 8 } });
    await expect(page).toHaveURL(/\/rooms\/visitor$/);
    await page.goto("/rooms/visitor?modal=apply");
    await page.getByRole("dialog", { name: "동행 신청" }).getByRole("link", { name: "신청하기", exact: true }).click();
    await expect(page).toHaveURL(/\/rooms\/pending$/);
  });

  test("open chat is exposed as an approved room modal", async ({ page }) => {
    await page.goto("/rooms/member?modal=open-chat");
    await expect(page.getByRole("dialog", { name: "오픈채팅 정보" })).toBeVisible();
    await expect(page.getByText("open.kakao.com/o/aBcD9XyZ")).toBeVisible();
    await page.getByRole("button", { name: "닫기" }).click();
    await expect(page).toHaveURL(/\/rooms\/member$/);
  });

  test("timetable edit supports steppers, place add, and warning modal", async ({ page }) => {
    await page.goto("/timetable");
    await expect(page.getByText("총 소요")).toBeVisible();
    await page.getByRole("button", { name: "증가" }).first().click();
    await expect(page.getByText("25분")).toBeVisible();
    await page.getByRole("link", { name: "장소 추가" }).click();
    await expect(page).toHaveURL(/\/places$/);

    await page.goto("/timetable?modal=warning");
    await expect(page.getByRole("dialog", { name: "지금 일정을 전부 소화할 수 없습니다" })).toBeVisible();
    await page.getByRole("link", { name: "되돌아가서 수정" }).click();
    await expect(page).toHaveURL(/\/timetable$/);
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
    await expect(page).toHaveURL(/\/rooms\/visitor$/);
    await page.getByRole("link", { name: "동행 신청하기" }).click();
    await expect(page.getByRole("dialog", { name: "동행 신청" })).toBeVisible();
    await page.getByRole("dialog", { name: "동행 신청" }).getByRole("link", { name: "신청하기", exact: true }).click();
    await expect(page).toHaveURL(/\/rooms\/pending$/);

    await page.goto("/rooms/member");
    await page.getByRole("link", { name: "오픈채팅", exact: true }).click();
    await expect(page).toHaveURL(/\/rooms\/member\?modal=open-chat$/);
    await expect(page.getByRole("dialog", { name: "오픈채팅 정보" })).toBeVisible();
    await page.getByRole("button", { name: "닫기" }).click();
    await expect(page).toHaveURL(/\/rooms\/member$/);

    await page.getByRole("link", { name: "Open Timeline" }).click();
    await expect(page).toHaveURL(/\/timeline$/);
    await page.getByRole("link", { name: "일정 수정" }).click();
    await expect(page).toHaveURL(/\/timetable$/);
    await page.getByRole("link", { name: "장소 추가" }).click();
    await expect(page).toHaveURL(/\/places$/);
    await page.getByRole("button", { name: "추가" }).first().click();
    await expect(page).toHaveURL(/\/timetable$/);

    await page.goto("/timeline");
    await page.getByRole("link", { name: "지도", exact: true }).click();
    await expect(page).toHaveURL(/\/map$/);
  });
});
