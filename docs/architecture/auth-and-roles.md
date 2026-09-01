# Auth and Roles

There are **two independent, non-interoperable session systems** in this
codebase. A token from one is meaningless to the other's middleware by
construction, not just by convention.

## System 1: ordinary user auth (buyers, organizers, auditors, admins)

Access+refresh JWT pair:

- **Access token** — short-lived (`ACCESS_TOKEN_TTL`, default 15 minutes),
  stateless HMAC JWT, verified by `middleware.AuthMiddleware.Authenticate`
  (`backend/internal/middleware/auth.go:64-113`) purely by signature — no
  database round trip. Carries `sub` (user id), `email`, and `roles` as
  claims.
- **Refresh token** — opaque string `"<familyID>.<secret>"`, tracked in
  Redis (`backend/internal/auth/session.go`). Only `sha256(secret)` is ever
  stored. Every successful refresh **rotates** the secret (issues a new one,
  invalidates the old) via a Lua script that does validate+rotate
  atomically (`session.go:97-127`).
- **Reuse detection**: presenting an already-rotated (stale) secret deletes
  the whole session family and is treated as a signal of token theft
  (`ErrRefreshTokenReuse`, `session.go:55-58`, `206-210`). A 10-second grace
  window (`session.go:33-46`) tolerates two browser tabs racing a refresh
  right after each other without triggering a false reuse-revoke.

## System 2: ticketman (scanner staff) auth

Entirely separate, and deliberately so:

- Signed with **`TICKETMAN_JWT_SECRET`**, a completely different secret from
  `JWT_SECRET`. `backend/main.go:126-140` spells out why in a comment: `aud`
  is never checked anywhere the platform's own `Authenticate` middleware
  runs, so if a ticketman token were signed with the same key, it would be
  accepted by ordinary user routes with the staff id silently read as a user
  id. Using a distinct secret makes that impossible by construction — a
  ticketman token simply fails signature verification against `JWT_SECRET`
  and vice versa. No audience check is needed on either side to get that
  isolation.
- The JWT itself is deliberately **thin** — just `sub` (staff id) — and is
  **re-validated against the database on every single request**
  (`middleware.TicketmanAuthMiddleware.RequireTicketman`,
  `backend/internal/middleware/ticketman_auth.go:56-118`): it re-reads
  `event_staff.status`, `valid_from`, `valid_until` every time. This gives
  instant revocation — an organizer suspending/deleting a staff account, or
  a session simply running past its `valid_until` window, takes effect on
  the very next request rather than waiting out the JWT's lifetime.
- The backend **fatals at startup** if `TICKETMAN_JWT_SECRET` is unset
  outside local dev (`main.go:134-140`), mirroring the same pattern as
  `JWT_SECRET` and `FRONTEND_URL`.

## Platform roles

Five platform roles exist, stored in `user_roles` joined to `roles`.
Platform-level roles have `event_id IS NULL`; event-scoped roles (see below)
have `event_id` set.

| Role | Purpose |
|---|---|
| `User` | The **only** role permitted to buy tickets — see "buyer-only purchasing" below |
| `Event Organizer` | Create/manage own events |
| `Auditor` | Approve organizers, events, payouts, bank verifications |
| `Super Admin` | Full platform access — see the "auto-pass" trap below |
| (event-scoped `Event Organizer`) | Co-organizer delegation — see below |

### Organizer approval REPLACES platform roles, it does not stack

When an auditor approves an organizer application
(`auditor.ApproveOrganizer` → `PostgresAuditorRepository.ApproveOrganizer`,
`backend/internal/auditor/repository.go:1756-1817`), the transaction:

1. `DELETE FROM user_roles WHERE user_id = $1 AND event_id IS NULL` — wipes
   **every** existing platform-level role the user held.
2. `INSERT INTO user_roles (...) VALUES (..., 'Event Organizer', NULL)` —
   grants exactly one platform role: `Event Organizer`.

