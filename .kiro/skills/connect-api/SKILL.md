---
name: connect-api
description: Wires a BuddyDuck FE screen (e.g. /home, /rooms, /timetable) to its real backend API by looking up the matching spec(s) in the "BuddyDuck API 명세" Notion database under 클라우드 컴퓨팅 프로젝트, then implementing the connection following this repo's established conventions (typed API client + TanStack Query hook, route-local component split, MSW mock parity, e2e/unit test updates, doc updates, full verification). Always use this skill whenever the user gives a route path together with a CB-xx wireframe code (e.g. "/home CB-03", "CB-04 /rooms 연결해줘", "rooms 화면 API 붙여줘 CB-07A"), even if they don't say "API" or "connect" explicitly — that route+code pairing is the trigger. Also use it for "다음 화면 API 연결", "이 화면 백엔드 붙이기", or similar requests once a screen and its wireframe code are both identifiable from the conversation. Supports multiple comma-separated wireframe codes for one route (e.g. "/home CB-03,CB-04") to connect several specs at once.
argument-hint: "<route> <CB-code>[,<CB-code>...]"
---

# Connect a BuddyDuck screen to its API

This skill takes a route path and a wireframe code (e.g. `/home` + `CB-03`), finds the
backend API spec(s) tagged for that screen in Notion, and wires the screen to them the
same way CB-03 (Home → `GET /api/concerts`) was done — see
`references/concerts-example.md` for that full worked precedent, including two real
pitfalls that cost a re-debug cycle (an MSW registration race, and a query-param-drop
regression on an unrelated screen). Read it before implementing; it'll save you from
repeating both.

## 0. Kiro tool mapping (this skill was ported from Claude Code)

The original skill referenced Claude Code's Notion MCP tool names. In Kiro, use these
equivalents:

| Original (Claude Code)                    | Kiro Notion MCP tool                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `notion-search`                           | `API-post-search` (search by title; `filter.value: "data_source"` to find the database)        |
| `notion-fetch` (a page)                   | `API-retrieve-a-page` + `API-retrieve-page-markdown` (page content/tables)                     |
| `notion-fetch` (a database / data source) | `API-retrieve-a-database` / `API-retrieve-a-data-source`                                       |
| `notion-query-data-sources`               | `API-query-data-source` (filter by the `사용 화면` property)                                   |
| `AskUserQuestion`                         | Kiro has no structured-question tool — ask the user directly in chat (in English, per step 5). |

Kiro's `API-post-search` matches against page/database **titles**, not full-text
semantic ranking, and does not take a `data_source_url` scope. So the practical lookup
flow in Kiro is: resolve the "BuddyDuck API 명세" data source id once via
`API-post-search` (or the hardcoded id in step 2), then prefer `API-query-data-source`
with a filter on the `사용 화면` property to find rows for a given CB code. If
`API-query-data-source` is unavailable (plan/permission), fall back to
`API-post-search` and treat its hits as candidates to verify in step 3.

## 1. Parse the invocation

Expect two tokens, in either order: a route path starting with `/` (e.g. `/home`,
`/rooms`, `/timetable`) and one or more wireframe codes, comma-separated with no
required spacing (e.g. `CB-03`, `CB-03,CB-04`, `CB-03, CB-07A`). Each code matches
`CB-\d+` with an optional trailing letter or prime, e.g. `CB-03`, `CB-07A`, `CB-04′`
(the prime mark may also be typed as a plain apostrophe `'`).

If either the route or every code is missing or ambiguous, ask the user directly —
don't guess. Confirm the route actually exists
(`dev/app/<route-without-leading-slash>/page.tsx`) before going further; if it doesn't,
say so and ask which screen they meant.

When multiple codes are given, run steps 2–4 independently for **each** code — they're
just separate screens/wireframes being connected to the same route in one pass, not a
single combined query. Keep track of which matched API row(s) came from which code, so
step 5's plan can attribute each connection correctly (this matters for the exact-match
scoping decision in step 3 — a row matching `CB-04` doesn't automatically apply to
`CB-03` just because both were given in the same invocation). Dedupe rows that
genuinely match more than one of the given codes — implement them once, not per-code.

## 2. Find candidate API specs in Notion

