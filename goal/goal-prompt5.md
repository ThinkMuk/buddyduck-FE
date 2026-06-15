/Users/think_muk/Desktop/26-1/buddyduck-FE 프로젝트에서 `/places`(CB-10)와 `/timetable`(CB-11, CB-11′)를 `design/Concert Buddy - Hi-Fi UI.html` 기준으로 구현/재정비해줘. 응답은 한국어로 해줘.

먼저 루트 `AGENTS.md`, `design/AGENTS.md`, `dev/AGENTS.md`를 읽고 적용해. 디자인 파일명은 실제 존재하는 `design/Concert Buddy - Hi-Fi UI.html`을 기준으로 해. `dev/` 하위 구현/수정이므로 `dev/AGENTS.md` 개발 컨벤션을 반드시 적용하고, 새 공통 컴포넌트를 만들면 `dev/AGENTS.md` 컴포넌트 목록도 업데이트해. 디자인 토큰/디자인 규칙을 바꾸는 경우에만 `design/AGENTS.md`를 업데이트해.

## 목표

`/places`와 `/timetable`를 Hi-Fi 디자인의 CB-10, CB-11, CB-11′와 동일한 간격/구조/시각 밀도로 맞추고, CB-09(`/timeline`), CB-10(`/places`), CB-11/CB-11′(`/timetable`), CB-12(`/map`)가 같은 mock 일정 데이터를 공유하도록 만든다.

현재 구현은 이미 존재하므로 새로 갈아엎지 말고 재사용/확장해.

주요 파일:
- `dev/app/places/_components/place-search-screen.tsx`
- `dev/app/timetable/_components/timetable-edit-screen.tsx`
- `dev/app/timeline/_components/timeline-screen.tsx`
- `dev/app/map/_components/map-screen.tsx`
- `dev/app/_components/buddy-patterns.tsx`
- `dev/src/components/ui.tsx`
- `dev/src/lib/data.ts`
- `dev/src/store/app-store.ts`
- `dev/app/_components/app-screens.test.tsx`
- `dev/src/lib/timetable.test.ts`
- `dev/src/lib/data.contract.test.ts`
- `dev/e2e/buddyduck.spec.ts`

현재 git worktree가 더러울 수 있으니 네가 만들지 않은 변경은 되돌리지 말고 필요한 파일만 조심해서 수정해.

## 진행 방식

1. 구현 전 비파괴 탐색을 해.
   - `design/Concert Buddy - Hi-Fi UI.html`에서 CB-10, CB-11, CB-11′, CB-09, CB-12 스니펫을 확인해.
   - 기존 `/places`, `/timetable`, `/timeline`, `/map` 구현과 테스트를 확인해.
   - 불명확한 점이 있으면 구현 전에 AskUserQuestionTool로 질문해. 단, repo에서 확인 가능한 사실은 질문하지 말고 직접 확인해.

2. 정확도를 높이기 위해 sub agent / multi agent를 사용해.
   - 가능하면 `tool_search`로 사용 가능한 multi-agent/subagent 도구를 찾아.
   - 구현 전 병렬 조사 subagent를 2~3개 사용해도 좋다:
     - Design auditor: CB-10/CB-11/CB-11′ HTML 구조, spacing, action labels 정리
     - State/data mapper: CB-09/10/11/12 데이터 공유 구조와 현재 문제점 정리
     - Test reviewer: 필요한 단위/e2e 테스트 시나리오 정리
   - 실제 파일 수정은 충돌 방지를 위해 한 흐름에서 진행해. 구현 후에는 별도 reviewer subagent나 자체 리뷰로 요구사항 누락을 확인해.

3. QA나 설계 의견 검토에 `kiro-cli`를 활용해.
   - 먼저 `command -v kiro-cli`로 존재 여부를 확인해.
   - 실제 non-interactive 옵션은 `kiro-cli chat --no-interactive "질문"` 형태다. 사용 전 `kiro-cli chat --help`로 확인해.
   - 예: `kiro-cli chat --no-interactive "BuddyDuck FE의 CB-10/CB-11 일정 데이터 동기화 구현 계획/diff에서 빠진 요구사항이나 위험을 리뷰해줘."`
   - 3회 실패하면 멈추지 말고 실패 이유를 기록한 뒤 subagent/self review로 대체해.

