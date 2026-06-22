# Worked example: CB-03 (Home) → `GET /api/concerts`

This is a real, already-verified precedent (lint/typecheck/test/build/e2e all green) for
what "connect screen X to its Notion-specified API" looks like end to end in this repo.
Use it to pattern-match file layout, naming, and the kind of decisions that come up —
not to copy values literally into an unrelated screen.

## What was being connected

Notion row `CONCERT-001` (`GET /api/concerts`, 사용 화면: "CB-03 Home") — list/search with
`keyword`, `region`, `from`, `to`, `page`, `size` query params, returning the standard
`{isSuccess, code, message, result}` envelope with `result: {items, page, size, hasNext}`.

`CONCERT-002` (`GET /api/concerts/{concertId}`, 사용 화면: "CB-03 Home, CB-04 Room List")
was deliberately **left unconnected** here — CB-03 only needs the list. CB-04 owns the
detail call when that screen gets wired up. This is the "exact match only" policy in
practice: a Notion row can list your code among several screens without meaning every
one of those screens should call it right now.

## 1. API client + hook — `dev/src/lib/api/concerts.ts`

```typescript
import { useInfiniteQuery } from "@tanstack/react-query";
import { addMonths, format } from "date-fns";
import { useEffect, useState } from "react";
import { http } from "@/lib/api/http";
import { mswReadyPromise } from "@/mocks/ready";

export type ConcertSummary = {
  id: number;
  title: string;
  venueName: string;
  startAt: string;
  endAt: string | null;
  lat: number;
  lng: number;
  source: string;
  posterUrl: string | null;
  area: string | null;
  genre: string | null;
  timeGuidance: string | null;
  openRoomCount: number;
};

export type ConcertListParams = {
  keyword?: string;
  region?: string;
  from?: string;
  to?: string;
  page: number;
  size: number;
};

export type ConcertListResult = {
  items: ConcertSummary[];
  page: number;
  size: number;
  hasNext: boolean;
};

type ApiEnvelope<T> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T;
};

const CONCERT_PAGE_SIZE = 10;

export async function fetchConcertList(
  params: ConcertListParams,
): Promise<ConcertListResult> {
  const response = await http.get<ApiEnvelope<ConcertListResult>>(
    "/api/concerts",
    { params },
  );
  return response.data.result;
}

export function useConcertListInfinite({
  keyword,
  region,
}: {
  keyword?: string;
  region?: string;
}) {
  // See "MSW registration race" below — do not delete this gate.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    mswReadyPromise.then(() => setReady(true));
  }, []);

  return useInfiniteQuery({
    queryKey: ["concerts", { keyword, region }],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchConcertList({
        keyword,
        region,
        from: format(new Date(), "yyyy-MM-dd"),
        to: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
        page: pageParam,
        size: CONCERT_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
    enabled: ready,
  });
}
```

Notes on _why_ it looks like this, not just what it looks like:

- The type fields are a 1:1 transcription of the Notion page's "Response" table
  (`result.*` rows), including nullability — don't invent or drop fields.
- `from`/`to`/`page`/`size` came from explicit user direction during the CB-03 build
  (1-month window, page size 10), not from the Notion spec itself, which only declares
  the param _names_. The spec tells you the contract; the product/paging behavior is
  still a product decision — ask if it isn't obvious from context.
- `useInfiniteQuery` vs `useQuery` is a UI decision (does this screen paginate?), not
  something Notion specifies either.

## 2. Route-local UI split — `dev/app/home/_components/`

Three files, one responsibility each, instead of one large screen component:

- `concert-search-bar.tsx` — controlled `<input>` only, no fetching logic.
- `concert-feed.tsx` — list rendering, loading skeleton, empty state, infinite-scroll
  sentinel (`useInfiniteScrollTrigger`). Owns nothing about _where_ the data comes from.
- `home-screen.tsx` — the orchestrator: debounces the search query, calls
  `useConcertListInfinite`, flattens `data.pages`, composes `AppBar` +
  `ConcertSearchBar` + `ConcertFeed`.

