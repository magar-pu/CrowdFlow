# Troubleshooting

Real failures this project has actually hit, and their causes. If you're
debugging something and it looks like one of these, check the specific
diagnostic before assuming you've found something new.

## `error from registry: denied` when pulling a GHCR image

```
! Image ghcr.io/crowdflow/crowdflow-backend:latest   Interrupted
✘ Image ghcr.io/crowdflow/crowdflow-nginx:latest     Error error from registry: denied
```

**GHCR returns `denied` for both "this image doesn't exist" and "you don't
have permission to pull it" — the same error either way.** Do not assume
this is an auth problem first. In order of likelihood:

1. **`GHCR_OWNER`/`IMAGE_TAG` are unset or wrong**, so compose resolved the
   placeholder default (`ghcr.io/crowdflow/crowdflow-*:latest`), which was
   never pushed — this is the actual cause seen in this project. Check
   `.env` in the directory you're running compose from.
2. You're not logged in (`docker login ghcr.io`) and the package is
   private — see [deployment.md](./deployment.md#one-time-vps-setup).
3. The tag genuinely doesn't exist yet — a `dev` push hasn't finished its
   CI build, or you're referencing a `vX.Y.Z` tag that was never pushed.

If you're trying to run the stack **locally from source** and hit this,
you're missing `docker-compose.override.yml` or ran compose with an
explicit `-f docker-compose.yml` — see
[local-development.md](../onboarding/local-development.md#path-a--full-docker-compose-stack).

## Cold-start 502 from nginx

Historically caused by three compounding issues, all fixed in the current
`docker-compose.yml`/`nginx/nginx.conf`/`frontend/Dockerfile` — if you see
a 502 immediately after `docker compose up`, check these didn't regress
before assuming something new:

1. `depends_on` without `condition: service_healthy` only waits for a
   container to *start*, not for the app inside it to be *ready* — nginx
   would dial a port nothing was listening on yet. Every service here has a
   real `healthcheck:` and every `depends_on` uses
   `condition: service_healthy`.
2. A static nginx `upstream {}` block resolves an IP once at nginx startup
   and keeps using it — if `frontend`/`backend` ever restart with a new
   container IP, a static upstream keeps dialing the stale one. `nginx.conf`
   uses Docker's embedded DNS (`resolver 127.0.0.11 valid=10s;`) with
   per-request re-resolution instead.
3. Next's standalone `server.js` binds to `$HOSTNAME` if it's set, and
   Docker sets `HOSTNAME` to the container ID for every container — without
   `ENV HOSTNAME=0.0.0.0` in `frontend/Dockerfile`, the frontend was only
   listening on its own bridge IP, not `127.0.0.1`/`0.0.0.0`, so both a
   healthcheck and nginx itself would fail to reach it.

If you see `200 OK` through nginx but the wrong `content-type` (e.g. a CSS
chunk request returns HTML), that's a related-but-different bug: a
`proxy_pass` target built from an nginx **variable** silently disables
nginx's normal "replace the matched location prefix" URI rewriting. Fixed
here by passing `$request_uri` explicitly in both `location` blocks. `200
OK` is not sufficient verification for any reverse-proxy change — check the
actual response body/content-type too.

nginx's own config is now baked into its own image (`nginx/Dockerfile`), not
bind-mounted from disk — so the historical "the config file changed on disk
but the running container never reloaded it, because `docker compose up`
doesn't detect bind-mount content changes" failure mode no longer applies on
a GHCR-pulled deploy: a new image tag always forces container recreation.

## `NEXT_PUBLIC_*` values arriving empty in the browser

Check in this order:

1. **Is `window.__ENV__` populated at all?** Open devtools console — if
   `src/lib/runtimeEnv.ts` logged `[runtimeEnv] window.__ENV__ is missing`,
   the `/env-config.js` script either failed to load or ran after other page
   JS (shouldn't happen — it's loaded via `strategy="beforeInteractive"`,
   which is Next's guarantee against exactly this). Check the Network tab
   for `/env-config.js`'s response.
2. **Is the specific value empty inside `window.__ENV__`?** Check the
   container's own startup logs for
   `[docker-entrypoint] WARNING: missing runtime env var(s): ...` — that
   names exactly which one wasn't set in the container's environment. Trace
   it back to the host's root `.env` (Docker path) or `frontend/.env`
   (`npm run dev` path) — see
   [environment-configuration.md](../onboarding/environment-configuration.md).
3. **Is it set in the wrong file?** The single most common version of this:
   a real value lives in `frontend/.env`, but you're running the Docker
   path, which never reads that file for these three variables (deliberate
   — see the environment-configuration doc's shadowing-trap section). Set it
   in the root `.env` instead.

If it's specifically the Midtrans client key and you get this far, the
checkout page will refuse to open Snap and show the buyer "Payment is not
configured on this deployment" rather than silently trying — that message
confirms the diagnosis rather than a network/Midtrans-side issue.

## Midtrans requests failing with 401 vs 404

This tells you which gateway a key belongs to — see
[environment-configuration.md](../onboarding/environment-configuration.md#midtrans-sandbox-vs-production-keys)
for the full explanation. Short version:

```bash
curl -u "$MIDTRANS_SERVER_KEY:" \
  https://api.sandbox.midtrans.com/v2/any-unknown-order-id/status
```

- `404 "Transaction doesn't exist."` → the key **works** against that
  gateway (auth succeeded, the lookup just failed as expected for a
  made-up order id).
- `401 "Access denied due to unauthorized transaction…"` → the key does
  **not** belong to that gateway. Swap the host to `api.midtrans.com` and
  try again.

Do not conclude anything about a key's environment from its prefix (`SB-` or
otherwise) — see the same section for why that's unreliable in both
directions in this project specifically.

## R2 upload returns 403

Ranked by likelihood, checked in order:

1. **Token revoked or deleted** — denied on every bucket and every
   operation, including `HeadBucket`. A blanket denial like this means the
   credential itself isn't authorized at all, not a scoping issue.
2. **Token scoped to only one bucket** — the *other* bucket 403s while the
   scoped one works.
3. **Token is read-only** — `Get`/`List` succeed, `Put` 403s.
4. **Wrong bucket name or account endpoint** — R2 returns `403`, not `404`,
   for a bucket the token can't see, so a typo in the bucket name is
   indistinguishable from a real permission fault by symptom alone.
5. **Client IP Filtering configured on the token** — the classic "works on
   the VPS, 403s from a laptop." The filter matches the public source IP
   Cloudflare sees on the wire; a residential IP that rotates on router
   reboot causes an intermittent version of this. **Never put `127.0.0.1` in
   this filter** — loopback is never on the wire Cloudflare sees, so that
   entry can never match anything, and an allowlist with nothing matching
   denies everything.
6. **Clock skew / SigV4 signing** — this one does NOT show up as
   `AccessDenied`; it surfaces as `RequestTimeTooSkewed` or
   `SignatureDoesNotMatch` instead. If you're seeing one of those two
   specifically, it's not a permissions problem.

Two reasoning traps worth naming explicitly, both hit in this project
before:

- **`ExpiredRequest` proves nothing about whether the signature or
  permissions are valid** — S3/R2 check expiry *before* validating the
  signature, so an expired presigned URL tells you nothing else. Presigned
  document view URLs in this app are short-lived (2 minutes) — always
  re-test with a freshly-minted link before diagnosing anything else.
- **A database row existing is not proof an object was actually written to
  storage.** Every upload path in this codebase checks the storage error and
  returns *before* inserting the DB row — so if you're debugging "why can I
  see a document row but not the file," check the storage credential itself
  rather than trusting the DB row as evidence the upload succeeded.

`ListBuckets` failing is **normal** on a properly-scoped R2 token (no
account-level permission) and is not itself evidence of a problem — the
decisive checks are `HeadBucket`/`Put`/`Get` against the specific bucket by
name.

## A signed-out `POST` returns 403, not 401

If you expected `401 UNAUTHORIZED` from an endpoint that requires login and
got `403 CSRF_TOKEN_MISSING` instead, that's expected behavior, not a bug:
a browser with no session also has no `csrf_token` cookie, so the CSRF
double-submit check rejects the request before auth middleware ever runs.
Only `GET`/`HEAD`/`OPTIONS` and a short explicit list of bootstrap
endpoints (login, register, logout, forgot-password, send-otp,
reset-password, the payment webhook, ticket/resale/scanner routes) skip CSRF
checking.

## A Redis `FLUSHDB` is a mass logout, not a debugging convenience

Every refresh-token session, every seat/GA hold, and the rate limiters all
live in Redis. Running `FLUSHDB` against a shared Redis (staging, or a
dev machine other people are testing against) logs out every account on
every device with no warning. If you need to clear application state during
debugging, target specific keys, not the whole database.

Related: the **first** `docker compose up -d` after any change to the
`redis` service definition in `docker-compose.yml` recreates that container
and ends every existing session once — expected, one-time, not a bug. The
named `redis-data` volume is what prevents this on every *subsequent*
restart; only an explicit `docker compose down -v` removes it (and is
itself a mass logout).

## Migration run_all.sql aborts partway through

Check whether every file it references with `\ir` actually exists in the
repo — a migration can be fully and correctly registered in `run_all.sql`
(both the adopt-list entry and the apply step) and still be missing if the
`.sql` file itself was never committed. This has happened in this exact
project: see
[migrations-runbook.md](./migrations-runbook.md#the-newest-failure-mode--a-registered-migration-file-that-was-never-committed)
for the specific incident and how to check for it.

## Where to look next

If none of the above matches what you're seeing:
[migrations-runbook.md](./migrations-runbook.md) and
[deployment.md](./deployment.md) cover their respective areas in more depth,
and [environment-configuration.md](../onboarding/environment-configuration.md)
is the place to check if the symptom looks at all env-var-shaped.