4. 가능하면 TDD로 진행해.
   - 먼저 실패하는 테스트를 추가/수정하고 실패를 확인한 뒤 구현해.
   - 단순 스타일 세부는 구현 후 Playwright/브라우저 확인으로 보완해.

## 상태 관리 / 데이터 동기화 필수 요구

- CB-09, CB-10, CB-11, CB-11′, CB-12는 하나의 mock 일정 데이터를 공유해야 한다.
- 상태 생명주기:
  - 라우트 이동 중에는 변경사항이 유지되어야 한다.
  - 새로고침/앱 재진입 시에는 기본 mock 데이터로 초기화되어야 한다.
  - localStorage/sessionStorage persist는 사용하지 마.
- 권장 구조:
  - `dev/src/lib/data.ts`는 초기 mock seed와 순수 helper를 담당한다.
  - `dev/src/store/app-store.ts`를 확장해 클라이언트 세션 내 단일 상태 소스로 사용한다.
  - 화면들은 `timelineStopsByDay`를 직접 import해 화면 상태로 복사하지 말고 store selector/action을 사용한다.
- store에 필요한 상태/액션 예:
  - `timelineStopsByDay`
  - `activeTimelineDay`
  - `selectedStopId`
  - `activeStopId`
  - `setActiveTimelineDay`
  - `selectStop`
  - `hoverStop`
  - `updateStopMinutes`
  - `updateRouteMode`
  - `addPlaceToTimetable`
  - `deleteTimetableStop`
  - `resetTimetable`
- `/timetable`에서 체류/이동 시간 변경 후 저장하면 `/timeline`과 `/map`에 반영되어야 한다.
- `/places`에서 장소를 추가하면 `/timetable`, `/timeline`, `/map` 모두에 반영되어야 한다.
- CB-10의 `places` mock fixture는 현재 일정 stop으로 만들기 위한 필드가 부족할 수 있다. 필요한 경우 `mapPoint`, `dwellMinutes`, `transitMinutes`, `mode`, `routeDistance`, `routeModeLabel`, `routeModeShort` 등 최소 필드를 확장하거나 변환 helper를 추가해.
- 새 장소 추가 시 공연 anchor 이전에 삽입하고, 공연 시작 locked stop은 삭제/순서 변경 불가로 유지해.

## CB-10 `/places` UI 요구

`design/Concert Buddy - Hi-Fi UI.html`의 CB-10 Place Search와 동일하게 맞춰.

- 화면명: `장소 추가`
- AppBar:
  - 좌측 close 아이콘 버튼
  - 중앙 title
  - 우측에는 실제 버튼 없이 `38px` 빈 영역을 둬 중앙 정렬 균형 유지
- 검색창:
  - 장소명/주소를 같은 입력에서 처리하는 단일 검색창
  - placeholder: `장소명 또는 주소 검색`
  - 높이 `46px`, margin `8px 16px 4px`, radius `14px`, surface-2 배경, line border, 내부 padding `0 14px`, search icon `18px`, text `13.5px`
  - 실제 input이어야 하며 입력에 따라 mock 결과가 필터링되어야 한다.
- 카테고리 칩:
  - `전체`, `카페`, `식당`, `굿즈`, `포토존`
  - `전체` 기본 active
  - 클릭 시 active 상태와 결과 필터링 동작
  - 높이 `34px`, gap `8px`, 좌우 padding `16px`, 가로 스크롤 가능
- 결과 리스트:
  - 장소 결과 row: padding `13px 0`, bottom border, gap `12px`
  - 장소 썸네일: `50 x 50`, radius `14px`, `IMG` placeholder
  - 주소 결과: `50 x 50` 주소 아이콘 박스와 yellow pin icon
  - `추가` 버튼: 높이 `34px`, pill, yellow dim 배경, yellow line border, `12px / 700`, plus icon `13px`
- 상호작용:
  - 장소명 검색 시 장소 mock 결과 노출
  - 주소 입력 시 주소 후보도 함께 노출
  - `추가` 클릭 시 일정 store에 추가하고 `/timetable`로 복귀
  - 이미 추가된 장소는 같은 세션 내에서 중복 추가되지 않게 처리하고 버튼 상태를 `추가됨` 또는 outline/check 상태로 표시

## CB-11 `/timetable` UI 요구

`design/Concert Buddy - Hi-Fi UI.html`의 CB-11 Timetable Edit와 동일하게 맞춰.

