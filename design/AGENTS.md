# Design System — BuddyDuck

Hi-Fi 디자인 파일: `design/Concert Buddy - Hi-Fi UI.html`
화면 범위: CB-01 ~ CB-14′ (총 21개 화면)

---

## 디바이스 / 뷰포트

| 항목        | 값                            |
| ----------- | ----------------------------- |
| 프레임 크기 | 375 × 812 px (iPhone SE 기준) |
| 테마        | 다크 모드 전용                |

---

## 색상 토큰 (CSS 변수)

### Surface

| 변수             | 값        | 용도                    |
| ---------------- | --------- | ----------------------- |
| `--cb-stage`     | `#070708` | 디바이스 뒤 캔버스 배경 |
| `--cb-bg`        | `#0E0E10` | 앱 기본 배경            |
| `--cb-surface-1` | `#161618` | 카드 (elevated)         |
| `--cb-surface-2` | `#1E1E22` | 인풋 / 보조 카드        |
| `--cb-surface-3` | `#27272C` | 칩 / hover / 아바타     |

### 선(Border)

| 변수          | 값                      |
| ------------- | ----------------------- |
| `--cb-line`   | `rgba(255,255,255,.07)` |
| `--cb-line-2` | `rgba(255,255,255,.13)` |

### 브랜드 (Yellow)

| 변수               | 값                     | 용도                     |
| ------------------ | ---------------------- | ------------------------ |
| `--cb-yellow`      | `#FDBE0D`              | 주 강조색, CTA 배경      |
| `--cb-yellow-2`    | `#FFD23F`              | 호버 상태                |
| `--cb-yellow-dim`  | `rgba(253,190,13,.13)` | 아이콘 배경 등 연한 강조 |
| `--cb-yellow-line` | `rgba(253,190,13,.40)` | 강조 보더                |
| `--cb-on-yellow`   | `#1C1A12`              | yellow 배경 위 텍스트    |

### 텍스트

| 변수          | 값        | 용도                  |
| ------------- | --------- | --------------------- |
| `--cb-text`   | `#FDFCFD` | 기본 텍스트           |
| `--cb-text-2` | `#A6A6AD` | 보조 텍스트           |
| `--cb-text-3` | `#6C6C74` | 비활성 / 플레이스홀더 |

### 기타

| 변수          | 값        |
| ------------- | --------- |
| `--cb-danger` | `#FF6B5B` |

---

## 타이포그래피

### 폰트 패밀리

```css
--font:
  -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard",
  "Noto Sans KR", "Helvetica Neue", Helvetica, Arial, sans-serif;
--mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
```

### 주요 사이즈

| 용도        | 크기                   | 굵기    |
| ----------- | ---------------------- | ------- |
| 대형 타이틀 | 21px                   | 700     |
| 카드 제목   | 15px                   | 700     |
| 앱바 타이틀 | 14px                   | 600     |
| 섹션 라벨   | 13px                   | 600     |
| 칩 / 보조   | 12–12.5px              | 500–600 |
| 메타 / 캡션 | 10.5–11.5px            | 400–700 |
| CTA 버튼    | 15px (보조 액션: 14px) | 700     |

### 줄간격

기본 `1.5`, 본문 `1.55`, 긴 설명 `1.6`

---

## 간격 / 사이징

- 화면 수평 패딩: **16px**
- 카드 내부 패딩: **14px / 12px 16px**
- 컴포넌트 간격(gap): 6–16px (주로 **8px**, **12px**)
- 아이콘 기본 크기: **20 × 20px** (앱바 back button: 23px)

---

## 모서리 반경 (Radius)

| 변수       | 값                           |
| ---------- | ---------------------------- |
| `--r-xs`   | 6px                          |
| `--r-sm`   | 10px                         |
| `--r-md`   | 14px — 인풋, 버튼, 카드 내부 |
| `--r-lg`   | 18px — 카드                  |
| `--r-xl`   | 24px — 모달                  |
| `--r-pill` | 999px — 칩, 태그, 배지       |

---

## 그림자