The target database is **"BuddyDuck API 명세"**, located directly under the
**"클라우드 컴퓨팅 프로젝트"** page (Notion path: 클라우드 컴퓨팅 프로젝트 → BuddyDuck API 명세). As of this skill's writing, its data source id is
`1a8a77ff-d67f-833c-ba6b-873587b2e669`.

Try that id directly first with `API-query-data-source` (filter on the
`사용 화면` property containing the code). If it 404s or the workspace has moved on,
re-find it: `API-post-search` for `"BuddyDuck API 명세"` with `filter.value:
"data_source"`, then `API-retrieve-a-data-source` on the result to confirm the id —
don't assume the hardcoded id above is permanent.

If `API-query-data-source` is not available (the original Claude workspace lacked the
Notion AI Enterprise plan, which blocked deterministic listing there), fall back to
`API-post-search`:

```
API-post-search({
  query: "<the wireframe code, e.g. CB-03>",
  page_size: 25
})
```

Title search is **not** an exact property filter — it ranks by title relevance, so it
will return rows that have nothing to do with your code mixed in with the ones that do.
Treat every result as a _candidate_, never as a confirmed match.

## 3. Verify each candidate with an exact match

For every candidate from step 2, `API-retrieve-a-page` the full page (and
`API-retrieve-page-markdown` for its content tables) and read its `사용 화면` property
literally. This field is a comma-separated list, e.g.:

```
"사용 화면": "CB-04 Room List, CB-04′ Tag Modal"
```

For each comma-separated segment, take the leading token up to the first space (e.g.
`CB-04`, `CB-04′`) and compare it **exactly** against the code you were given.

The policy here is exact-match-only, deliberately: a row whose `사용 화면` lists your
code alongside a sibling screen (e.g. `CONCERT-002` lists both `CB-03 Home` and
`CB-04 Room List`) does not mean both screens should call it — it means both screens
_can_. Whether a given screen _should_ call a particular endpoint right now is a scope
decision (see `references/concerts-example.md` §"What was being connected" for exactly
this situation with CB-03 vs. CB-04). If the user wants the sibling-screen behavior
too, they'll ask for it by invoking that code separately — don't auto-expand `CB-04` to
also pull in `CB-04′`'s endpoints.

If zero rows survive this exact-match filter, don't conclude there's nothing to connect
purely on search's say-so — try a second query (the screen's English name from
`app/_lib/routes.ts` if it has one, or a near-neighbor code) before telling the user
nothing was found.

## 4. Read each matched spec's full content

For every row that survives the exact match, the page content (not just the database
properties) has the actual contract, structured as:

- **협업 참고** — a plain-language summary of which screen(s) it's for and any FE-facing
  caveats (e.g. "openChat은 포함하지 않음").
- **Request** — Header / Query parameter / Path Variable / Request Body tables, each
  with key, type, required, and example.
- **Response** — a field-by-field table (`result.*` paths with type and nullability)
  plus an **Example** block with literal success/error JSON.
- **Status** — status codes and what triggers them.

The Response table + Example JSON is the ground truth for the TypeScript types you'll
write and the shape MSW needs to fake — transcribe it field-for-field, including which
fields are nullable. Don't invent fields that aren't in the table, and don't drop ones
that are.

## 5. Propose a plan and wait for go-ahead

Before writing any code, summarize for the user:

