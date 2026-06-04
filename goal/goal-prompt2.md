`dev/` 안의 npm 기반 Next.js App Router 프로젝트를 `design/Concert Buddy - Hi-Fi UI.html`과 `design/AGENTS.md` 기준으로 재정비한다. 목표는 기존 Hi-Fi HTML 디자인을 최대한 충실히 웹 앱으로 재현하되, 런타임 웹 앱에서는 와이어프레임용 폰 목업 장식을 제거하고 중앙 정렬된 모바일 앱 컨테이너로 제공하는 것이다.

## 핵심 방향

- 구현 대상은 `dev/` 안의 Next.js App Router 프로젝트다.
- 기준 디자인은 `design/Concert Buddy - Hi-Fi UI.html`과 `design/AGENTS.md`다.
- `device`, `notch`, `statusbar` 같은 와이어프레임/프레젠테이션용 모바일 목업 장식은 런타임 웹 앱에서 제거한다.
- 웹 앱 루트 컨테이너는 `max-width: 430px`, `width: 100%`, `margin: 0 auto`를 기본으로 하고, 세로 높이는 콘텐츠 흐름에 맞게 자유롭게 둔다.
- 데스크톱 전용 레이아웃은 만들지 않고, 모바일 앱 경험을 웹 중앙 컨테이너로 제공한다.
- `dev/fonts/pretendard/PretendardVariable.woff2`를 `dev/public/fonts/pretendard/PretendardVariable.woff2`로 옮겨 Next public asset으로 제공하고, 전역 기본 폰트로 적용한다.
- 기존 `app/[[...slug]]` catch-all 중심 구조는 화면별 App Router 파일 기반 route로 분리한다.

## shadcn/ui 도입

다음 설정으로 shadcn/ui를 도입한다.

```bash
npx shadcn@latest init
```

- style: `new-york`
- aliases:
  - `@/components`
  - `@/components/ui`
  - `@/lib/utils`
  - `@/hooks`
- 추가 컴포넌트:

```bash
npx shadcn@latest add button card dialog input textarea label form badge tabs sheet select switch separator avatar scroll-area
```

shadcn 기본 테마를 그대로 사용하지 않는다. `design/AGENTS.md`의 dark/yellow 토큰을 기준으로 Tailwind/global CSS/shadcn CSS 변수와 컴포넌트 variant를 커스터마이즈한다.

## 재사용 컴포넌트 구조

기존 직접 만든 공통 UI는 shadcn 기반 primitive를 감싸는 Buddy Duck 컴포넌트로 정리한다. 새 컴포넌트를 만들거나 역할을 바꾸면 `dev/AGENTS.md`에 목록과 용도를 업데이트한다.

필수 분리 대상:

- app shell/layout
- app bar
- bottom nav
- button
- chip/badge/tag
- input/textarea/form field
- modal/dialog/sheet
- card류
- room card
- concert card
- timeline block
- map fallback/pin/card
- avatar/member row

## 라우팅 및 화면 범위

CB-01부터 CB-14′까지 총 21개 화면은 모두 접근 가능해야 한다. 화면은 App Router 파일 기반 route로 나누고, 모달 성격의 화면은 query state로 유지한다.

필수 모달 query state:

- `/rooms?modal=tags`
- `/rooms/visitor?modal=apply`
- `/timetable?modal=warning`

구현 대상 화면:

- CB-01 Login
- CB-02 Nickname
- CB-03 Home
- CB-04 Room List
- CB-04′ Tag Modal
- CB-05 Create Room
- CB-06 My Rooms
- CB-07A Room Detail — Host
- CB-07B Room Detail — Member
- CB-07C Room Detail — Pending
- CB-07D Room Detail — Visitor
- CB-07D′ Apply Modal
- CB-08 Open Chat
- CB-09 Timeline
- CB-10 Place Search
- CB-11 Timetable Edit
- CB-11′ Over-Time Warning
- CB-12 Map View
- CB-13 Memory Feed
- CB-14 Profile
- CB-14′ Profile Edit

## 구현 요구사항

- Hi-Fi HTML의 시각 계층, spacing, radius, shadow, dark/yellow token, typography를 앱 전반에 반영한다.
- Pretendard public font를 전역 기본 폰트로 적용한다.
- 주요 버튼, 탭, 모달, 폼 상태, 일정 편집, 지도 fallback 상호작용을 최소 동작하게 만든다.
- Kakao Maps는 API key가 없어도 깨지지 않는 loader와 fallback UI를 유지한다.
- mock data/MSW/TanStack Query 경계는 이후 API 교체가 쉽도록 유지한다.
- 기존 사용자 변경사항은 되돌리지 않는다.
- 디자인 토큰 자체를 바꾸지 않는 한 `design/AGENTS.md`, `design/CLAUDE.md`는 수정하지 않는다.

## 검증 기준

필수 명령:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Playwright 검증을 추가한다.

- `@playwright/test`를 설치한다.
- 기본 viewport는 `430 x 932`로 둔다.
- 로그인, 홈, 방 목록, 방 상세 4종, 일정 편집, 지도, 프로필, 모달 3종을 확인한다.
- UI/UX 검증 항목:
  - 앱 폭이 `max-width: 430px`로 고정되고 중앙 정렬된다.
  - 폰 목업 장식이 노출되지 않는다.
  - 주요 스크롤, CTA, bottom nav가 정상 동작한다.
  - 모달 focus, 닫기 동작이 정상 동작한다.
  - 지도 fallback이 API key 없이 표시된다.

Playwright 실행이 환경 문제로 불가능하면 실패 이유와 남은 리스크를 작업 결과에 명확히 남긴다.