- 화면명: `일정 수정`
- AppBar:
  - 좌측 close 아이콘
  - 우측 `초기화` 텍스트 액션
  - `초기화` 클릭 시 세션 store를 기본 mock 일정으로 되돌림
- Header:
  - padding `14px 16px`, 하단 border
  - 제목: `2026.06.15 (월) — D-Day`, `15px / 700`
  - 설명: `장소 블록 · 이동 블록 · 잠긴 공연 블록 · (수정 모드) 여유 시간`, `11.5px`, text-3
- 편집 UI는 “15분 그리드”가 아니라 세로 블록형 편집기다.
- `blocks` 영역:
  - padding `14px 16px`
  - 장소 블록과 이동 블록을 세로로 쌓는다.
- 장소 블록:
  - surface-1, line border, radius `14px`, card shadow
  - top row padding `12px 12px 10px`, gap `9px`
  - grip은 3개 막대, 각 `13 x 2`, gap `2px`, cursor `grab`
  - 번호 배지 `24 x 24`, `11px / 800`
  - 장소명 `13.5px / 700`
  - 시간 `11px / 600`
  - 삭제 버튼 `24 x 24`, 투명 원형, `×`
  - 체류 row padding `10px 12px`, 상단 border
  - stepper 높이 `34px`, 버튼 `26px`, 값 최소 폭 `54px`
- 이동 블록:
  - 장소 사이 연결선 역할
  - padding `10px 12px`, margin `2px 0 2px 30px`, 좌측 `2px dashed` border
  - 이동수단 원형 아이콘 `22 x 22`, `도`/`택`
  - `도보`, `택시` pill 버튼은 클릭 가능하고 active는 yellow
  - 이동 시간 stepper 동작
- 공연 시작 locked/anchor 블록:
  - yellow dim 배경, yellow line border
  - star 번호 배지, lock 아이콘 포함
  - 삭제 버튼 없음
  - grip opacity `.3`
  - 공연 시간과 순서는 잠김
  - 도착 버퍼는 `30분`, stepper 가능
  - `공연 시간·순서는 잠김`, `5분 단위 · 최소 10분` 문구 표시
- 하단 고정 영역:
  - padding `12px 16px calc(14px + env(safe-area-inset-bottom))`
  - top border
  - 안내문 `10.5px`: `장소 추가·순서 변경·삭제 시 시간이 자동 역산돼요. 이동 구간은 저장된 값 재사용, 새 구간만 새로 계산.`
  - primary CTA `수정 완료`, 높이 `54px`
- 상호작용:
  - 체류 시간 증가/감소
  - 이동 시간 증가/감소
  - 도보/택시 전환
  - 장소 삭제
  - 장소 추가 링크/button → `/places`
  - 초기화
  - 가능하면 간단한 순서 변경 인터랙션도 구현. drag-and-drop이 과하면 위/아래 이동 버튼으로 대체 가능하되 UI가 디자인을 크게 해치지 않게 처리
  - 변경 시 일정 시간 표시가 재계산되어 CB-09/CB-12에도 반영되어야 한다.

## CB-11′ Over-Time Warning 요구

`/timetable?modal=warning` 또는 저장 시 초과 상태에서 CB-11 위에 차단성 모달로 표시해.

- toast가 아니라 저장을 막는 blocking modal이다.
- 배경 편집 영역은 blur/opacity 처리하고 pointer-events를 막는다.
- AppBar/Header는 유지한다.
- 모달:
  - 중앙 배치
  - radius `24px`, padding `20px`, gap `16px`
  - title: `지금 일정을 전부 소화할 수 없습니다`
  - subtitle: `공연 시작 시간을 기준으로 역산했어요`
  - yellow solid warning icon `42 x 42`, radius `14px`
- 초과 요약 박스:
  - yellow line border, radius `14px`, padding `14px`, gap `10px`, surface-2 배경
  - `사용 가능 시간 14:00 – 18:30 · 4h 30m`
  - `현재 일정 총 소요 ...`
  - `초과 시간 + ...`
  - 초과 시간 값은 `20px / 800`, yellow
- 안내 문구:
  - `장소를 줄이거나 체류 시간을 줄여 주세요. 도보 → 택시 변경으로도 일부 단축할 수 있어요. 공연 도착 버퍼 30분은 자동으로 확보돼요.`
- 액션:
  - primary 버튼 하나: `되돌아가서 수정`
  - 클릭 시 `/timetable`로 돌아가고 현재 세션 변경 상태는 유지
