# Frontend Architecture

How `frontend/` is actually built. Read this before adding a screen — several
conventions here are unusual enough that guessing will produce code that
doesn't match anything around it.

## Stack

| Concern | What this project uses |
|---|---|
| Framework | **Next.js 16** (App Router) |
| Language | TypeScript |
| Styling | **Tailwind CSS v4**, CSS-first config — no `tailwind.config.ts` |
| Client state | **Zustand** (3 stores) |
| Server state | **None** — no TanStack Query, no SWR |
| HTTP | **Native `fetch`**, wrapped in `src/utils/api.ts` — no axios |
| Forms | React Hook Form + Zod |
| Icons | `lucide-react` |
| QR | `qrcode.react` (render), `html5-qrcode` (scan) |

There is deliberately **no** axios, TanStack Query, shadcn/ui, Framer Motion,
or Recharts. Charts are hand-built; animation is CSS keyframes in
`globals.css`. Don't add one of these libraries for a single screen.

## Folder layout

```
frontend/src/
├── app/          route tree (App Router)
├── components/   UI, grouped by domain — see design/component-library.md
├── lib/
│   ├── api/          one module per backend domain
│   ├── hooks/        shared hooks
│   ├── store/        Zustand stores
│   ├── utils/        helpers
│   └── *.ts          cross-cutting logic (pricing, buyerGate, runtimeEnv, …)
├── types/        shared TypeScript types
├── utils/        api.ts — the fetch wrapper
├── mock/         fixtures
└── middleware.ts edge middleware
```

This is a **flat, layered** structure, not feature-sliced. There is no
`src/features/` directory and code should not introduce one — a new screen adds
a route under `app/`, its components under `components/<domain>/`, and its API
calls to an existing module in `lib/api/`.

## Routing

Route groups organise the four portals without appearing in URLs:

| Group | Portals | URL shape |
|---|---|---|
| *(none)* | Public — home, events, auth, booking | `/`, `/events/[event_id]`, `/login` |
| `(user)` | Buyer account | `/profile`, `/orders`, `/checkout/[event_id]` |
| `(console)` | Organizer, auditor, admin | `/organizer/*`, `/auditor/*`, `/admin/*` |
| `(venue-designer)` | 2D layout editor | `/venue-designer` |
| *(none)* | Ticketman staff portal | `/ticketman/login`, `/ticketman/dashboard` |

Note that `(user)` is a group, so buyer pages are at `/profile` and `/orders` —
**not** `/user/profile`. See [../reference/routing.md](../reference/routing.md)
for the full route table.

`/ticketman` is intentionally outside every group: it runs on a separate
session system with its own JWT secret and must not inherit buyer or console
chrome.

## The API layer

Every call goes through `src/utils/api.ts`. Never call `fetch` directly from a
component.

```
Component  →  lib/api/<domain>.ts  →  utils/api.ts  →  Go backend
```

`utils/api.ts` handles two things you must not reimplement:

**Silent refresh on 401.** A 401 triggers `POST /api/v1/auth/refresh` and
replays the original request. A module-level `inflightRefresh` promise is
shared across callers, so a burst of parallel 401s produces exactly one refresh
rather than a refresh storm. Login, register and refresh itself are excluded
(`isAuthBootstrap`) to avoid infinite recursion on bad credentials.

**CSRF.** State-changing requests carry `X-CSRF-Token`, read from the
non-HttpOnly `csrf_token` cookie. A signed-out POST returns **403 (CSRF)**,
not 401 — worth knowing when debugging.

### API modules

`lib/api/` mirrors backend domains: `auth`, `events`, `booking`, `payment`,
`tickets`, `orderAccess`, `organizer`, `eorganizer`, `auditor`, `admin/`,
`delegations`, `eventstaff`, `ticketman`, `scanner`, `resale`, `venues`,
`venueLayouts`.

⚠️ **Two backend packages were never versioned to `/api/v1`** — `organizer`
and `user` still serve bare `/api/...` paths. The ~34 bare-path calls in these
modules are **correct**. Do not "fix" them to `/api/v1`.

## State management

Three Zustand stores, and that is the intended total:

| Store | Holds |
|---|---|
| `authStore` | Current user + roles |
| `ticketmanStore` | Ticketman staff session (separate system) |
| `venueEditorStore` | Editor canvas state — selection, tool, layout draft |

Server data is **not** mirrored into Zustand. Without a query cache, screens
fetch in a `*View` container and hold results in local `useState`. When you
need cross-screen freshness, refetch — don't build a bespoke cache.

Shared hooks live in `lib/hooks/`: `useEventSeatMap`, `useSeatSelection`,
`useHoldCountdown`, `useQueueStatus`.

## Runtime environment config

`NEXT_PUBLIC_*` variables are resolved at **runtime, not build time**.

`docker-entrypoint.sh` writes a static config file that `app/layout.tsx` loads
with `beforeInteractive`, and `lib/runtimeEnv.ts` reads it. This exists because
the same image is promoted across environments — baking values in at build
time would freeze sandbox config into the production image.

**Read public config through `lib/runtimeEnv.ts`**, never `process.env.NEXT_PUBLIC_*`
directly in a component. See
[../onboarding/environment-configuration.md](../onboarding/environment-configuration.md).

## Middleware

`src/middleware.ts` runs at the edge and does three jobs:

1. **Smart redirects** — a small alias map fixes common URL guesses
   (`/signin` → `/login`, `/tickets` → `/profile`, `/dashboard` →
   `/organizer/dashboard`).
2. **Resale is hidden.** Everything under `/resale` redirects to `/` by
   product decision. The resale backend package, API module and UI components
   all still exist and compile — the feature is switched off here, not deleted.
3. **Session hint.** It checks for `access_token` **or** `csrf_token`.

⚠️ The two-cookie check in job 3 is load-bearing and commented as such in the
file. `access_token` expires in ~15 minutes, so testing it alone bounces valid
sessions to `/login` after a short idle — this exact regression shipped once
(`3f53c65` reverting `4dbff21`) and read as "random logouts". Don't simplify it.

This check is a **hint, not authorization**. Real enforcement is in the Go
middleware — see [auth-and-roles.md](./auth-and-roles.md).

## Authorization on the client

`components/auth/AuthGuard.tsx` gates console routes in the browser. It is a
**UX affordance only**. Every protected action must be authorized server-side;
a client that lies simply gets a 401/403 from Go.

Never treat "the nav item is hidden" as a security control.

## Styling

Tailwind utilities only. No CSS Modules, no styled-components, no inline
`style` objects except where a value is computed at runtime (canvas transforms,
dynamic grid offsets).

All tokens live in `app/globals.css` — see
[../design/design-tokens.md](../design/design-tokens.md).

## Conventions

- **Imports** use the `@/` alias, never `../../../`.
- **`*View` components** are screen containers that own fetching; the
  components they render are presentational.
- **No `any`.** Shared types in `src/types/`, local types beside their use.
- **No `console.log` in committed code.**
- Every list screen ships loading, empty and error states.

## Known rough edges

- `src/mock/` and `lib/mock/` still back some admin surfaces. Check whether a
  screen is wired to the real API before trusting its numbers.
- `home-v2/` is superseded by `home-v3/`; only `HomeFooterV2` survives.
- `components/ui/` holds just `Modal` and `Select` — most primitives are
  inline Tailwind at each call site. See
  [../design/component-library.md](../design/component-library.md).
