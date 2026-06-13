# Development Conventions — BuddyDuck FE

## Stack

- Next.js App Router + React + TypeScript
- Tailwind CSS with global BuddyDuck design tokens
- shadcn/ui primitives wrapped by BuddyDuck components
- TanStack Query v5 for query boundaries
- Zustand for local UI state
- MSW for API mock handlers
- react-hook-form + zod for form validation

## App Shell

- Runtime web layout uses a centered mobile app container: `max-width: 430px`, `width: 100%`, `margin: 0 auto`.
- Wireframe presentation decorations such as `device`, `notch`, and `statusbar` must not appear in the runtime web app.
- Vertical height should follow page content instead of forcing a fixed phone-frame height.
- Pretendard is served from `public/fonts/pretendard/PretendardVariable.woff2` and used as the global default font.

## shadcn/ui

- Initialize with `npx shadcn@latest init`.
- Use the `new-york` style.
- Use aliases: `@/components`, `@/components/ui`, `@/lib/utils`, `@/hooks`.
- Expected primitives: `button`, `card`, `dialog`, `input`, `textarea`, `label`, `form`, `badge`, `tabs`, `sheet`, `select`, `switch`, `separator`, `avatar`, `scroll-area`.
- Do not ship the default shadcn theme unchanged. Map shadcn CSS variables and variants to the dark/yellow tokens in `design/AGENTS.md`.

## Components

- `AppShell`: centered 430px app container, page padding, safe bottom spacing, and optional bottom navigation.
- `AppBar`: top navigation bar with centered title and left/right icon actions.
- `BottomNav`: 3-tab app navigation for home, my rooms, and profile.
- `Button`: BuddyDuck wrapper over shadcn `Button`; primary, outline, kakao, danger, small, and icon variants.
- `Chip` / `Badge` / `Tag`: selectable filters and compact metadata badges using shadcn badge-compatible styling.
- `FormField`: shared label, input, textarea, helper, and error state patterns over shadcn form/input primitives.
- `Skeleton`: loading placeholder using surface-2 shimmer animation.
- `Modal` / `Dialog` / `Sheet`: BuddyDuck modal surfaces over shadcn dialog/sheet primitives.
- `Card`: shared elevated surface using design token radius, border, and shadow over shadcn card primitives.
- `RoomCard`: room list/detail summary card.
- `ConcertCard`: concert feed card with thumbnail, title, date, and venue metadata.
- `TimelineBlock`: schedule/timetable segment with dwell and route duration controls.
- `MapFallback`, `MapPin`, `MapPlaceCard`: Kakao Maps fallback and read-only map UI pieces.
- `Avatar` / `MemberRow`: member identity row with host, pending, and participant states.
- `Stepper`: compact minus/value/plus control for timetable dwell and route durations.
- `BackButton`, `SectionTitle`, `InfoRow`: small navigation, section labeling, and compact key-value helpers used by screen patterns.

## Mock/API Boundary

- `src/mocks/handlers.ts` owns MSW responses for `/api/concerts` and `/api/rooms`.
- `src/lib/api.ts` owns TanStack Query hooks and mutation boundaries.
- `src/lib/data.ts` owns static domain data until backend integration.

## Screen Routing

- `src/lib/routes.ts` is the authoritative registry for CB-01 through CB-14′.
- Prefer App Router file-based routes over `app/[[...slug]]` catch-all rendering.
- Modal screens are represented by query states:
  - CB-04′: `/rooms?modal=tags`
  - CB-07D′: `/rooms/visitor?modal=apply`
  - CB-11′: `/timetable?modal=warning`

## Verification

- Required commands before handoff: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Playwright UI/UX checks use a default viewport of `430 x 932`.
- Browser checks should cover login, home, room list, four room detail states, timetable edit, map, profile, and the three modal query states.
- UI checks must confirm fixed app width, no phone mockup decorations, scroll/CTA/bottom nav behavior, modal focus/close behavior, and map fallback rendering.
