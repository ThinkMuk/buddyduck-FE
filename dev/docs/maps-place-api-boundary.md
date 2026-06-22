# 지도 · 장소 API 경계 — Kakao SDK vs 백엔드 Place/Map API

> connect-api 스킬로 지도/장소가 얽힌 화면(CB-09, CB-10, CB-11, CB-12 등)을 붙일 때
> "SDK를 직접 쓸지 / 백엔드 Place·Map API를 쓸지"를 판단하기 위한 기준 문서.
> (CB-05 집합장소 picker는 이미 이 기준에 따라 SDK 직접 방식으로 구현됨.)

## 핵심 원칙: "레이어"로 나눠라

지도 관련 작업은 항상 두 층이 섞여 있다. 이 둘은 **경쟁 관계가 아니라 보완 관계**다.

1. **렌더링 (지도를 화면에 그리는 것)** — 타일 표시, 마커, 폴리라인, 클릭/드래그 이벤트.
   - **항상 Kakao Maps JS SDK가 필요하다.** 백엔드 API로는 절대 대체 불가.
   - 따라서 어떤 화면이든 지도를 실제로 보여준다면 SDK와 JS 앱키(`NEXT_PUBLIC_KAKAO_MAP_APP_KEY`)는 남는다.
2. **데이터 (좌표·장소 정보를 얻거나 저장하는 것)** — 검색, 지오코딩, 일정 장소 저장, 방의 핀/경로 조회.
   - 여기가 판단이 갈리는 지점이고, **데이터 소유권**으로 결정한다(아래 표).

## 판단 표

| 데이터 성격 | 올바른 방법 | 이유 |
|---|---|---|
| 공유·저장되는 방 데이터 (일정 핀, 경로선, 저장된 장소) | **백엔드** (MAP-001 / PLACE-003, 조회는 PLACE/MAP) | SDK는 "우리 방의 일정"을 모름. 서버에만 존재하는 데이터 |
| 일회성·사용자 로컬 조회 (새 장소를 즉석에서 검색/클릭해 고르는 중, 아직 미저장) | SDK 직접 OK (또는 서버 쿼터·컨텍스트가 필요하면 PLACE-001/002) | 아직 영속화되지 않은 ephemeral lookup |

한 줄 규칙: **화면에 그리는 건 SDK, 서버에 저장/공유되는 데이터는 백엔드 API.**

## 관련 백엔드 명세 (BuddyDuck API 명세 DB)

| ID | 기능 | URL | 방향/성격 | 사용 화면(명세) |
|---|---|---|---|---|
| PLACE-001 | 장소명 검색 | `GET /api/places/search` (keyword, concertId, roomId) | 키워드 → 장소목록 | CB-10 / CB-11 |
| PLACE-002 | 주소 좌표 변환 | `GET /api/places/geocode` (address) | **주소 → 좌표 (forward)** | CB-10 / CB-11 |
| PLACE-003 | 일정용 장소 upsert | `POST /api/places` | 선택 결과 저장 | CB-10 / CB-11 |
| MAP-001 | 지도 표시용 일정 조회 | `GET /api/rooms/{roomId}/map` (roomId) | 핀/경로 조회 | CB-12 |

> 주의: 위 4개는 명세상 `구현 완료`지만 `FE 연결`은 전부 미체크 상태였다. 실제 응답
> 스키마는 connect-api step 4대로 각 Notion 페이지의 Response 표 + Example JSON으로 검증할 것.

### SDK에만 있고 백엔드엔 없는 기능 (대체 불가)

- **역지오코딩 (좌표 → 주소, `coord2Address`)**: 지도 클릭으로 위치를 고를 때 필요.
  PLACE-002는 `address`를 받는 **forward geocoding(주소→좌표)**이라 방향이 반대다.
  지도 클릭-선택 UX가 필요하면 이 부분은 SDK를 써야 한다.

## 화면별 적용 가이드

- **CB-05 (집합장소 picker, `/rooms/create`)** — 이미 SDK 직접 방식.
  방 생성 시점엔 roomId도 없고, 아직 저장 전 일회성 선택이라 SDK가 맞다.
  지도 렌더링 + 키워드 검색(`keywordSearch`) + 클릭 역지오코딩(`coord2Address`)을 SDK로 처리하고,
  최종 선택된 `RoomPlace`만 `POST /api/rooms`(ROOM-002) 바디에 실어 보낸다.