- `수정 완료` 시 초과 시간이 있으면 저장/이동하지 말고 warning modal로 이동/표시한다.
- 초과가 없으면 `/timeline`으로 이동하고 변경된 데이터가 CB-09/CB-12에 반영되어야 한다.

## CB-09 / CB-12 연동 보존

- `/timeline`은 store의 D-Day stops를 읽어야 하며, `/timetable` 변경사항이 반영되어야 한다.
- `/map`도 같은 store 데이터를 읽어야 하며, 새 장소/시간/핀 번호가 반영되어야 한다.
- 기존 RouteMapCanvas, MapPin, MapPlaceCard는 가능한 재사용해.
- CB-09 pin/card active 동기화와 CB-12 fallback 동작을 깨지 마.
- `/timeline` → `/timetable` → `/places` → 추가 → `/timetable` → 수정 완료 → `/timeline` → `/map` 플로우가 연결되어야 한다.

## 컴포넌트 재사용

- 우선 재사용:
  - `AppBar`, `Button`, `Chip`, `Card`, `Stepper`
  - `BackButton`, `InfoRow`
  - `RouteMapCanvas`, `MapFallback`, `MapPin`, `MapPlaceCard`
- 중복이 커지면 route-local shared component 또는 `buddy-patterns.tsx` 공통 컴포넌트로 정리해.
- 새 컴포넌트를 만들면 `dev/AGENTS.md` 목록에 추가해.
- 단순 스타일 보정만이면 문서 파일을 만들지 마.

## 접근성 / UX

- 버튼, input, chip, stepper, modal close/back 모두 실제 상호작용 가능해야 한다.
- 클릭 가능한 카드/핀/칩은 button 또는 적절한 aria/keyboard 처리를 사용해.
- `aria-label`을 필요한 곳에 제공해.
- focus-visible 스타일을 유지해.
- 430 x 932 viewport에서 텍스트/버튼/카드/핀/하단 CTA가 겹치지 않아야 한다.
- 런타임 앱에는 디자인 HTML의 `device`, `notch`, `statusbar` 장식을 넣지 마. 기존 centered mobile shell 정책 `max-width: 430px`를 유지해.

## 테스트 요구

수정 전 실패 테스트를 먼저 추가/수정하고 확인해.

추가/보강할 테스트:
- `dev/src/store/app-store.test.ts` 또는 적절한 store 테스트
  - 기본 timetable seed가 존재
  - `updateStopMinutes`가 stop을 변경
  - `addPlaceToTimetable`이 locked 공연 전 stop을 추가
  - `resetTimetable`이 기본 mock으로 복원
- `dev/src/lib/data.contract.test.ts`
  - `places` fixture가 일정 stop 변환에 필요한 필드를 갖는지 검증
- `dev/src/lib/timetable.test.ts`
  - 변경된 stops 기준 초과 시간 계산
  - 장소 추가 후 over-time 판단
- `dev/app/_components/app-screens.test.tsx`
  - CB-10 검색 input/chip/추가 버튼 렌더와 동작
  - CB-11 stepper 조작 후 값 변경
  - CB-11 초기화 동작
  - CB-10에서 추가한 장소가 CB-11에 표시
  - CB-11에서 변경한 시간이 CB-09에 표시
  - CB-12가 같은 store 데이터를 사용
  - CB-11′ warning modal 렌더와 복귀 동작
- `dev/e2e/buddyduck.spec.ts`
  - `/timetable` → `장소 추가` → `/places` → 결과 추가 → `/timetable`에 추가 장소 표시
  - `수정 완료` 후 `/timeline`에 추가 장소/변경 시간이 표시
  - `/map`에 같은 장소가 표시
  - 초과 상태에서는 warning modal이 뜨고 저장이 차단됨
  - 새로고침하면 기본 mock 데이터로 초기화됨

## 검증

구현 후 아래 명령을 `dev/`에서 실행하고 fresh output을 확인해. 성공했다고 말하기 전 직접 결과를 확인해.

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- 가능하면 `npm run test:e2e`

Playwright 또는 Browser 확인은 430 x 932 viewport 기준으로 `/places`, `/timetable`, `/timetable?modal=warning`, `/timeline`, `/map`을 확인해.

마지막 보고에는 다음만 짧게 포함해:
- 변경 파일
- 핵심 구현 요약
- 검증 명령 결과
- 남은 리스크 또는 실행하지 못한 검증
