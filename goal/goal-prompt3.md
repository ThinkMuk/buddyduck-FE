
  # BuddyDuck — 전체 화면 픽셀 퍼펙트 구현

  ## 프로젝트 개요
  콘서트 동행 매칭 앱 "BuddyDuck"의 프론트엔드를 Hi-Fi 디자인 파일 기준으로 완전 구현한다.

  **디자인 파일 API:**
  https://api.anthropic.com/v1/design/h/hyNgK6yDlmlpBkohROhxmQ?open_file=Concert+Buddy+-+Hi-Fi+UI.html

  작업 시작 전 위 URL에서 디자인 파일을 반드시 가져와 읽은 뒤, 각 화면의 레이아웃·간격·색상·인터랙션을 기준으로 삼는다.

  ---

  ## 작업 디렉토리
  `dev/` — Next.js App Router + React + TypeScript + Tailwind CSS

  ---

  ## 디자인 토큰 (CSS 변수, globals.css에 이미 정의되어 있어야 함)

  ### Surface
  - `--cb-bg: #0E0E10` (앱 배경)
  - `--cb-surface-1: #161618` (카드)
  - `--cb-surface-2: #1E1E22` (인풋/보조 카드)
  - `--cb-surface-3: #27272C` (칩/hover/아바타)

  ### Border
  - `--cb-line: rgba(255,255,255,.07)`
  - `--cb-line-2: rgba(255,255,255,.13)`

  ### Brand Yellow
  - `--cb-yellow: #FDBE0D` (CTA 배경)
  - `--cb-yellow-2: #FFD23F` (hover)
  - `--cb-yellow-dim: rgba(253,190,13,.13)`
  - `--cb-yellow-line: rgba(253,190,13,.40)`
  - `--cb-on-yellow: #1C1A12` (yellow 위 텍스트)

  ### Text
  - `--cb-text: #FDFCFD`
  - `--cb-text-2: #A6A6AD`
  - `--cb-text-3: #6C6C74` (placeholder/disabled)

  ### Etc.
  - `--cb-danger: #FF6B5B`

  ### Radius
  - `--r-xs: 6px` / `--r-sm: 10px` / `--r-md: 14px` / `--r-lg: 18px` / `--r-xl: 24px` / `--r-pill: 999px`

  ### Shadow
  - `--sh-card: 0 1px 0 rgba(255,255,255,.03) inset, 0 8px 24px -12px rgba(0,0,0,.7)`
  - `--sh-pop: 0 24px 60px -20px rgba(0,0,0,.85)`
  - `--sh-glow: 0 6px 22px -6px rgba(253,190,13,.45)`

  ---

  ## 타이포그래피 규칙
  - 폰트: Pretendard (`public/fonts/pretendard/PretendardVariable.woff2`)
  - 대형 타이틀 21px/700, 카드 제목 15px/700, 앱바 14px/600
  - 섹션 라벨 13px/600, 칩/보조 12–12.5px/500–600, 메타/캡션 10.5–11.5px
  - 줄간격: 기본 1.5

  ---

  ## 레이아웃 규칙
  - 앱 컨테이너: `max-width: 430px`, `width: 100%`, `margin: 0 auto`
  - 수평 패딩: 16px
  - 카드 내부 패딩: 14px 또는 12px 16px
  - 컴포넌트 gap: 주로 8px, 12px
  - 아이콘 기본 크기: 20×20px (앱바 back: 23px)
  - 폰 프레임(device/notch/statusbar) 절대 미표시 — 런타임 웹앱이므로 불필요

  ---

  ## 공유 컴포넌트 스펙

  ### Button
  - Primary: height 54px, bg `--cb-yellow`, text `--cb-on-yellow`, radius `--r-md`, shadow `--sh-glow`, font-weight 700
  - Outline: bg `--cb-surface-2`, text white, border `--cb-line-2`
  - Disabled: bg `--cb-surface-2`, text `--cb-text-3`
  - 카카오: bg `#FEE500`, text `#191600`, 카카오 로고 아이콘 포함
  - 보조 액션: height 50px

  ### Chip (필터/태그)
  - Height 34px, radius `--r-pill`
  - 비활성: bg `--cb-surface-2`, text `--cb-text-2`
  - 활성: bg `--cb-yellow`, text `--cb-on-yellow`, font-weight 700
  - 클릭 시 상태 토글 애니메이션 포함

  ### Input / Textarea
  - min-height 48px (textarea 74px), radius `--r-md`
  - bg `--cb-surface-2`, border `--cb-line`
  - focus 시 border `--cb-line-2` + 미세한 glow
  - placeholder: `--cb-text-3`

  ### Modal (Sheet)
  - Bottom sheet: left/right 14px, bottom 14px, radius `--r-xl`
  - bg `--cb-surface-1`, border `--cb-line-2`, shadow `--sh-pop`
  - backdrop: `rgba(0,0,0,.7)`, blur(4px)
  - 드래그 핸들(pill) 상단 중앙 표시
  - ESC 및 backdrop 클릭으로 닫기

  ### Bottom Navigation
  - height 64px, bg `rgba(14,14,16,.92)`, backdrop-filter blur(12px)
  - 탭: 홈 / 동행방 / 내방 / 프로필 (4개)
  - 비활성: `--cb-text-3`, 활성: `--cb-yellow`
  - 아이콘 23×23px, 라벨 10.5px/600
  - 현재 탭 아이콘에 미세한 scale-up 애니메이션

  ### AppBar
  - 좌: 뒤로가기(23px) 또는 로고
  - 중앙: 화면 제목 14px/600
  - 우: 액션 아이콘(들)
  - bg `rgba(14,14,16,.92)`, backdrop-filter blur(12px), sticky top-0

  ---

  ## 화면 목록 및 상세 구현 요구사항

  ### CB-01 — Login `/login`
  - 전체 화면 배경 그라디언트 (어두운 퍼플/차콜)
  - BuddyDuck 로고/워드마크 중앙 배치
  - 카카오 로그인 버튼 (아이콘 + "카카오로 시작하기")
  - 클릭 시 `/nickname`으로 이동 (mock)

  ### CB-02 — Nickname `/nickname`
  - AppBar: "닉네임 설정", 뒤로가기 없음
  - 안내 문구 + Input (placeholder: "닉네임 입력")
  - 글자 수 카운터 표시 (최대 10자)
  - 중복 확인 상태 표시 (사용 가능/불가)
  - "시작하기" Primary Button (입력 시 활성화)
  - 완료 시 `/home`으로 이동

  ### CB-03 — Home `/home`
  - AppBar: 로고 좌측, 알림 아이콘 우측
  - 검색바 (비활성 상태 — 클릭 불필요)
  - 트렌딩 태그 Chip 가로 스크롤 (3~5개)
  - 콘서트 피드 카드 목록:
    - 썸네일 72×72px, radius `--r-md`
    - 아티스트명, 공연명, 날짜/장소, 동행방 수 뱃지
    - bg `--cb-surface-1`, border `--cb-line`, radius `--r-lg`, shadow `--sh-card`
  - 카드 클릭 시 `/rooms`으로 이동
  - 최소 4개 mock 콘서트 데이터

  ### CB-04 — Room List `/rooms`
  - AppBar: "동행방" 타이틀, 필터 아이콘 우측
  - 검색바 + 태그 필터 Chip 가로 스크롤
  - 방 카드 목록:
    - 호스트 아바타/닉네임
    - 방 제목 (15px/700)
    - 태그 Chip 배지들
    - 정원(현재/최대), 콘서트 날짜, 잠금 여부 메타
  - 필터 아이콘 → CB-04′ 모달 열기
  - "방 만들기" FAB 버튼 (우하단, Primary, 원형)

  ### CB-04′ — Tag Modal `/rooms?modal=tags`
  - Bottom Sheet 모달
  - "태그 필터" 제목 + 닫기(X) 버튼
  - 태그 카테고리별 Chip 선택 (다중 선택)
  - "적용" Primary Button

  ### CB-05 — Create Room `/rooms/create`
  - AppBar: "방 만들기", 뒤로가기
  - FormField 목록: 방 제목, 콘서트 선택(드롭다운), 날짜, 정원(Stepper), 태그 선택, 소개글(textarea), 잠금 여부 Toggle
  - 하단 고정 "방 만들기" Primary Button
  - 완료 시 `/rooms/host`로 이동 (mock)

  ### CB-06 — My Rooms `/my-rooms`
  - AppBar: "내 방"
  - 탭: "개설한 방" / "참여한 방"
  - 각 탭에 RoomCard 목록
  - 빈 상태: 안내 문구 + "방 만들기" 버튼

  ### CB-07A — Room Detail Host `/rooms/host`
  - AppBar: 방 제목, 뒤로가기, 설정 아이콘
  - 콘서트 정보 카드 (아티스트, 날짜, 장소)
  - 멤버 목록 (호스트 표시, 승인 대기 행 포함)
  - 오픈채팅 버튼, 타임라인 버튼
  - "방 공유" Outline Button + "일정표 보기" Primary Button

  ### CB-07B — Room Detail Member `/rooms/member`
  - CB-07A와 유사하나 설정 아이콘 없음
  - 탈퇴 버튼 (danger 색상)

  ### CB-07C — Room Detail Pending `/rooms/pending`
  - "신청 대기 중" 상태 배너 (황색 배경, 안내 문구)
  - "신청 취소" Outline Button

  ### CB-07D — Room Detail Visitor `/rooms/visitor`
  - "동행 신청하기" Primary Button (하단 고정)
  - 클릭 시 CB-07D′ 모달 열기

  ### CB-07D′ — Apply Modal `/rooms/visitor?modal=apply`
  - Bottom Sheet
  - "동행 신청" 제목
  - 소개 메시지 textarea
  - "신청하기" Primary Button → 완료 시 CB-07C로 이동

  ### CB-08 — Open Chat `/open-chat`
  - AppBar: 방 이름, 뒤로가기, 멤버 아이콘
  - 채팅 메시지 목록 (날짜 구분선 포함)
  - 내 메시지(우측 yellow 말풍선) / 상대 메시지(좌측 surface-2)
  - 하단 고정 입력창 + 전송 버튼
  - mock 3~5개 대화 데이터

  ### CB-09 — Timeline `/timeline`
  - AppBar: "타임라인", 뒤로가기
  - 날짜별 세로 타임라인 레이아웃
  - TimelineBlock: 장소명, 체류 시간, 이동 시간 표시
  - "일정표 편집" 버튼 → `/timetable`

  ### CB-10 — Place Search `/places`
  - AppBar: "장소 검색", 뒤로가기
  - 검색바 (포커스 상태)
  - 검색 결과 목록 (장소명, 주소, 카테고리 아이콘)
  - 항목 선택 시 이전 화면으로 복귀

  ### CB-11 — Timetable Edit `/timetable`
  - AppBar: "일정표 편집", 뒤로가기, 저장 버튼
  - 정류장 목록 (드래그 정렬 handle 포함)
  - 각 정류장: 장소명, 체류 시간 Stepper, 이동 수단 선택
  - "+ 장소 추가" 버튼 → `/places`
  - 총 소요 시간 하단 표시
  - 초과 시 CB-11′ 모달 자동 표시

  ### CB-11′ — Over-Time Warning `/timetable?modal=warning`
  - Center 모달
  - 경고 아이콘 + "예상 시간 초과" 메시지
  - "계속 편집" / "저장" 버튼

  ### CB-12 — Map View `/map`
  - AppBar: "지도", 뒤로가기
  - Kakao Maps 로드 실패 시 MapFallback 컴포넌트 표시
  - 지도 위 정류장 마커(MapPin) 표시
  - 하단 MapPlaceCard: 선택 장소 이름, 주소, 체류 시간

  ### CB-13 — Memory Feed `/memories`
  - 사진 그리드(2열) 또는 카드 피드
  - 각 메모리: 썸네일, 날짜, 공연명
  - mock 6개 이상 이미지(placeholder) 데이터

  ### CB-14 — Profile `/profile`
  - AppBar: "프로필", 편집 아이콘 우측
  - 아바타(64px), 닉네임, 소개글
  - 참여 공연 수, 동행 수 통계
  - 태그 목록
  - "로그아웃" Outline Button (하단)

  ### CB-14′ — Profile Edit `/profile/edit`
  - AppBar: "프로필 편집", 뒤로가기, 저장
  - 아바타 변경 버튼
  - 닉네임 Input, 소개글 Textarea
  - 관심 태그 Chip 다중 선택
  - "저장" Primary Button

  ---

  ## Mock 데이터 요구사항 (`src/lib/data.ts`)

  다음 mock 데이터를 유지하거나 보완한다:

  ```ts
  // 콘서트 4개 이상
  concerts: { id, artist, title, date, venue, thumbnailUrl, roomCount }[]

  // 동행방 6개 이상 (host/member/pending/visitor 상태 각각 포함)
  rooms: { id, title, hostNickname, hostAvatar, tags, currentMembers, maxMembers, concertId, isLocked, status }[]

  // 멤버 목록
  members: { id, nickname, avatar, role: 'host'|'member'|'pending' }[]

  // 타임테이블 정류장
  timetableStops: { id, place, dwellMinutes, transitMinutes, mode: 'walk'|'transit'|'drive' }[]

  // 채팅 메시지
  chatMessages: { id, senderId, content, timestamp }[]

  // 추억 피드
  memories: { id, thumbnailUrl, date, concertTitle }[]

  // 프로필
  myProfile: { id, nickname, bio, avatar, tags, concertCount, buddyCount }[]

  ---
  MSW 핸들러 (src/mocks/handlers.ts)

  다음 API mock 핸들러를 구현한다:

  - GET /api/concerts → concerts 목록 반환
  - GET /api/rooms → rooms 목록 반환 (query: ?tag= 필터 지원)
  - POST /api/rooms → 새 방 생성 (201 응답)
  - POST /api/rooms/:id/apply → 동행 신청 (200 응답)
  - GET /api/profile → myProfile 반환
  - PATCH /api/profile → 프로필 업데이트

  ---
  인터랙션 요구사항

  1. 페이지 전환: Next.js App Router 클라이언트 내비게이션, 뒤로가기는 router.back()
  2. 모달: URL query state 기반 (?modal=tags 등), 브라우저 뒤로가기로 닫기 가능
  3. 폼 상태: react-hook-form + zod 검증, 실시간 에러 표시
  4. 로딩 상태: Skeleton UI (surface-2 배경 + shimmer 애니메이션)
  5. Chip 선택: 즉각적인 색상 전환 애니메이션 (transition 150ms)
  6. Button tap: active 상태 scale(0.97) 피드백
  7. Bottom Sheet 열기: slide-up 애니메이션 (200ms ease-out)
  8. 스크롤: 콘텐츠 영역은 자연 스크롤, Bottom Nav/AppBar는 sticky

  ---
  개발 컨벤션 (dev/AGENTS.md 기준)

  - 컴포넌트 위치: 공유 UI → src/components/ui.tsx, 화면별 → src/features/screens.tsx
  - 라우트: src/lib/routes.ts 기준 App Router 파일 경로 사용
  - shadcn/ui: new-york style, 필요한 primitive import
  - 타입: 모든 props에 TypeScript 타입 정의
  - 스타일링: Tailwind 클래스 우선, 필요 시 CSS 변수 직접 참조

  ---
  완료 기준

  다음 명령 모두 통과:
  cd dev
  npm run lint
  npm run typecheck
  npm test
  npm run build

  Playwright 체크리스트 (viewport 430×932):
  - [ ] CB-01: 카카오 버튼 → CB-02 이동
  - [ ] CB-02: 닉네임 입력 → 시작하기 → CB-03 이동
  - [ ] CB-03: 콘서트 카드 렌더링, 태그 칩 스크롤
  - [ ] CB-04: 방 목록 렌더링, 필터 아이콘 → CB-04′ 모달
  - [ ] CB-05: 폼 입력 검증, 방 만들기 완료
  - [ ] CB-07A~D: 각 상태별 UI 분기 확인
  - [ ] CB-07D′: 신청 모달 열기/닫기
  - [ ] CB-08: 채팅 렌더링, 메시지 전송 mock
  - [ ] CB-11: 정류장 추가, Stepper 작동
  - [ ] CB-11′: 초과 시간 경고 모달
  - [ ] CB-12: 지도 fallback 렌더링
  - [ ] CB-14′: 프로필 편집 저장
  - [ ] Bottom Nav: 4탭 전환, 활성 탭 yellow 강조
  - [ ] 모달: backdrop 클릭/ESC로 닫기
  - [ ] 앱 폭: 항상 430px 고정, phone frame 미표시
