# Environment configuration

This is the authoritative map of every environment variable in this repo:
which file it lives in, whether it's build-time or runtime, and which values
are per-host (never copied between environments). It's the single most
confusing part of this project and has caused several real incidents (see
[Gotchas](#gotchas-worth-internalizing) at the end) — read it before you
touch any `.env` file.

## The four env files, and what each one is for

| File | Read by | Committed? | Scope |
|---|---|---|---|
| `.env` (repo root) | `docker compose` only, to interpolate `${VAR}` in `docker-compose.yml` | No (`.env.example` is) | Docker-only. Never read by the Go binary or by Next directly. |
| `backend/.env` | The Go binary, always — whether run via `go run`, inside a container, or any `cmd/` tool | No (`.env.example` + two overlay `.example` files are) | Per host. Real secrets. |
| `frontend/.env` | `npm run dev` **only** | No (`.env.example` is) | Local dev only — see below, this file has **no path into a container at all**. |
| Neither — runtime env vars passed to the frontend **container** | `frontend/docker-entrypoint.sh`, at container start | N/A (values come from the root `.env`, passed through `docker-compose.yml`'s `environment:` block) | Per host. |

The backend is fully runtime-configured everywhere: `go run main.go`, inside
a container, doesn't matter — it always reads `backend/.env` (or real
process env vars) at boot. The frontend used to be different (build-time
`NEXT_PUBLIC_*`, baked into the image); it isn't any more. Both halves of
that history matter enough to spell out separately below.

## Which values are per-host and must never be copied between environments

Every value in `backend/.env` is per-host **except** none — literally
everything in it (DB credentials, JWT secrets, Midtrans keys, R2 credentials,
Resend key, Turnstile secret, `FRONTEND_URL`) is specific to the environment
it's deployed to. Copying a whole `backend/.env` from one host to another is
never correct. The two Midtrans/Turnstile-only overlay files
(`backend/.env.sandbox.example`, `backend/.env.production.example`) exist
specifically so you copy the handful of values that differ, not the whole
file — their own header comments say this explicitly: **merge these keys
into the host's `backend/.env`, do not copy the overlay file over it** (it
has no `DB_DSN`/`JWT_SECRET`/etc. at all — copying it wholesale produces a
broken environment).

## The `APP_ENV` switch (backend/.env)

One variable decides almost everything about how strict the backend is:

| `APP_ENV` | `devMode` | Secure cookies | `JWT_SECRET` required | `TICKETMAN_JWT_SECRET` required | `FRONTEND_URL` required | Midtrans gateway |
|---|---|---|---|---|---|---|
| `production` | `false` | ✅ | ✅ | ✅ | ✅ | Production |
| `sandbox` | `false` | ✅ | ✅ | ✅ | ✅ | Sandbox |
| `local` | `true` | ❌ | insecure hardcoded fallback | insecure hardcoded fallback | falls back to `http://localhost:3000` | Sandbox |
| *(unset)* | `false` (same as production) | ✅ | ✅ | ✅ | ✅ | Production |

Resolution order (`backend/internal/config/env.go`): `APP_ENV` → legacy
`DEV_MODE=true` fallback → **`production`** if neither is set. `devMode` is
`true` for `local` and nothing else — sandbox is a public host and gets the
same strict path as production.

**This means an unset `APP_ENV` on any real host fails to boot**, not
degrades: `main.go` calls `log.Fatalf` if `JWT_SECRET` or
`TICKETMAN_JWT_SECRET` is empty and `devMode` is false. `FRONTEND_URL` has
the same fatal-if-missing behavior outside `local` (see below). This is
intentional fail-closed design, not a bug to route around by setting
`DEV_MODE=true` on a real host — see the Gotchas section for exactly that
mistake happening once already.

Confirm what a running backend resolved to from its own boot log:

```
config: APP_ENV=… (devMode=…, secureCookies=…)
```

## Required-to-boot variables, and what happens if they're missing

| Variable | Required when | Behavior if missing |
|---|---|---|
| `DB_DSN` | always | `log.Fatalf` — the backend pings the DB at startup |
| `REDIS_ADDR` | always (defaults to `localhost:6379` if unset) | `log.Fatalf` — the backend pings Redis at startup with a 5s timeout |
| `JWT_SECRET` | `APP_ENV` ≠ `local` | `log.Fatalf` |
| `TICKETMAN_JWT_SECRET` | `APP_ENV` ≠ `local` | `log.Fatalf` |
| `FRONTEND_URL` | `APP_ENV` ≠ `local` | `log.Fatalf` |

`TICKETMAN_JWT_SECRET` signs ticketman (scanner staff) sessions and is
**deliberately a separate secret from `JWT_SECRET`** — the platform's own
auth middleware never checks a token's `aud` claim, so a ticketman token
signed with the platform's `JWT_SECRET` would be accepted by ordinary
user-authenticated routes. Never reuse `JWT_SECRET`'s value here, and never
reuse one environment's `TICKETMAN_JWT_SECRET` in another.

`FRONTEND_URL` is more than a convenience value: e-ticket emails (sent from
the Midtrans webhook) link to `{FRONTEND_URL}/booking/<order_uuid>`, and
since there's no PDF/QR-image fallback, that link is the *only* way a buyer
ever reaches their ticket. A wrong value here reaches a real customer as a
dead link, which is why it's fatal-if-missing rather than defaulting to
something guessable.

## Midtrans: sandbox vs production keys

**Do not judge a Midtrans key's environment by whether it has an `SB-`
prefix.** The rule is one-directional:

| Prefix | Conclusion |
|---|---|
| `SB-` present | Definitely a sandbox credential |
| `SB-` absent | **Proves nothing** — this project's own working sandbox keys (`Mid-server-…` / `Mid-client-…`) have no prefix at all |

What actually decides a key's environment is which Midtrans dashboard you
copied it from — `dashboard.sandbox.midtrans.com` vs `dashboard.midtrans.com`
are two separate credential stores behind a near-identical UI. Always take
the server key and client key for a given environment from the *same*
dashboard; a mismatched pair fails with nothing useful in the UI.

To settle a key's environment definitively, ask Midtrans rather than
eyeballing the string:

```bash
curl -u "$MIDTRANS_SERVER_KEY:" \
  https://api.sandbox.midtrans.com/v2/any-unknown-order-id/status
```

- `404 "Transaction doesn't exist."` → the key **is valid** for that gateway
  (it authenticated, then failed to find the order — that's success).
- `401 "Access denied due to unauthorized transaction…"` → not valid there.

Swap the host for `api.midtrans.com` to test the production gateway instead.
There's also a committed Go test that does this without a manual `curl`:

```bash
cd backend
export MIDTRANS_SERVER_KEY=...     # the binary has no dotenv loader; export it
go test ./internal/payment -midtrans-env=both -v      # which gateway owns it?
go test ./internal/payment -midtrans-env=sandbox       # assert it IS sandbox
go test ./internal/payment -midtrans-env=production    # assert it IS production
```

It's opt-in — with no flag and no `MIDTRANS_PROBE_ENV` env var set, it skips,
so a plain `go test ./...` never opens a network connection. `both` is
diagnostic; naming one gateway is an assertion that fails if the key belongs
to the other one. (`go test ./internal/payment sandbox` does **not** work —
Go reads a bare word after the package path as a second package path, not an
argument. It has to be the `-midtrans-env=` flag.)

`MIDTRANS_ENV` (`production`|`sandbox`) overrides `APP_ENV` for the gateway
choice only — leave it empty unless you're deliberately pointing one
backend's payment calls at the other gateway for a one-off check.

## The frontend's three runtime values — and why they're runtime, not build-time

`NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, and
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` are read at **container start**, not at
`npm run build` time. This is a deliberate migration away from the old
build-time mechanism (Next inlining `NEXT_PUBLIC_*` into the client bundle
during the build, delivered as Docker build args) — that older design meant
one frontend image only worked for one environment, and — before those build
args even existed — meant every containerized deploy shipped the literal
string `"undefined"` as the Midtrans client key, because
`frontend/.dockerignore` excludes `.env` and the image build never saw
`frontend/.env` at all.

How it works now: `frontend/docker-entrypoint.sh` runs before `node
server.js` starts and writes `/app/public/env-config.js` — a plain static
file containing `window.__ENV__ = {...}` — from the **container's actual
environment** at that moment. `app/layout.tsx` loads that file via Next's
`next/script` component with `strategy="beforeInteractive"`, which is Next's
own guarantee that the script executes before any other page JS runs
(`src/lib/runtimeEnv.ts` is what reads `window.__ENV__` back out). This
matters because Midtrans Snap and Cloudflare Turnstile both need their key
*before* their own third-party script loads — a value that arrives even one
tick late means the wrong (or no) key was already in use.

Practical consequence: **changing one of these three values on a deployed
host is a container restart with a different env var, not an image
rebuild.** For local `npm run dev`, none of this applies — Next reads
`frontend/.env` directly, the traditional way, and the three values there
behave like any other dev-mode env file.

| Where you're running | Where these 3 values come from |
|---|---|
| `npm run dev` | `frontend/.env` (copy from `frontend/.env.example`) |
| `docker compose` (local, sandbox, or production) | The root `.env` (copy from `.env.example`), passed through `docker-compose.yml`'s `environment:` block |

**These two are deliberately not wired together.** `docker-compose.yml`'s
frontend service does not reference `frontend/.env` at all (no `env_file:`
line) — on purpose. If it did, and the root `.env` had these values unset
while `frontend/.env` had real ones (a completely normal local setup), the
empty root-`.env` value would **silently shadow** the real one:
`docker-compose.yml`'s `environment:` block always wins over `env_file:`,
so you'd get an empty string, not the value you actually set, with no error
telling you why. Keeping `frontend/.env` completely out of the frontend
container's config is what makes that shadowing structurally impossible
rather than merely something to remember not to do — see the next section
for the general version of this trap.

A missing value now fails loudly rather than silently: the entrypoint script
logs a `WARNING` naming the exact missing variable to the container's stdout,
`src/lib/runtimeEnv.ts` logs a `console.error` in the browser if
`window.__ENV__` never loaded at all, and the checkout page explicitly
refuses to open Midtrans Snap with a blank client key (shows the buyer an
alert instead of a silently-broken payment popup).

## The `environment:` vs `env_file:` trap (compose)

In `docker-compose.yml`, a service's `environment:` block **always wins**
over its `env_file:` — silently, with no warning. This has caused two real
incidents in this project:

1. `docker-compose.yml` used to hardcode `DEV_MODE=true` directly in the
   backend service's `environment:` block. Since `deploy-main.sh` and
   `deploy-dev.sh` shared that one file, that single line silently put
   **production** into development mode — relaxed Secure-cookie flag, no
   required `JWT_SECRET` — no matter what `backend/.env` on the production
   host said. Fixed by removing it: `DEV_MODE`/`APP_ENV`/`FRONTEND_URL`/
   `DB_DSN` are **never** allowed in the backend service's `environment:`
   block now, only in `backend/.env` via `env_file:`. If you're ever tempted
   to add one of these four to `environment:` for a quick local override —
   don't; edit `backend/.env` instead.
2. The frontend's `env_file: ./frontend/.env` line (see previous section) —
   fixed by removing `env_file:` from that service entirely, not by trying
   to order the two blocks correctly (order doesn't help; `environment:`
   wins regardless of position in the file).

The general rule this leaves behind: **before adding anything to a service's
`environment:` block in this file, check whether that same key can also come
from an `env_file:` on the same service.** If it can, you've just built the
shadowing trap a third time.

## Gotchas worth internalizing

- **`APP_ENV=sandbox` turns Secure cookies on.** If a sandbox host serves
  plain HTTP (no TLS yet), browsers silently drop the cookies and login
  breaks with no obvious error. Keep a not-yet-HTTPS sandbox host on
  `APP_ENV=local` until it has TLS.
- **Midtrans cannot reach `localhost`.** The webhook never arrives locally,
  so an order paid in the sandbox Snap popup stays `pending` forever on a
  dev machine — this is expected, not a bug. A full local webhook test needs
  a tunnel (ngrok or similar) pointed at `/api/v1/payment/webhook`, with that
  URL registered in the Midtrans sandbox dashboard.
- **Webhook signature verification is live.** With a real `MIDTRANS_SERVER_KEY`
  configured, a hand-rolled `curl` to the webhook endpoint gets a `403`
  unless it carries a valid `signature_key`
  (`SHA512(order_id + status_code + gross_amount + serverKey)`). With
  `MIDTRANS_SERVER_KEY` empty, verification is skipped and the backend logs
  `… signature verification is DISABLED …` on every webhook call — that's
  the intentional local-with-no-Midtrans-configured path, made deliberately
  impossible to mistake for a working, verified webhook.
- **A scoped R2 API token failing `ListBuckets` is normal**, not a sign the
  credential is broken — a bucket-scoped token has no account-level
  permission for that call. The buckets it's actually scoped to (checked via
  `HeadBucket`/`Put`/`Get` by name) are the real signal.
- **Never put `127.0.0.1` in an R2 token's Client IP Filtering.** The filter
  matches the public source IP Cloudflare sees on the wire; loopback is
  never on that wire, so a `127.0.0.1` entry can never match, and an
  allowlist with no matching entry denies everything — indistinguishable
  from a revoked token.