This mirrors the project convention in `dev/AGENTS.md` ("route screen components live
under `app/<route>/_components`") — check that file's "Components" section for the
current list before adding new ones, and add yours to it when done.

## 3. Shared component reuse — `dev/app/_components/buddy-patterns.tsx`

`ConcertCard` already existed (used by Home) and had to be retyped from a legacy mock
`Concert` shape to the real `ConcertSummary`. Before touching a shared component:

```bash
grep -rn "ConcertCard" dev/app --include="*.tsx" -l
```

Confirmed it had exactly one consumer (`home-screen.tsx`), so retyping it was safe. If a
shared component has multiple consumers and they need different shapes, don't force one
through — that's a sign that the real API connection belongs in a _new_ route-local
component instead, or that the consumers need their own typed wrapper.

One direct user correction worth repeating: **don't synthesize fake poster image files**
just because the type has `posterUrl: string`. When the real value can be `null`,
render the existing placeholder ("POSTER" text / default background) for that case —
manufacturing a fake `.svg` asset to avoid an empty state is worse than the empty state.

## 4. MSW mock parity — `dev/src/mocks/handlers.ts`

```typescript
http.get("*/api/concerts", ({ request }) => {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("keyword")?.toLowerCase() ?? "";
  const region = url.searchParams.get("region")?.toLowerCase() ?? "";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const page = Number(url.searchParams.get("page") ?? "0");
  const size = Number(url.searchParams.get("size") ?? "20");

  const filtered = concertFixtures
    .filter((concert) => !from || concert.startAt >= from)
    .filter((concert) => !to || concert.startAt <= `${to}T23:59:59+09:00`)
    .filter(
      (concert) =>
        !keyword ||
        concert.title.toLowerCase().includes(keyword) ||
        concert.venueName.toLowerCase().includes(keyword),
    )
    .filter(
      (concert) => !region || concert.venueName.toLowerCase().includes(region),
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  const start = page * size;
  const items = filtered.slice(start, start + size);
  const hasNext = start + size < filtered.length;

  return HttpResponse.json({
    isSuccess: true,
    code: "COMMON200",
    message: "요청에 성공했습니다.",
    result: { items, page, size, hasNext },
  });
});
```

The envelope shape (`isSuccess`/`code`/`message`/`result`) is copy-pasted from the
Notion page's "Example" JSON block under Response — that example is the ground truth
for what MSW should fake, field names and all.

## 5. The MSW registration race (read this before wiring any new on-mount query)

The first request a route fires on mount can leak past MSW and hit the real backend,
because `worker.start()` in `app/providers.tsx` is async and may not have registered
yet when React Query's first `queryFn` call happens. This was confirmed by instrumenting
a real browser session: the `GET /api/concerts` request fired _before_ the
`[MSW] Mocking enabled` console line appeared, and went straight to
`https://api.boostad.site`.

**The fix that works** — `dev/src/mocks/ready.ts`:

```typescript
let resolveReady: (() => void) | undefined;

export const mswReadyPromise: Promise<void> =
  process.env.NODE_ENV === "development"
    ? new Promise((resolve) => {
        resolveReady = resolve;
      })
    : Promise.resolve();

export function markMswReady() {
  resolveReady?.();
}
```

`app/providers.tsx` calls `markMswReady` once `worker.start()` settles. Any hook that
fires a query on mount during dev gates it with:

```typescript
const [ready, setReady] = useState(false);
useEffect(() => {
  mswReadyPromise.then(() => setReady(true));
}, []);
// ...
useQuery({ ..., enabled: ready });
```

**The fix that does NOT work, and broke 14 e2e tests when tried**: gating what
`<Providers>` renders (e.g. `if (!mocksReady) return null`) based on a value that's
computed differently on the server vs. the first client render. SSR has no `window`, so
it would compute one state; client hydration computes another; React's hydration
mismatch recovery then produced duplicate DOM nodes across unrelated routes ("strict
mode violation: resolved to 2 elements" failures with no relation to concerts at all).
The `useState(false)` + `useEffect(promise.then(...))` pattern above is hydration-safe
because the initial value is identical on server and client — only use _that_ shape for
this kind of gate, never a value that branches on `typeof window`.

## 6. Cross-screen query param care

Linking `ConcertCard` to `/rooms?concertId={id}` exposed a latent bug in
`dev/app/rooms/_components/room-list-screen.tsx`: its tag-edit modal hardcoded
`router.push("/rooms")` and `href="/rooms?modal=tags"`, silently dropping `concertId`
whenever the modal opened or closed. The fix was to read the existing param with
`useSearchParams` and rebuild both URLs to preserve it:

```typescript
const searchParams = useSearchParams();
const concertId = searchParams.get("concertId");
const roomsHref = concertId ? `/rooms?concertId=${concertId}` : "/rooms";
const tagModalHref = concertId
  ? `/rooms?concertId=${concertId}&modal=tags`
  : "/rooms?modal=tags";
```

General lesson: when a new query param starts flowing into a route that already has
its own query-param-driven modal/state, grep that route's screen component for
hardcoded `router.push("/...")` / `href="/..."` literals — they're the ones that will
silently strip your new param.

## 7. e2e and unit test fallout

- `e2e/buddyduck.spec.ts` — assertions on the old static fixture titles, the now-removed
  category chips, and the post-click navigation target (`/rooms` → `/rooms\?concertId=`)
  all needed updating.
- `app/_components/app-screens.test.tsx` had its own independent Home-screen tests that
  predated this work and referenced removed UI — required mocking `http.get` for the
  concerts envelope and `useSearchParams` (once `room-list-screen.tsx` started reading
  it) in the `next/navigation` mock, in addition to updating assertions.

Lesson: changing a shared screen's data source almost always touches at least one other
spec file's assertions that aren't obviously related at a glance — search broadly for
old fixture titles / old route patterns before declaring done.

## 8. Verification (all required, all ran from `dev/`)

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright test
```

All five passed before this was considered complete. `npx playwright test` runs the
_whole_ suite, not just the spec(s) touched — the `concertId` regression above was only
caught because of a full-suite run, not a scoped one.

## 9. Follow-up: removing the mock once the connection was confirmed

This step happened in a **later** session, after the build above had already shipped
with the mock from §4 still in place alongside the real `http` call. The user noticed
`endAt`/`posterUrl`/`timeGuidance` were always `null` — traced to the MSW mock
intercepting every request in dev/e2e regardless of the real backend's actual response
— and asked for the mock to be deleted outright, since the endpoint was already
connected to the real BE and didn't need fixture data shadowing it.

**What was deleted** from `dev/src/mocks/handlers.ts`: the entire `http.get("*/api/concerts", ...)`
handler from §4, plus the `date-fns` import it used, the `ConcertSummary` type import,
the `isoAt()` helper, the `concertSeeds` array, and the `concertFixtures` mapping — all
of it existed only to feed that one handler. `/api/rooms` and `/api/profile` mocks were
explicitly kept (they're not BE-connected via the `http` client — `src/lib/api.ts`'s
legacy hooks still use bare `fetch` against MSW-only paths).

**e2e fallout**: the test suite asserted on the mock's fixture title "AURORA LIVE" in
four places. Real production data doesn't have that title (KOPIS data changes over
time), so every assertion was rewritten from title-text matching to a structural
locator based on `ConcertCard`'s stable href pattern:

```typescript
// before
await expect(page.getByText("AURORA LIVE")).toBeVisible();
await page.getByRole("link", { name: /AURORA LIVE/ }).click();

// after
const concertCards = page.locator('a[href^="/rooms?concertId="]');
await expect(concertCards.first()).toBeVisible();
await concertCards.first().click();
```

This is the general fix for any mock removal: search for assertions tied to the
fixture's specific content and switch them to assert on structure/behavior that holds
regardless of what the real backend happens to return that day.

**Deeper root cause found during this pass**: even after the title fix, zero concerts
rendered locally. Root-caused via comparative `curl` (with vs. without an `Origin`
header) and live Playwright MCP browser inspection to a **CORS rejection** — the real
backend (`https://api.boostad.site`) returns HTTP 403 for requests carrying
`Origin: http://localhost:3000`, but 200 for the identical request with no `Origin`
header. This had been invisible before, because the mock was intercepting the request
in the browser before it ever reached the network.

This is a backend-side CORS allow-list gap, not something fixable from FE code without
adding a server-side proxy (a bigger architectural change). Per this skill's guidance —
don't reintroduce the mock to paper over a real connectivity problem — the resolution
was to surface the finding and let the user escalate a BE allow-list fix, rather than
attempting an FE workaround.

**Docs updated**: `dev/AGENTS.md`'s "Mock/API Boundary" section, removing
`/api/concerts` from the list of MSW-owned paths and adding a sentence stating it has no
mock and always goes through `NEXT_PUBLIC_API_BASE_URL`.