- **CB-09 (Timeline, `/timeline`)** — 맵 프리뷰의 핀/경로는 **방의 저장된 일정**이다.
  → **데이터는 MAP-001로 받아오고, 렌더링만 SDK로** 한다. ("SDK 대신 MAP-001"이 아니라 **둘 다** 필요.)
  > 실제 연결됨(2026-06 기준): 타임라인 **일정 리스트**는 SCHEDULE-001
  > (`GET /api/rooms/{roomId}/timeline`)로, **맵 프리뷰 핀/경로**는 MAP-001
  > (`GET /api/rooms/{roomId}/map`)로 받아오고 렌더링은 Kakao SDK(`RouteMapCanvas`)로 한다
  > — 둘 다 `src/lib/api/timeline.ts`. SCHEDULE-001 응답엔 좌표가 없어 핀 좌표는 MAP-001의
  > 슬롯 lat/lng + mapBounds로 그린다. MAP-001 명세상 사용 화면은 CB-12지만 이 경계 문서 기준에
  > 따라 CB-09도 동일 맵 데이터를 사용한다. (주의: MAP-001 슬롯의 좌표 필드는 명세 미정의라
  > 추론값이며 실제 세션에서 런타임 확인 필요.)
- **CB-10 (Place Search, `/places`)** — 검색 결과가 방 일정으로 **영속화**되어야 한다.
  → **PLACE-001(검색) + PLACE-003(upsert)** 사용. 지도 미리보기가 있다면 렌더링은 SDK.
  > 실제 연결됨(2026-06 기준): 키워드 검색은 PLACE-001(`GET /api/places/search`), 주소→좌표는
  > PLACE-002(`GET /api/places/geocode`), 선택 결과 upsert는 PLACE-003(`POST /api/places`)로
  > 연결됨 — 전부 `src/lib/api/places.ts`, Bearer-gated, MSW mock 없음. CB-11 "장소 추가"에서
  > `/places?roomId=`로 진입하고, upsert 후 선택 장소를 sessionStorage(`cb11:pendingPlace:{roomId}`)에
  > 적어두고 깨끗한 `/timetable?roomId=`로 돌아간다. CB-11은 부트스트랩 시 이를 읽어 draft에 슬롯을
  > 삽입하고 SCHEDULE-002로 재계산한다(편집 중 draft는 `cb11:draft:{scheduleId}`로 라운드트립 동안
  > 보존). URL 파라미터 대신 sessionStorage를 쓰는 이유: `?addPlaceId=` 같은 파라미터를 `router.replace`로
  > 떼어내면 async 페이지가 재렌더·재마운트되어 삽입한 draft가 서버 draft로 덮여 사라지기 때문.
  > 지도 미리보기는 아직 없음. 구 fixture(`places`)+Zustand 흐름은 제거됨.
- **CB-11 / CB-11′ (Timetable Edit, `/timetable`)** — 일정 장소를 다루므로 CB-10과 동일하게
  PLACE-001/002/003을 사용. 표시는 SDK.
  > 실제 연결됨(2026-06 기준): 일정 편집/저장은 SCHEDULE-002(recalculate)·SCHEDULE-004(recommend)·
  > SCHEDULE-003(commit)로 연결됨(`src/lib/api/schedule-draft.ts`). 편집할 draft와 scheduleId는
  > SCHEDULE-001(`?roomId=`)로 부트스트랩한다. **PLACE-001/002/003(화면 내 장소 검색/지오코딩/upsert)은
  > CB-10로 연기**되어 아직 미연결 — 장소 추가 버튼은 그대로 `/places`(CB-10, store 기반)로 링크한다.
- **CB-12 (Map View, `/map`)** — 방의 핀/경로를 보여주는 화면.
  → **데이터는 MAP-001, 렌더링은 SDK.**

## 보안 메모

JS 앱키는 지도 렌더링을 위해 어차피 클라이언트에 노출된다. 검색/지오코딩을 백엔드로 옮겨도
이 노출 자체는 사라지지 않으므로, Kakao 개발자 콘솔에서 **허용 도메인(웹 플랫폼) 등록**으로
키 사용을 제한하는 것이 실질적인 방어책이다. 백엔드 경유의 이점은 키 은닉보다는
**서버측 쿼터 관리 + concert/room 컨텍스트 부착 + 결과의 영속화**에 있다.
