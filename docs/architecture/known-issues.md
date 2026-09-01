# Known Issues

This is an internal engineering reference: what is broken, why it matters,
and its practical impact — not a pentest report. Each item below was
verified against the current code on this branch before being listed.

## 1. Turnstile CAPTCHA is silently disabled on sandbox and production

`backend/pkg/turnstile/turnstile.go`'s `VerifyToken` has two independent
paths that resolve to "allow", both defaulting open when configuration is
absent rather than failing closed:

- **Missing secret key**: if `TURNSTILE_SECRET_KEY` is unset, the code falls
  back to a hardcoded constant, `DefaultTestSecret`
  (`turnstile.go:22`, `turnstile.go:27-29`). A later check then returns
  `true` **unconditionally** whenever `secretKey == DefaultTestSecret`
  (`turnstile.go:43`) — it never calls Cloudflare's verify endpoint at all in
  that case.
- **Missing/empty token**: if the client sends no token, the function
  returns `true` unless `TURNSTILE_REQUIRED` is exactly the string `"true"`
  (`turnstile.go:34-40`).

Both env vars are genuinely absent from the example configs this project
ships for those environments — `backend/.env.sandbox.example` and
`backend/.env.production.example` define neither `TURNSTILE_SECRET_KEY` nor
`TURNSTILE_REQUIRED`. A host provisioned from those examples therefore has
Turnstile as a complete no-op on every form it's supposed to gate, with
nothing logged to indicate that verification was skipped rather than passed.

This is the backend half of a matching problem: an earlier, hardcoded
frontend Turnstile site-key fallback was already removed this session (see
`purchase-and-inventory.md`/git history for that change) — this backend
default-secret/default-open behavior is the half that actually decides
whether a submission is accepted, and it was not touched by that fix.

**Impact**: any endpoint gated by Turnstile has no real bot/abuse protection
on sandbox or production unless an operator has explicitly set both
`TURNSTILE_SECRET_KEY` (to a real Cloudflare secret, not the constant above)
and `TURNSTILE_REQUIRED=true` outside of what the example files show.

## 2. Email delivery is effectively non-functional

`RESEND_FROM_EMAIL` defaults to Resend's shared sandbox sender,
`CrowdFlow <onboarding@resend.dev>` (`backend/internal/mail/service.go:29-30`,
`backend/.env.example:127-134`). Resend only ever delivers mail sent from
that address to the Resend **account owner's own verified address** — it
does not deliver to arbitrary recipients. Unless a real, domain-verified
`RESEND_FROM_EMAIL` is configured, every email sent to an actual user
(OTPs, password resets, e-tickets) silently fails to reach them.

This is compounded by two things:

- Mail sends run in a **fire-and-forget goroutine**
  (`backend/internal/payment/service.go:618`) and any error is only logged
  (`mail/service.go:144-146`), never surfaced back to the caller or the
  buyer. There is no retry and no user-visible failure state — from the
  buyer's perspective, a purchase just silently never produces an email.
- The e-ticket booking link is now the **only** way a buyer reaches their
  ticket. There is no PDF attachment and no QR image sent by email — the
  code comment is explicit about this (`mail/service.go:14-18`, "link only
  ... no QR image, no attachment"). If the email never arrives, the buyer
  has no ticket, full stop — there is no fallback delivery path to check.

**Impact**: a buyer who successfully pays can end up with a paid order and
no way to retrieve their ticket, and nothing in the system alerts anyone
that this happened.

## 3. `/auth/send-otp` returns the OTP in its own response body

`handleSendOTP` (`backend/internal/auth/handler.go:648-672`) returns the
generated OTP code directly in the JSON response (`"otp": otpCode`, line
670) to whoever called the endpoint. Combined with issue #1 above (email is
generally undeliverable), this is currently the *only* way OTP-based flows
work at all in practice — but it also means the OTP never actually needs to
be intercepted from an inbox; anyone who can call the endpoint already has
the code. There is no server-side verification step separate from
whatever the client does with the value it was just handed back.

## 4. Rate limiting covers a small fraction of the route surface

`backend/main.go` wires exactly **14 distinct rate-limiter instances**
(confirmed by counting every `middleware.RateLimit`/`RateLimitBy` call site:
`main.go:208,211,215,218,220,221,224,225,275,280,306,326,349,379`), applied
to roughly **20 of the platform's 191 routes**. Everything else — the
entire `admin`, `auditor`, `venuelayout`, and `eventstaff` packages, most of
`organizer`, `scanner`'s gate CRUD, and `resale` — has zero rate limiting,
including plenty of state-changing `POST`/`PUT`/`PATCH`/`DELETE` routes.

This is not evenly distributed by risk: the unlimited packages are all
gated behind an authenticated, already-privileged role (`Super Admin`,
`Auditor`, or a verified `Event Organizer` with ownership), so exploiting
the gap requires an account that already passed a role check — unlike a
genuinely open, unauthenticated route. Two specific routes stand out as
closer to that risk shape because they sit right next to sibling routes
that *do* carry a limiter for the same cost profile:

- `POST /api/organizer/events/{id}/cover` (file upload to object storage) —
  has no limiter, while the two document-upload routes in the same file
  carry `organizer-upload` (30/hour).
- `POST /api/organizer/events/{id}/staff/{staffId}/reset-credentials`
  (issues new ticketman login credentials) — has no limiter at all.

## 5. Edge nginx upload cap

This repo's own `nginx/nginx.conf` (baked into the `crowdflow-nginx` Docker
image, sitting *inside* the Compose network) caps request bodies at **20MB**
overall (`nginx.conf:29`, `client_max_body_size 20m;`) and **12MB**
specifically under `/api/` (`nginx.conf:76`), matching the backend's own
10MB file-size cap plus multipart framing headroom.

That is a *different* nginx from the one that actually terminates TLS for
the deployed VPS host. The VPS edge nginx is not part of this repository at
all — it lives directly on the host — and this repo's own config carries an
explicit comment acknowledging that: "this is NOT the VPS edge nginx that
terminates TLS in front of this whole stack and separately caps uploads at
1MB" (`docker-compose.yml`, comment on the `nginx:` service; also recorded
in project history). Because that edge config is outside this repository,
its cap could not be independently re-verified from source during this
documentation pass — it is stated here as a still-open item per the
in-repo comment's own claim of 1MB, not as something read directly from the
edge host's nginx.conf. Whatever its real value, any upload above it fails
with an HTML 413 at the edge, before reaching the Go backend at all — the
backend's own JSON error responses and size limits never get a chance to
run.

## 6. JWT-vs-DB role staleness

Most role-gated middleware (`RequirePlatformRole`, `RequireEventRole`,
`RequireEventOwnership`) reads roles from the **access token's claims**,
which are frozen for the token's TTL (default 15 minutes). A role change —
most notably, an auditor approving an organizer application, which both
grants `Event Organizer` and revokes the user's prior platform roles in one
transaction (see `auth-and-roles.md`) — does not take effect for that user
until their token is refreshed.

**User-facing impact**: a freshly-approved organizer opens the organizer
console and gets a `403 FORBIDDEN` on every organizer-only endpoint, for up
to the full access-token TTL. The frontend's automatic token-refresh logic
triggers on `401` (expired/invalid token), not on `403` (role mismatch), so
nothing about the failure looks different from a genuine permissions denial
— there is no client-side signal telling it to refresh early. The user's
only options are to wait out the TTL or manually sign out and back in. This
is a real, currently-unfixed gap — a fix was previously proposed (force a
refresh on a role-related 403) but was not built as of this branch.

## 7. `admin.handleNotImplemented` is dead code

`backend/internal/admin/handler.go:118` defines `handleNotImplemented`, a
stub intended to be returned for admin actions on resources with no backing
implementation. It is never referenced by any `mux.Handle`/`mux.HandleFunc`
call anywhere in the codebase — confirmed by searching the entire
`internal/admin` package for the identifier and finding only its own
definition. It has no effect on runtime behavior; it can be removed without
any risk, or left as a documented placeholder for a future admin action
that genuinely has no backend yet.

## 8. `backend/db/crowdflow-1782101431.sql` is a 0-byte decoy

The file that looks, by name and extension, like the base schema dump is
empty (`file backend/db/crowdflow-1782101431.sql` reports `empty`). The real
base schema lives in its sibling, `crowdflow-1782101431-custom.sql` — which,
despite the `.sql` extension, is actually `pg_restore` custom-archive binary
format, not plain SQL text (confirmed with `file`: `PostgreSQL custom
database dump`). A `.sql` file cannot be piped into `psql` here; it needs
`pg_restore`.

**Impact**: a new developer who greps or `cat`s the `.sql` file looking for
the schema finds nothing and may reasonably conclude the schema isn't
tracked at all, or try to load the binary file with `psql` and get a
confusing failure. This is a documentation/naming trap, not a runtime bug.

## 9. Frontend example env files describe `NEXT_PUBLIC_*` as build-time; that's no longer true

`frontend/.env.sandbox.example:3` and `frontend/.env.production.example:3`
both still say "These are build-time values: Next inlines `NEXT_PUBLIC_*`
into the client [bundle]." That was accurate before the runtime-config
migration (`frontend/src/lib/runtimeEnv.ts`, `frontend/docker-entrypoint.sh`):
the three `NEXT_PUBLIC_*` values these files list
(`NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, and
`NEXT_PUBLIC_APP_ENV`) are now written to `public/env-config.js` by the
container entrypoint from the **running container's** environment on every
start, specifically so one built image can serve every environment without
a rebuild — the opposite of "build-time."

**Impact**: low on its own, but actively misleading for whoever next edits
these example files or explains this config to someone else — the comment
now describes the mechanism this migration was built to replace.