| 변수        | 값                                                                     |
| ----------- | ---------------------------------------------------------------------- |
| `--sh-card` | `0 1px 0 rgba(255,255,255,.03) inset, 0 8px 24px -12px rgba(0,0,0,.7)` |
| `--sh-pop`  | `0 24px 60px -20px rgba(0,0,0,.85)`                                    |
| `--sh-glow` | `0 6px 22px -6px rgba(253,190,13,.45)` — yellow CTA 전용               |

---

## 핵심 컴포넌트

### Button

- **Primary**: `background: --cb-yellow`, 텍스트 `--cb-on-yellow`, `--sh-glow`
- **Outline**: `background: --cb-surface-2`, 텍스트 white, border `--cb-line-2`
- **Disabled**: `background: --cb-surface-2`, 텍스트 `--cb-text-3`
- **카카오**: `background: #FEE500`, 텍스트 `#191600`
- 높이: 54px (보조 액션: 50px), radius `--r-md`, font-weight 700

### Chip (필터/태그 선택)

- 높이 34px, radius `--r-pill`
- 비활성: `background: --cb-surface-2`, 텍스트 `--cb-text-2`
- 활성: `background: --cb-yellow`, 텍스트 `--cb-on-yellow`, font-weight 700

### Input

- 최소 높이 48px (textarea: 74px), radius `--r-md`
- `background: --cb-surface-2`, border `--cb-line`
- 플레이스홀더 색상 `--cb-text-3`

### Modal

- 위치: 화면 하단 (left/right 14px, bottom 14px) 또는 center (transform)
- radius `--r-xl`, `background: --cb-surface-1`, border `--cb-line-2`, `--sh-pop`

### Toast

- 위치: 하단 내비게이션 위 (`left/right 16px`, `bottom 76px`)
- 다른 컴포넌트 레이아웃을 밀지 않는 viewport 기준 오버레이
- 등장 후 약 1초 유지, fade-in/fade-out으로 사라짐

### Bottom Navigation

- 높이 64px, `background: rgba(14,14,16,.92)`, `backdrop-filter: blur(12px)`
- 탭 4개, 비활성 `--cb-text-3`, 활성 `--cb-yellow`
- 아이콘 23 × 23px, 라벨 10.5px / font-weight 600

### Concert Card (CB-03)

- `background: --cb-surface-1`, border `--cb-line`, radius `--r-lg`, `--sh-card`
- 썸네일 72 × 72px, radius `--r-md`

### Room Card (CB-04)

- 구조: top(호스트) → 제목 → footer(메타 정보)
- `background: --cb-surface-1`, radius `--r-lg`, `--sh-card`

---

## 화면 목록

| ID      | 이름                  | 비고                      |
| ------- | --------------------- | ------------------------- |
| CB-01   | Login                 | 카카오 로그인             |
| CB-02   | Nickname              | 닉네임·연령대·성별 필수   |
| CB-03   | Home                  | 콘서트 피드 + 카테고리 필터 |
| CB-04   | Room List             | 동행 방 목록              |
| CB-04′  | Tag Modal             | 태그 필터 모달            |
| CB-05   | Create Room           | 방 개설                   |
| CB-06   | My Rooms              | 내 방 목록                |
| CB-07A  | Room Detail — Host    | 호스트 뷰                 |
| CB-07B  | Room Detail — Member  | 멤버 뷰                   |
| CB-07C  | Room Detail — Pending | 신청 대기 뷰              |
| CB-07D  | Room Detail — Visitor | 비로그인/방문자 뷰        |
| CB-07D′ | Apply Modal           | 동행 신청 모달            |
| CB-08   | Open Chat             | 오픈채팅                  |
| CB-09   | Timeline              | 타임라인                  |
| CB-10   | Place Search          | 장소 검색                 |
| CB-11   | Timetable Edit        | 일정표 편집               |
| CB-11′  | Over-Time Warning     | 초과 시간 경고 모달       |
| CB-12   | Map View              | 지도 (read-only)          |
| CB-13   | Memory Feed           | 추억 피드                 |
| CB-14   | Profile               | 프로필                    |
| CB-14′  | Profile Edit          | 프로필 편집               |

---

## 업데이트 규칙

- 색상 토큰 추가/변경 → **색상 토큰** 섹션 수정
- 신규 컴포넌트 추가 → **핵심 컴포넌트** 섹션에 스펙 추가
- 화면 추가/삭제 → **화면 목록** 업데이트
