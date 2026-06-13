# BuddyDuck — 개발 스택

## 프레임워크 / 런타임

| 분류        | 기술                 |
| ----------- | -------------------- |
| 프레임워크  | Next.js (App Router) |
| 언어        | TypeScript           |
| 런타임 환경 | Node.js              |

## UI / 스타일링

| 분류             | 기술                                           |
| ---------------- | ---------------------------------------------- |
| CSS 유틸리티     | Tailwind CSS                                   |
| 컴포넌트 기반    | Radix UI (Avatar, Dialog, Select, Tabs 등)     |
| 컴포넌트 설치 툴 | shadcn/ui (`components.json`)                  |
| 아이콘           | Lucide React                                   |
| 클래스 유틸      | clsx, tailwind-merge, class-variance-authority |

## 상태 관리 / 데이터

| 분류            | 기술                                |
| --------------- | ----------------------------------- |
| 서버 상태       | TanStack React Query                |
| 클라이언트 상태 | Zustand                             |
| 폼              | React Hook Form + Zod (유효성 검사) |
| 날짜 처리       | date-fns                            |

## API 목킹

| 분류        | 기술                             |
| ----------- | -------------------------------- |
| Mock 서버   | MSW (Mock Service Worker)        |
| Mock 데이터 | `dev/src/lib/data.ts` (하드코딩) |
| Mock 핸들러 | `dev/src/mocks/handlers.ts`      |

## 테스트

| 분류             | 기술                             |
| ---------------- | -------------------------------- |
| 유닛/통합 테스트 | Vitest + Testing Library + jsdom |
| E2E 테스트       | Playwright                       |

## 코드 품질

| 분류      | 기술                                           |
| --------- | ---------------------------------------------- |
| 린터      | ESLint (eslint-config-next, typescript-eslint) |
| 타입 체크 | tsc --noEmit                                   |

## 외부 서비스

| 분류 | 기술                                         |
| ---- | -------------------------------------------- |
| 지도 | Kakao Maps API (`NEXT_PUBLIC_KAKAO_MAP_KEY`) |
