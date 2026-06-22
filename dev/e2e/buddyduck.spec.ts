import { expect, test, type Page } from "@playwright/test";

const AUTH_COOKIE = "cb_access_token";

async function setAuthCookie(page: Page) {
  await page.context().addCookies([
    {
      name: AUTH_COOKIE,
      value: "test-access-token",
      url: "http://localhost:3000",
    },
  ]);
}

const publicRoutes = [
  ["/", "덕메를 찾고,"],
  ["/login", "덕메를 찾고,"],
] as const;

const protectedRoutes = [
  ["/home", "다가오는 공연"],
  ["/rooms", "이 공연에서 내 관심 태그"],
  ["/rooms/host", "내 역할: 방장"],
  ["/rooms/member", "참여 확정"],
  ["/rooms/pending", "승인 대기 중"],
  ["/rooms/visitor", "공개 방"],
  ["/timeline", "타임라인"],
  ["/timetable", "일정 수정"],
  ["/map", "지도"],
  ["/memories", "사진 12 · 영상 3"],
] as const;

test.describe("BuddyDuck runtime UI", () => {
  test.describe("public entry screens (no session)", () => {
    for (const [path, marker] of publicRoutes) {
      test(`${path} renders inside centered app container`, async ({
        page,
      }) => {
        await page.goto(path);
        const screen = page.locator(".screen");
        await expect(screen).toBeVisible();
        await expect(page.getByText(marker).first()).toBeVisible();

        const box = await screen.boundingBox();
        expect(box?.width).toBeLessThanOrEqual(430);
        expect(Math.round(box?.x ?? -1)).toBe(0);
        await expect(page.locator(".device, .notch, .statusbar")).toHaveCount(
          0,
        );
      });
    }

    test("CB-01 카카오로 시작하기 links out to the real Kakao authorize endpoint", async ({
      page,
    }) => {
      await page.goto("/");
      const href = await page
        .getByRole("link", { name: "카카오로 시작하기" })
        .getAttribute("href");
      expect(href).toContain("https://kauth.kakao.com/oauth/authorize");
    });

    test("a session cookie redirects / to /home, and removing it bounces protected routes back to /", async ({
      page,
    }) => {
      await setAuthCookie(page);
      await page.goto("/");
      await expect(page).toHaveURL(/\/home$/);

      await page.context().clearCookies();
      await page.goto("/rooms");
      await expect(page).toHaveURL(/\/$/);
    });
  });

  test.describe("authenticated app screens", () => {
    test.beforeEach(async ({ page }) => {
      await setAuthCookie(page);
    });

    for (const [path, marker] of protectedRoutes) {
      test(`${path} renders inside centered app container`, async ({
        page,
      }) => {
        await page.goto(path);
        const screen = page.locator(".screen");
        await expect(screen).toBeVisible();
        await expect(page.getByText(marker).first()).toBeVisible();

        const box = await screen.boundingBox();
        expect(box?.width).toBeLessThanOrEqual(430);
        expect(Math.round(box?.x ?? -1)).toBe(0);
        await expect(page.locator(".device, .notch, .statusbar")).toHaveCount(
          0,
        );
      });
    }

    test("CB-06 my-rooms is fully behind ROOM-004's Bearer read; an invalid session bounces to /", async ({
      page,
    }) => {
      // ROOM-004 (GET /api/me/rooms) requires a real Bearer token and has no MSW mock,
      // so the whole screen's content is behind the real backend. The e2e fake token is
      // rejected (401 COMMON401) and the global http interceptor clears the cookie and
      // redirects to /. The list therefore can't be exercised end-to-end without a real
      // Kakao session — the same limitation documented for CB-02 and CB-04.
      await page.goto("/my-rooms");
      await expect(page).toHaveURL(/\/$/);
    });

    test("CB-14 profile header is behind PROFILE-001's Bearer read; an invalid session bounces to /", async ({
      page,
    }) => {
      // PROFILE-001 (GET /api/users/me) requires a real Bearer token and has no MSW mock.
      // The profile header card is driven by it, so the e2e fake token is rejected
      // (401 COMMON401) and the global http interceptor clears the cookie and redirects
      // to /. The rendered profile therefore can't be exercised end-to-end without a real
      // Kakao session — the same limitation documented for CB-02, CB-04, and CB-06. The
      // CB-14 unit test covers the header/stats/menu rendering by seeding the query.
      await page.goto("/profile");
      await expect(page).toHaveURL(/\/$/);
    });

    test("CB-14′ profile edit prefills from PROFILE-001; an invalid session bounces to /", async ({
      page,
    }) => {
      // The edit form prefills from PROFILE-001 (GET /api/users/me, Bearer, no MSW mock)
      // and saves via PROFILE-002 (PATCH /api/users/me/profile, also real-backend-only).
      // With the e2e fake token the prefill read returns 401 COMMON401, so the global http
      // interceptor clears the cookie and redirects to /. The form and its PATCH save can
      // only be exercised with a real, profile-completed Kakao session; the CB-14prime unit
      // test covers prefill + the PROFILE-002 PATCH body/navigation by seeding the query.
      await page.goto("/profile/edit");
      await expect(page).toHaveURL(/\/$/);
    });

    test("CB-07A~D room detail is behind ROOM-003's Bearer read; an invalid session bounces to /", async ({
      page,
    }) => {
      // The connected /rooms/{roomId} detail (CB-07A/B/C/D) is driven by ROOM-003
      // (GET /api/rooms/{roomId}, Bearer, no MSW mock) plus the JOIN-001~005 calls, so the
      // whole screen is behind the real backend. The e2e fake token is rejected
      // (401 COMMON401) and the global http interceptor clears the cookie and redirects to
      // /. The rendered detail + approve/reject/apply flows therefore can't be exercised
      // end-to-end without a real Kakao session — the same limitation documented for
      // CB-02/04/06/14. The connected-screen unit test covers rendering + the role/permission
      // branches by seeding the ["room", id] query and the JOIN envelopes.
      await page.goto("/rooms/12345");
      await expect(page).toHaveURL(/\/$/);
    });

    test("CB-02 nickname onboarding gates the 완료 button until all fields are valid", async ({
      page,
    }) => {
      // PROFILE-002 (PATCH /api/users/me/profile) is connected to the real backend and
      // has no MSW mock, so the actual submit requires a real authenticated session that
      // e2e can't provide. This test therefore covers the client-side validation gating
      // only — the part that's independent of backend auth — not the post-submit
      // navigation to /home.
      await page.goto("/nickname");
      await page.getByPlaceholder("닉네임 입력").fill("duck");
      await expect(page.getByText("사용 가능한 닉네임")).toBeVisible();
      await expect(page.getByRole("button", { name: "완료" })).toBeDisabled();
      await page.getByRole("button", { name: "20대" }).click();
      await expect(page.getByRole("button", { name: "완료" })).toBeDisabled();
      await page.getByRole("button", { name: "여성" }).click();
      await expect(page.getByRole("button", { name: "완료" })).toBeEnabled();
    });

    test("home and room list render cards, chips, filter modal, and bottom nav", async ({
      page,
    }) => {
      await page.goto("/home");
      await expect(page.getByPlaceholder("공연명 / 지역 검색")).toBeVisible();
      const concertCards = page.locator('a[href^="/rooms?concertId="]');
      await expect(concertCards.first()).toBeVisible();
      await expect(page.getByText("이번 주 관심 태그")).toHaveCount(0);

      const bottomNav = page.locator("nav").last();
      await expect(
        bottomNav.getByRole("link", { name: "홈", exact: true }),
      ).toBeVisible();
      await expect(
        bottomNav.getByRole("link", { name: "내 방", exact: true }),
      ).toBeVisible();
      await expect(
        bottomNav.getByRole("link", { name: "프로필", exact: true }),
      ).toBeVisible();
      await expect(
        bottomNav.getByRole("link", { name: "동행", exact: true }),
      ).toHaveCount(0);

      await page.locator('a[href^="/rooms?concertId="]').first().click();
      await expect(page).toHaveURL(/\/rooms\?concertId=/);
      await expect(page.getByText("이 공연에서 내 관심 태그")).toBeVisible();
      await expect(page.getByText("설정해 둔 태그가 없습니다")).toBeVisible();
      await page.getByRole("link", { name: /편집/ }).click();
      await expect(
        page.getByRole("dialog", { name: "관심 태그 선택" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page).toHaveURL(/\/rooms\?concertId=/);

      // /profile is fully behind PROFILE-001's Bearer read (see the CB-14 bounce test),
      // so navigating there with the e2e fake token redirects to /. Assert the bottom-nav
      // 프로필 link target instead of clicking through to an auth-gated screen.
      await expect(
        bottomNav.getByRole("link", { name: "프로필", exact: true }),
      ).toHaveAttribute("href", "/profile");
    });

    test("native scrollbars stay hidden on scrollable app surfaces", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/home");

      const bodyScroll = page.locator(".body-scroll").first();

      await expect(bodyScroll).toHaveCSS("scrollbar-width", "none");
    });

    test("key non-profile controls show hover and focus affordances", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 430, height: 932 });
      await page.goto("/home");

      const firstConcertCard = page
        .locator('a[href^="/rooms?concertId="]')
        .first();
      await firstConcertCard.hover();
      await expect(firstConcertCard).toHaveCSS(
        "background-color",
        "rgb(30, 30, 34)",
      );
      await firstConcertCard.focus();
      await expect(firstConcertCard).toHaveCSS("outline-style", "solid");

      await page.goto("/rooms");
      const createRoomFab = page.getByRole("link", { name: "방 만들기" });
      await createRoomFab.hover();
      await expect(createRoomFab).toHaveCSS(
        "background-color",
        "rgb(255, 210, 63)",
      );
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

    test("room list create FAB stays fixed in the viewport while scrolling", async ({
      page,
    }) => {
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

    test("create room carries concertId and gates submit on required inputs", async ({
      page,
    }) => {
      // FAB must preserve concertId into the create route (cross-screen param care).
      await page.goto("/rooms?concertId=100");
      await expect(
        page.getByRole("link", { name: "방 만들기" }),
      ).toHaveAttribute("href", /\/rooms\/create\?concertId=100/);

      await page.goto("/rooms/create?concertId=100");
      const submit = page.getByRole("button", { name: "방 만들기" });
      await expect(submit).toBeDisabled();

      await page.getByRole("button", { name: "태그 추가" }).click();
      await expect(
        page.getByRole("dialog", { name: "방 태그 선택" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "굿즈 구매" }).click();
      await page.getByRole("button", { name: "저장 (1/4)" }).click();

      await page.getByLabel("방 제목").fill("공연 전 굿즈 줄 같이 서요");
      await page
        .getByLabel("한 줄 소개")
        .fill("공연 전 굿즈 수령 후 카페에서 쉬다가 같이 입장해요.");
      await page.getByLabel("집합 시간").fill("2026-06-15T14:00");
      await page
        .getByLabel(/오픈채팅 URL/)
        .fill("https://open.kakao.com/o/test");

      // meetingPlace is chosen via the Kakao map picker (keyword search / map click).
      await expect(page.getByLabel("집합 장소 검색")).toBeVisible();

      // Without a picked meeting place the form stays disabled; the POST is Bearer-gated
      // and cannot be exercised end-to-end without a real Kakao session (see ROOM-002).
      await expect(submit).toBeDisabled();
    });

    test("room detail states and apply modal behave correctly", async ({
      page,
    }) => {
      await page.goto("/rooms/host");
      await expect(page.getByText("내 역할: 방장 · 멤버 2 / 4")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "승인 대기 2" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "army_p1 승인" }).click();
      const approveDialog = page.getByRole("dialog", {
        name: "멤버 승인 확인",
      });
      await expect(approveDialog).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "승인 대기 2" }),
      ).toBeVisible();
      await approveDialog.getByRole("button", { name: "승인하기" }).click();
      await expect(
        page.getByRole("heading", { name: "승인 대기 1" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "참여 멤버 3" }),
      ).toBeVisible();
      await expect(page.getByRole("status")).toHaveText(
        "army_p1 님을 멤버로 추가했어요",
      );
      await page.getByRole("button", { name: "borahae__ 거절" }).click();
      const rejectDialog = page.getByRole("dialog", { name: "신청 거절 확인" });
      await expect(rejectDialog).toBeVisible();
      await rejectDialog.getByRole("button", { name: "거절하기" }).click();
      await expect(
        page.getByRole("heading", { name: "승인 대기 0" }),
      ).toBeVisible();
      await expect(page.getByRole("status")).toHaveText(
        "borahae__ 님의 신청을 삭제했어요",
      );

      await page.goto("/rooms/member");
      await expect(page.getByText("참여 확정 · 멤버 3 / 4")).toBeVisible();
      await expect(page.getByRole("button", { name: "탈퇴" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "오픈채팅" })).toBeVisible();

      await page.goto("/rooms/pending");
      await expect(
        page.getByText("승인 대기 중 · 신청 후 1시간"),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "방장의 승인을 기다리는 중이에요" }),
      ).toBeDisabled();
      await expect(page.getByRole("link", { name: "오픈채팅" })).toHaveCount(0);

      await page.goto("/rooms/visitor?modal=apply");
      const applyDialog = page.getByRole("dialog", {
        name: "입장 신청 메시지",
      });
      await expect(applyDialog).toBeVisible();
      await expect(applyDialog).toBeInViewport();
      await expect(applyDialog.getByLabel("신청 메시지")).toHaveAttribute(
        "maxlength",
        "60",
      );
      await applyDialog.getByRole("button", { name: "닫기" }).click();
      await expect(page).toHaveURL(/\/rooms\/visitor$/);
      await page.goto("/rooms/visitor?modal=apply");
      await expect(
        page.getByRole("dialog", { name: "입장 신청 메시지" }),
      ).toBeInViewport();
      await page
        .getByRole("dialog", { name: "입장 신청 메시지" })
        .getByRole("link", { name: "신청하기", exact: true })
        .click();
      await expect(page).toHaveURL(/\/rooms\/pending$/);
    });

    test("dynamic room detail 뒤로가기 returns to the concert-scoped list via the back param", async ({
      page,
    }) => {
      // The detail's 뒤로 target is driven by the back query param and is independent of
      // whether the ROOM-003 fetch resolves, so this navigates deterministically without
      // seeded backend rooms. Mirrors the CB-04 room card → detail → 뒤로 round trip.
      const back = encodeURIComponent("/rooms?concertId=100");
      await page.goto(`/rooms/999999?back=${back}`);

      const backLink = page.getByRole("link", { name: "뒤로" });
      await expect(backLink).toHaveAttribute("href", "/rooms?concertId=100");

      await backLink.click();
      await expect(page).toHaveURL(/\/rooms\?concertId=100$/);
    });

    test("room detail uses the fixed CB-07 bottom CTA instead of the global bottom nav", async ({
      page,
    }) => {
      await page.goto("/rooms/member");

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
      const memberOpenChatDialog = page.getByRole("dialog", {
        name: "오픈채팅 정보",
      });
      await expect(memberOpenChatDialog).toBeVisible();
      await expect(memberOpenChatDialog).toBeInViewport();
      await expect(page.getByText("open.kakao.com/o/aBcD9XyZ")).toBeVisible();
      await page.getByRole("button", { name: "닫기" }).click();
      await expect(page).toHaveURL(/\/rooms\/member$/);

      await page.goto("/rooms/host?modal=open-chat");
      const hostOpenChatDialog = page.getByRole("dialog", {
        name: "오픈채팅 정보",
      });
      await expect(hostOpenChatDialog).toBeVisible();
      await expect(hostOpenChatDialog).toBeInViewport();
      await expect(page.getByText("open.kakao.com/o/aBcD9XyZ")).toBeVisible();
      await page.getByRole("button", { name: "닫기" }).click();
      await expect(page).toHaveURL(/\/rooms\/host$/);
    });

    test("CB-11 timetable edit shows guidance and skips the draft read without a roomId", async ({
      page,
    }) => {
      // CB-11 now bootstraps its editable draft from SCHEDULE-001 via ?roomId=. With no
      // roomId there is nothing to load, so the screen shows guidance instead of firing a
      // Bearer-gated read, and the bottom nav stays hidden.
      await page.goto("/timetable");
      await expect(page.getByText("일정 수정").first()).toBeVisible();
      await expect(page.getByText("방을 먼저 선택해 주세요")).toBeVisible();
      await expect(page.locator("nav")).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "내 방으로 가기" }),
      ).toHaveAttribute("href", "/my-rooms");
    });

    test("CB-11 timetable edit is behind SCHEDULE-001's Bearer read; an invalid session bounces to /", async ({
      page,
    }) => {
      // With a roomId, CB-11 reads SCHEDULE-001 (GET /api/rooms/{roomId}/timeline) to seed
      // the editable draft and the scheduleId used by SCHEDULE-002/003/004. That read is
      // Bearer-gated with no MSW mock, so the e2e fake token is rejected (401 COMMON401)
      // and the global http interceptor clears the cookie and redirects to /. The draft
      // recalculate / recommend / commit (incl. the 409 → CB-11′ over-time warning) flow
      // therefore can't be exercised end-to-end without a real Kakao session — the same
      // limitation documented for CB-04/06/07/09; it is covered by the CB-11 unit tests.
      await page.goto("/timetable?roomId=10");
      await expect(page).toHaveURL(/\/$/);
    });

    test("CB-09 timeline is behind SCHEDULE-001's Bearer read; an invalid session bounces to /", async ({
      page,
    }) => {
      // CB-09 /timeline is now driven by SCHEDULE-001 (GET /api/rooms/{roomId}/timeline),
      // a Bearer-gated read with no MSW mock. With a real roomId the e2e fake token is
      // rejected (401 COMMON401) and the global http interceptor clears the cookie and
      // redirects to /. The schedule list therefore can't be exercised end-to-end without
      // a real Kakao session — the same limitation documented for CB-04/CB-06/CB-07. The
      // CB-09 unit test covers the rendering (forced-locked first/last slots, route
      // segments, warnings) by mocking the SCHEDULE-001 envelope. The CB-12 map-focus
      // behavior that used to ride along in this test is covered by the CB-12 unit test.
      await page.goto("/timeline?roomId=10");
      await expect(page).toHaveURL(/\/$/);
    });

    test("CB-12 map shows guidance and skips the map read without a roomId", async ({
      page,
    }) => {
      // CB-12 /map is now driven by MAP-001 (GET /api/rooms/{roomId}/map) via ?roomId=.
      // With no roomId there is nothing to load, so the screen shows guidance instead of
      // firing the Bearer-gated read.
      await page.goto("/map");
      await expect(page.getByText("지도").first()).toBeVisible();
      await expect(page.getByText("방을 먼저 선택해 주세요")).toBeVisible();
      await expect(
        page.getByRole("link", { name: "내 방으로 가기" }),
      ).toHaveAttribute("href", "/my-rooms");
    });

    test("CB-12 map is behind MAP-001's Bearer read; an invalid session bounces to /", async ({
      page,
    }) => {
      // With a roomId, CB-12 reads MAP-001 (GET /api/rooms/{roomId}/map) for the pins /
      // route / bounds. That read is Bearer-gated with no MSW mock, so the e2e fake token
      // is rejected (401 COMMON401) and the global http interceptor clears the cookie and
      // redirects to /. Pin/route rendering is covered by the CB-12 unit tests mocking the
      // MAP-001 envelope — the same limitation documented for CB-04/06/07/09/11.
      await page.goto("/map?roomId=10");
      await expect(page).toHaveURL(/\/$/);
    });

    test("CB-03 through CB-12 follows the Hi-Fi page flow for an already-authenticated session", async ({
      page,
    }) => {
      await page.goto("/home");

      await page.locator('a[href^="/rooms?concertId="]').first().click();
      await expect(page).toHaveURL(/\/rooms\?concertId=/);
      await expect(page.getByText("이 공연에서 내 관심 태그")).toBeVisible();

      // CB-04 room cards now come from the live ROOM-001 endpoint; the per-id room detail
      // (CB-07, /rooms/{id}) is Bearer-gated and bounces without a real session, so this
      // UI-only flow continues from the static /rooms/visitor wireframe demo route.
      await page.goto("/rooms/visitor");
      await expect(page).toHaveURL(/\/rooms\/visitor$/);
      await page.getByRole("link", { name: "입장 신청" }).click();
      await expect(
        page.getByRole("dialog", { name: "입장 신청 메시지" }),
      ).toBeVisible();
      await page
        .getByRole("dialog", { name: "입장 신청 메시지" })
        .getByRole("link", { name: "신청하기", exact: true })
        .click();
      await expect(page).toHaveURL(/\/rooms\/pending$/);

      await page.goto("/rooms/member");
      await page.getByRole("link", { name: "오픈채팅", exact: true }).click();
      await expect(page).toHaveURL(/\/rooms\/member\?modal=open-chat$/);
      await expect(
        page.getByRole("dialog", { name: "오픈채팅 정보" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "닫기" }).click();
      await expect(page).toHaveURL(/\/rooms\/member$/);

      await page.getByRole("link", { name: "Open Timeline" }).click();
      await expect(page).toHaveURL(/\/timeline$/);
      // CB-09 timeline and CB-11 timetable are now Bearer/roomId-gated (SCHEDULE-001).
      // Reached from the static wireframe detail without a roomId, both show their guidance
      // empty state instead of the old store-seeded fixtures; the live schedule list / draft
      // edit (recalculate/recommend/commit + 409→CB-11′) flow needs a real session and is
      // covered by the CB-09/CB-11 unit + bounce tests. CB-12 /map keeps its own smoke +
      // unit test (it still reads the Zustand store).
      await expect(page.getByText("방을 먼저 선택해 주세요")).toBeVisible();
      await page.getByRole("link", { name: /수정/ }).click();
      await expect(page).toHaveURL(/\/timetable$/);
      await expect(page.getByText("방을 먼저 선택해 주세요")).toBeVisible();
      await expect(
        page.getByRole("link", { name: "내 방으로 가기" }),
      ).toHaveAttribute("href", "/my-rooms");
    });
  });
});
