/Users/think_muk/Desktop/26-1/buddyduck-FE 프로젝트에서 `dev/app/timeline/page.tsx`의 `/
  timeline` 페이지를 `design/Concert Buddy - Hi-Fi UI.html`의 CB-09 Timeline 화면 기준으로 구
  현해줘.

  응답은 한국어로 해줘. 구현 전에는 반드시 실제 파일을 먼저 읽고, 루트 `AGENTS.md`, `design/
  AGENTS.md`, `dev/AGENTS.md` 지침을 적용해줘. 디자인 파일명은 프롬프트에 오타 후보가 있어도
  실제 존재하는 `design/Concert Buddy - Hi-Fi UI.html`을 기준으로 해줘.

  ## 목표

  `/timeline`을 CB-09 Hi-Fi 디자인과 동일한 간격/구조/시각 밀도로 맞추고, 상단 MAP Preview와
  하단 오늘 일정이 양방향으로 연동되는 프론트엔드 인터랙션을 완성한다.

  현재 구현은 이미 다음 구조가 있으니 새로 갈아엎지 말고 재사용/확장해줘.

  - `dev/app/timeline/_components/timeline-screen.tsx`
  - `dev/app/map/_components/map-screen.tsx`
  - `dev/app/_components/buddy-patterns.tsx`
  - `dev/src/lib/kakao-map.ts`
  - `dev/src/lib/data.ts`
  - `dev/src/store/app-store.ts`
  - `dev/app/_components/app-screens.test.tsx`
  - `dev/e2e/buddyduck.spec.ts`

  현재 git worktree가 더러울 수 있으니, 네가 만들지 않은 변경은 되돌리지 말고 필요한 파일만 조
  심해서 수정해줘.

  ## 진행 방식

  1. 먼저 비파괴 탐색을 해줘.
     - CB-09, CB-08, CB-10, CB-11, CB-12의 디자인 HTML 스니펫을 확인해.
     - 기존 `/timeline`, `/map`, `/timetable`, `/places` 구현과 테스트를 확인해.
     - `Kakao Maps JavaScript API`를 현재 `src/lib/kakao-map.ts` 방식으로 프론트엔드에서 붙일
     수 있는지 확인해.
     - 불명확한 점이 있으면 구현 전에 `AskUserQuestionTool`로 질문해. 특히 “CB-08 페이지와 간
     격/디자인 동일”이라는 요구가 CB-09와 충돌하면 질문하고, 답이 없으면 CB-09를 1차 기준으로
     삼아.

  2. 정확도를 높이기 위해 sub agent / multi agent를 사용해줘.
     - 가능하면 `tool_search`로 사용 가능한 multi-agent/subagent 도구를 찾아.
     - 구현 전 병렬 조사 subagent를 2~3개 사용해도 좋다:
       - Design auditor: CB-09/CB-08 HTML 구조, spacing, action labels 정리
       - Code mapper: 기존 컴포넌트/데이터/라우트 재사용 포인트 정리
       - Kakao feasibility reviewer: Kakao Map API 연동 방식과 fallback 정책 검토
     - 실제 파일 수정은 충돌 방지를 위해 한 흐름에서 진행하고, 구현 후 spec compliance
     reviewer와 code quality reviewer를 분리해서 검토해.

  3. 가능하면 TDD로 진행해.
     - 먼저 `/timeline`의 map pin click -> schedule card scroll, schedule card hover/focus ->
     map pin active, CTA route 동작 테스트를 추가하고 실패를 확인해.
     - 그다음 최소 구현으로 통과시켜.
     - UI 세부는 Playwright/Brower 확인으로 보완해.

  4. QA 또는 설계 의견 검토에 `kiro-cli --no interactive`를 활용해줘.
     - 먼저 `command -v kiro-cli`로 존재 여부를 확인해.
     - 사용 가능하면 non-interactive 방식으로 현재 구현 계획 또는 diff를 검토 요청해.
     - 예: “CB-09 timeline 구현 계획/변경 diff가 요구사항을 빠뜨린 부분이 있는지 리뷰해줘.”
     - 명령 옵션이 실패하면 `kiro-cli --help`로 올바른 non-interactive 옵션을 확인해. 3회 실패
     하면 멈추고 실패 이유를 기록한 뒤 자체/subagent 리뷰로 대체해.

  ## 구현 요구사항

  ### CB-09 UI

  - `/timeline`은 CB-09 디자인 구조를 기준으로 구현해.
  - 상단 AppBar:
    - 제목: `2026.06.15 (월) D-3` 또는 디자인/기존 데이터와 일치하는 날짜 표기
    - 우측 지도 아이콘 버튼은 `/map`(CB-12)로 이동
  - 상단 MAP Preview:
    - 디자인 기준 높이 약 184px, 앱 폭 내 고정 preview 영역
    - `MAP PREVIEW` 라벨
    - D-Day / D+1 탭 또는 현재 디자인에 해당하는 day tab이 있으면 인터랙션 가능하게 구현
    - numbered pin 1,2,3 및 locked 공연 pin은 CB-09와 유사하게 표시
  - 하단 오늘 일정:
    - `오늘 일정` header
    - timeline rail, numbered pin, card, 이동 연결선, 이동수단/거리 텍스트를 CB-09처럼 표시
    - 공연 시작 카드는 locked/anchor 스타일로 강조
  - 하단 액션:
    - `수정` -> `/timetable` (CB-11)
    - `지도` -> `/map` (CB-12)
    - `추억` -> `/memories` (CB-13)
  - 기존 CB-11 `/timetable`의 `장소 추가` -> `/places` (CB-10) 흐름은 깨지지 않게 유지해.

  ### 인터랙션

  - 모든 버튼, 탭, 입력/클릭 가능한 요소는 실제로 동작해야 한다.
  - 데이터는 mock 데이터 기반이어야 하며, 페이지를 다시 들어오면 기존 mock 상태로 돌아와야 한
  다. localStorage/sessionStorage에 persist하지 마.
  - MAP Preview pin 클릭:
    - 해당 오늘 일정 카드로 smooth scroll 이동
    - 해당 pin/card active 상태 표시
    - 키보드 접근 가능하도록 button과 aria-label 사용
  - 오늘 일정 카드 hover/focus/click:
    - 카드 hover/focus 시 상단 MAP Preview의 해당 pin이 hover/active처럼 반응
    - 클릭 시 해당 pin도 selected 상태가 되고 필요하면 preview 중심/강조 상태를 갱신
  - MAP Preview와 `/map`(CB-12)은 같은 mock stop 데이터/좌표를 공유하도록 중복을 줄여.
  - hover motion은 과하지 않게:
    - border/background/scale 정도의 150~200ms transition
    - layout shift가 없어야 함

  ### Kakao Map

  - `NEXT_PUBLIC_KAKAO_MAP_KEY`가 있으면 Kakao Maps JavaScript API를 사용해 MAP Preview와 `/
  map`에 실제 map container를 렌더링할 수 있게 해.
  - 키가 없거나 스크립트 로딩 실패 시 현재의 `MapFallback`/mock grid fallback이 보여야 하며,
  fallback에서도 pin click/hover/scroll 연동은 동일하게 동작해야 한다.
  - `src/lib/kakao-map.ts`는 `window.kakao.maps.load`까지 고려해 타입을 안전하게 정리해.
  - marker는 Kakao CustomOverlay 또는 유사 방식으로 numbered pin UI를 유지해.
  - 현재 단계는 프론트엔드만 구현한다. 백엔드 연동이 필요한 항목이 명확히 생기면 `todo.md`를
  생성해 추후 백엔드 작업 목록을 짧게 정리해:
    - 장소/좌표 API 계약
    - 일정 저장/조회 API
    - Kakao 장소 검색 결과 저장 방식
    - 권한/방 멤버 접근 제어

  ### 모션 이동: CB-09 -> CB-12

  - `/timeline` 우측 상단 지도 버튼 클릭 시 `/map`으로 이동한다.
  - 가능한 경우 View Transition API 또는 CSS 기반 shared-element 느낌으로, 상단 축소 맵이 내려
  오며 커지는 모션을 구현해.
  - `framer-motion` 등 새 라이브러리는 현재 의존성에 없으므로 기본값은 CSS/View Transition이
  다. 새 의존성이 필요하다고 판단되면 `AskUserQuestionTool`로 먼저 물어봐.
  - View Transition API 미지원 브라우저에서는 일반 라우팅으로 fallback되어야 한다.

  ### 컴포넌트 재사용

  - 기존 공통 컴포넌트를 우선 재사용해:
    - `AppBar`, `Button`, `Chip`, `Card`
    - `TimelineBlock`, `MapFallback`, `MapPin`, `MapPlaceCard`
  - 중복이 커지면 shared schedule/map 컴포넌트로 정리하되, 새 컴포넌트를 만들면 `dev/
  AGENTS.md`의 컴포넌트 목록도 업데이트해.
  - 디자인 토큰이나 디자인 규칙을 새로 추가/변경하면 `design/AGENTS.md`도 업데이트해.
  - 단순 스타일 보정만으로 충분하면 문서 파일을 만들지 마.

  ## 품질 기준

  - 모바일 shell은 `max-width: 430px` 정책을 유지하고, 디자인 HTML의 device/notch/statusbar 장
  식은 런타임 앱에 넣지 마.
  - 430 x 932 viewport에서 텍스트/버튼/카드/지도 pin이 겹치지 않아야 한다.
  - MAP Preview와 일정 리스트 간 active/hover 상태가 시각적으로 명확해야 한다.
  - `/timeline`, `/map`, `/timetable`, `/places` 흐름이 깨지지 않아야 한다.
  - mock 데이터는 재진입 시 원래 상태로 복원되어야 한다.
  - 접근성:
    - pin 버튼에 `aria-label`
    - 일정 카드가 클릭 가능하면 button 또는 적절한 role/keyboard handler 사용
    - focus-visible 상태 제공

  ## 테스트/검증

  수정 후 아래를 실행하고 결과를 확인해. 성공했다고 말하기 전 fresh output을 직접 확인해.

  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
                                                                             - 가능하면 `npm run test:e2e`

  테스트 추가/수정 기준:

  - `app-screens.test.tsx`
    - CB-09가 MAP Preview, 오늘 일정, 하단 액션을 렌더링
    - pin 클릭 시 selected state 변경
    - 일정 카드 hover/focus 시 pin active class/state 반영
    - `수정`, `지도`, `추억` 링크 href 확인
  - `e2e/buddyduck.spec.ts`
    - `/timeline`에서 pin 클릭 -> 해당 일정 카드가 viewport에 들어옴
    - 일정 카드 hover/focus -> 해당 pin active 표시
    - 지도 버튼 -> `/map`
    - `/timetable` -> `장소 추가` -> `/places` 기존 흐름 유지
    - Kakao key 미설정 시 fallback이 보이면서 인터랙션은 유지

  마지막에는 변경 파일, 검증 명령 결과, 남은 리스크를 짧게 보고해.