- Which API row(s) matched, grouped by which wireframe code surfaced them if more than
  one code was given (`userDefined:ID`, Method + URL, `기능` title, `구현 완료` status —
  flag clearly if BE hasn't shipped it yet), and which related rows you found but are
  intentionally _not_ connecting (and why, per the exact-match scoping above).
- A short file-level plan: which new/modified files under `dev/`, following the
  conventions in step 6.

Then wait for confirmation before touching code. This mirrors the user's global
preference to see a plan before non-trivial multi-file work, and it's the checkpoint
that catches a wrong search match before it turns into a diff.

If anything about scope is genuinely ambiguous and not resolvable from the Notion spec,
the existing code, or conversation context — page size, date ranges, which of several
matched endpoints to wire up first, whether to touch a shared component with multiple
consumers — ask the user directly in chat rather than guessing. (Phrase these scope
questions and their options in English, even though the rest of the conversation may be
in Korean.)

## 6. Implement, following established conventions

These conventions live in `dev/AGENTS.md` (note: `dev/CLAUDE.md` is a symlink to it —
editing it directly will fail with "Refusing to write through symlink"; edit
`dev/AGENTS.md`). Read its current "Components", "Mock/API Boundary", and "Screen
Routing" sections before adding anything — they're the authoritative, currently-accurate
list, more so than this skill's prose.

The general recipe, with the CB-03 precedent in `references/concerts-example.md`
showing each piece concretely:

1. **API client + hook** — `dev/src/lib/api/<domain>.ts`. Types transcribed from the
   Notion Response table. One `fetch<X>` function unwrapping the `{isSuccess, code,
message, result}` envelope, plus a TanStack Query hook (`useQuery` or
   `useInfiniteQuery`, whichever the screen's UI actually needs — that's a UI decision,
   not something Notion specifies).
2. **Route-local UI** — `dev/app/<route>/_components/`, split by responsibility
   (presentational input/list pieces vs. an orchestrator screen component that owns the
   query and composes the rest). Don't dump fetching logic into a presentational piece.
3. **Shared components** — before retyping anything in
   `dev/app/_components/buddy-patterns.tsx`, `grep` for all its consumers. If it has
   exactly one and the real API shape differs from what it expects, retyping it is safe.
   If it has multiple consumers with conflicting needs, build a new route-local
   component instead of forcing a shared one to serve two masters.
4. **No fake assets**: when a real field can be `null`/missing (a poster image, an
   avatar, etc.), render the existing placeholder/default for that case. Do not
   manufacture a fake SVG/image file just to make a non-null code path easier to write.
5. **MSW mock parity (temporary, GET-only)** — `dev/src/mocks/handlers.ts`. Only ever
   mock **side-effect-free reads (`GET`)**. **Never mock a state-mutating call**
   (`POST`/`PUT`/`PATCH` that changes server state or an auth/onboarding flag such as
   `profileCompleted`) — wire those straight to the real backend from the start. A faked
   write returns a success the real backend never persisted, so every downstream real
   call that depends on that state breaks. This is exactly how mocking PROFILE-002
   (`PATCH /api/users/me/profile`) caused an infinite `/rooms`→`/nickname` loop: MSW faked
   `profileCompleted: true` and routed to `/home`, but the backend stayed incomplete, so
   CB-04's protected reads kept returning `403 AUTH_REQUIRED_PROFILE_INFO` and bounced the
   user back to `/nickname`. For the GET mocks you do create: copy the envelope shape and
   field names straight from the Notion page's Example JSON, read request params the same
   way the real backend would (query/path), and reuse this repo's `concertFixtures`-style
   pattern of plain seed objects mapped into the typed shape, not raw literal arrays. This
   mock is scaffolding for building/testing the connection — it gets deleted in step 7
   once the real BE call is confirmed working, not kept indefinitely alongside the real
   call.
6. **MSW registration race** — if the new hook fires a query on mount, gate it with
   `mswReadyPromise` from `dev/src/mocks/ready.ts` exactly as
   `references/concerts-example.md` §5 shows. Do **not** attempt to fix this by gating
   what `app/providers.tsx` renders based on a `typeof window` check — that produces a
   server/client hydration mismatch and breaks unrelated routes (this happened once
   already; see that same section for the failure signature so you recognize it if it
   recurs).
7. **Cross-screen query params** — if the new connection makes a screen pass a new
   query param to another route (like `concertId` flowing into `/rooms`), grep that
   destination route's screen component for hardcoded `router.push("/...")` /
   `href="/..."` literals that don't account for it — they'll silently drop the param.
8. **e2e + unit tests** — search `dev/e2e/buddyduck.spec.ts` and any
   `*.test.tsx` files for assertions tied to whatever you're replacing (old fixture
   titles, old navigation targets, old UI elements like removed filter chips). These
   often live in test files that look unrelated to the screen you're touching.
9. **Docs** — add any new components to `dev/AGENTS.md`'s Components list, and update
   its Mock/API Boundary section to describe the new envelope/hook.

## 7. Remove the now-redundant MSW mock

**Invariant (non-negotiable): after this PR, no path you wired to the real client may
still have a handler in `dev/src/mocks/handlers.ts`.** A leftover mock is registered as
`http.<method>("*<path>", …)` with a wildcard host, so it silently shadows the real
backend in dev/e2e **even though `NEXT_PUBLIC_API_BASE_URL` points elsewhere**. Treat
"connected endpoint still has a mock" as a regression, not a convenience.