This means a newly-approved organizer **loses their `User` (buyer) role**
in the same transaction that grants them `Event Organizer`. This is
consistent with — and is the actual mechanism behind — the buyer-only
purchasing rule (`RequireBuyer` below): an approved organizer account is no
longer a buyer account, by design, not by omission. Project memory recorded
this as a locked design decision ("organizer approval REPLACES/supersedes
platform roles rather than stacking"); this matches what the code actually
does, verified directly against `auditor/repository.go:1789-1804`.

### Buyer-only purchasing: built as an allowlist, not on `RequirePlatformRole`

`middleware.RequireBuyer` (`backend/internal/middleware/buyer.go`) restricts
purchase-adjacent endpoints (creating a hold, creating an order) to accounts
holding the platform `User` role. It is deliberately **not** built on
`RequirePlatformRole`, because that helper short-circuits to allow on
`Super Admin` before checking anything else (see the trap below) — which
would have exempted exactly the account class (staff/admin accounts) this
rule exists to block. `RequireBuyer` has no bypass of any kind: no Super
Admin exemption, no environment escape hatch.

It also reads the role from the **database**, not from JWT claims, and the
code comment explains why in detail (`buyer.go:49-60`): the access token's
`roles` claim is frozen for up to 15 minutes, and the frontend only
force-refreshes its token on a `401`, never on a `403`. Reading from claims
alone would be wrong in *both* directions for up to a full token lifetime —
a freshly-approved organizer would keep being able to buy, and a user whose
roles moved the other way would get a `403` with no client-side path to
self-heal. The extra indexed `EXISTS` query per purchase attempt is judged
cheap relative to that failure mode. `RequireTicketman`'s DB re-check
(above) is the same pattern for the same reason.

## Event-scoped roles: co-organizer delegation

An `Event Organizer` role can also be scoped to a specific `event_id`
(non-`NULL`) rather than platform-wide. `RequireEventRole` and
`RequireEventOwnership` (`backend/internal/middleware/auth.go:199-325`) both
treat an **active co-organizer delegation** as equivalent to actual event
ownership, via a shared `eventAccessQuery` (`auth.go:29-44`):

- `scope='all'` covers the delegate over the owner's *entire* portfolio,
  including future events.
- `scope='specific'` covers only the events explicitly named in
  `organizer_delegation_events`.

This lets an owner delegate day-to-day management of some or all of their
events to another account without granting them a separate platform role.

## Middleware set

| Middleware | What it checks | "Trap" to know about |
|---|---|---|
| `Authenticate` | Valid `access_token` cookie, populates claims into context | Rejects (401) if missing/invalid |
| `OptionalAuthenticate` | Same, but never rejects — populates claims if present, otherwise proceeds unauthenticated | Used for public browse endpoints that vary slightly when logged in |
| `RequirePlatformRole(roles...)` | Claims include one of `roles` | **Auto-passes `Super Admin` before checking the list at all** (`auth.go:177-183`) — a handler gated to, say, `"Auditor"` will still admit a Super Admin even though "Auditor" was never in its own role set. Any handler relying on `RequirePlatformRole` to *exclude* Super Admin (buyer-only purchasing is exactly this case) must not use it. |
| `RequireBuyer` | `User` role, read from DB, no bypass | See above — the one middleware deliberately built to not have the Super Admin trap |
| `RequireTicketman` | Ticketman JWT + live DB status/window check | Re-checks DB every request (instant revocation), separate secret from platform JWT |
| `RequireEventOwnership` | Caller owns the event (`organizer_id`) OR has an active delegation covering it | Also auto-passes Super Admin |
| `RequireEventRole(role)` | Caller has that role scoped to the event's id, OR (for `"Event Organizer"`) an active delegation | Also auto-passes Super Admin |

## Known JWT-vs-DB staleness issue

Because the access token's `roles` claim is frozen for its whole TTL
(default 15 minutes) and most role-gated middleware (`RequirePlatformRole`,
`RequireEventRole`, `RequireEventOwnership`) reads roles **from the JWT
claims**, not the database, a role change made by an admin/auditor does not
take effect until the affected user's access token is refreshed. In
practice: an organizer who is freshly approved (see above — their roles
just changed) will get a `403 FORBIDDEN` on organizer-console endpoints
until their token naturally refreshes, because the frontend's auto-refresh
logic triggers on `401` (token expired/invalid), not on `403` (role
mismatch) — a `403` looks identical to a genuine permissions denial from
the client's point of view, so nothing tells it to refresh early. `
RequireBuyer` and `RequireTicketman` are exceptions precisely because they
read from the database on every request instead — this is a large part of
why they were built that way rather than reusing `RequirePlatformRole`. See
`known-issues.md` for the user-facing impact.
