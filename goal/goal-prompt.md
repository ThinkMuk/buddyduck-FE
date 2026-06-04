/goal "`dev/`에 npm 기반 Next.js App Router 프로젝트를 만들고, `design/Buddy Duck - Hi-Fi UI.html`과 `design/AGENTS.md`를 기준으로 Buddy Duck의 CB-01 ~ CB-14′ 총 21개 화면을 API 연결 전 정적/목데이터 기반으로 구현한다.

작업 범위:
- `dev/` 안에 Next.js + React + TypeScript + Tailwind CSS 앱을 생성한다.
- TanStack Query v5, Zustand, MSW, react-hook-form, zod, @hookform/resolvers, lucide-react, clsx, tailwind-merge, class-variance-authority, date-fns를 사용한다.
- Kakao Maps는 실제 API key 없이도 동작하는 loader와 fallback UI를 먼저 구현하고, 환경변수 연결 지점을 마련한다.
- `design/AGENTS.md`의 색상, 타이포그래피, 간격, radius, shadow, 컴포넌트 규칙을 Tailwind/global CSS와 공통 컴포넌트에 반영한다.
- 모바일 기준 375 x 812px 다크 모드 앱 프레임을 우선 구현한다.
- Button, Chip, Input, Modal, BottomNav, Card류 공통 컴포넌트를 만든다.
- mock domain data와 MSW handlers를 만들고, 이후 API 교체가 쉽도록 query/mutation 경계를 둔다.
- CB-01 Login, CB-02 Nickname, CB-03 Home, CB-04 Room List, CB-04′ Tag Modal, CB-05 Create Room, CB-06 My Rooms, CB-07A Host, CB-07B Member, CB-07C Pending, CB-07D Visitor, CB-07D′ Apply Modal, CB-08 Open Chat, CB-09 Timeline, CB-10 Place Search, CB-11 Timetable Edit, CB-11′ Over-Time Warning, CB-12 Map View, CB-13 Memory Feed, CB-14 Profile, CB-14′ Profile Edit 화면을 모두 접근 가능하게 구현한다.
- 주요 버튼, 탭, 모달, 폼 상태, 일정/지도 fallback 상호작용을 최소 동작하게 만든다.
- 새 컴포넌트를 만들면 `dev/AGENTS.md`에 목록과 용도를 추가한다.
- 디자인 스펙을 변경해야 하는 경우에만 `design/AGENTS.md` 및 `design/CLAUDE.md`에 업데이트한다.

작업 순서:
1. foundation: 프로젝트 스캐폴딩, 패키지 설치, Tailwind/global CSS, 앱 shell, 모바일 프레임
2. shared components: 공통 UI 컴포넌트, mock data, MSW, query/store 유틸
3. screens: 21개 화면 라우팅과 화면별 상태/상호작용 구현
4. verification: lint, typecheck, test, Playwright 또는 브라우저 스크린샷으로 주요 화면 검증

검증 기준:
- 21개 화면이 라우트 또는 모달 상태로 모두 확인 가능해야 한다.
- `npm run lint`, `npm run typecheck`, `npm test`를 실행하고 결과를 보고한다.
- 가능하면 375px 모바일 기준으로 로그인, 홈, 방 목록, 방 상세 4종, 일정 편집, 지도, 프로필 화면을 브라우저에서 확인한다.
- 실행할 수 없는 검증이 있으면 이유와 남은 리스크를 명확히 남긴다.

중요:
- 구현은 `dev/` 안에서만 진행한다.
- 패키지 매니저는 npm을 사용한다.
- 1차 목표는 백엔드 완전 연동이 아니라 API 연결 가능한 프론트엔드 골격과 Hi-Fi 화면 재현이다.
- 기존 사용자 변경사항은 되돌리지 않는다.
- 비자명한 선택지가 생기면 간단한 선택지와 tradeoff를 먼저 설명한다."