Cross-check the invariant explicitly before finishing: for every URL you added to
`dev/src/lib/api/*` (or `dev/src/lib/auth/*`), grep `handlers.ts` for the same path and
confirm no handler survives, e.g.:

```bash
grep -nE 'http\.(get|post|put|patch|delete)\("\*?/api/<your-path>' dev/src/mocks/handlers.ts
```

Then delete the handler you added in step 6.5:

- Delete the `http.<method>("*<path>", ...)` handler block in
  `dev/src/mocks/handlers.ts`, plus any seed data / fixtures / type imports that existed
  only to feed it — check for now-unused imports left behind.
- Update `dev/AGENTS.md`'s "Mock/API Boundary" section to state, in a single line, that
  the endpoint has **no** MSW mock and always goes through `NEXT_PUBLIC_API_BASE_URL`.
  **Do not write a "why we keep this mock" justification in AGENTS.md.** That text becomes
  authoritative steering that tells the next implementer to skip this very step — it is
  what let the PROFILE-002 mock survive. Park any "not yet verified" caveat in the PR
  description or an issue, never in the steering doc.
- Audit `dev/e2e/buddyduck.spec.ts` and any `*.test.tsx` files for assertions tied to the
  mock's exact fixture values (specific titles, IDs, counts). Real backend data changes
  over time, so rewrite these to assert structure/behavior instead — e.g. a stable
  CSS/href pattern — rather than specific content. `references/concerts-example.md` §9
  has the worked rewrite.

### Auth-gated endpoints (Bearer-required): "can't verify" ≠ "keep the mock"

If the endpoint requires a real Bearer token, you usually **cannot** confirm it against
the real backend from dev/e2e — it returns `401 COMMON401` (no token) or `403
AUTH_REQUIRED_PROFILE_INFO` (token present, profile incomplete). This is **not** a reason
to keep a mock. Instead:

1. Still delete the mock — a connected endpoint must hit the real backend.
2. Verify the one way that actually works: a manual QA pass in a browser with a real
   Kakao login (profile completed), or an e2e fixture that injects a real access token.
3. If you genuinely can't get a real token right now, **escalate the unverified state to
   the user** (same as the CORS case in step 8) — do not paper over it with fixture data.
4. **Check the whole dependency chain.** If the screen's data depends on an onboarding
   precondition (login → profile completion → protected reads), confirm **every** step in
   that chain goes through the real backend. One mocked step (e.g. a faked profile
   completion) corrupts the state the real downstream reads rely on, and the failure
   surfaces on a *different* screen than the one you mocked.

Don't keep the mock "just in case" the real backend is flaky or unreachable from the
dev/e2e environment (CORS, auth, etc.) — that's a backend/infra problem to escalate to
the BE team, not something to paper over by quietly falling back to fixture data.

## 8. Verify

Run, from `dev/`, in this order, fixing forward until everything is clean:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright test
```

Run the **whole** Playwright suite, not just specs touching the new screen — cross-screen
regressions (like the query-param drop in step 6.7) only surface in a full run. If the
real backend rejects requests from the e2e/dev origin (e.g. CORS), don't work around it
by reintroducing the mock you just removed in step 7 — surface the finding to the user
and let them escalate it (BE allow-list fix), since that's outside what an FE-only
change can fix.

The five commands above still run under `npm run dev` (Playwright's `webServer`), where
MSW (`app/providers.tsx`, dev-only) stays live — so **none of lint / typecheck / test /
build can detect a leftover mock shadowing a connected endpoint** (they all pass with the
shadow in place). Close that gap with a mandatory per-endpoint runtime pass: `npm run
build && npx next start --port 3000`, open the screen, and for **each** endpoint you
connected confirm in the Network tab that the request hits `NEXT_PUBLIC_API_BASE_URL`
directly — and that `mockServiceWorker.js` is absent. This is the only point where MSW is
fully uninitialized, and it's the runtime counterpart to step 7's grep invariant.

## 9. Report back

Summarize in Korean (per session convention): which Notion API spec(s) got connected
and which related ones were intentionally left out, the files touched grouped by the
recipe step they came from (including the mock removal in step 7), and confirmation
that all five verification commands passed.
