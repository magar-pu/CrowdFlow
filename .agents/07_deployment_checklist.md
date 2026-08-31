# 07. Deployment Checklist

Run through this before and after every deploy to sandbox or production. It is
written to be reusable; the section at the end lists what is specific to the
2026-08-30 dynamic-QR + ticketman release.

**Order matters.** Env first, then migrations, then the deploy, then nginx, then
smoke tests. A step that says STOP means do not continue until it passes.

---

## 1. Environment variables

The `backend/.env.production.example` and `.env.sandbox.example` files are
**partial overlays**. They contain only `APP_ENV`, the Midtrans keys, and the
newer required keys. They have no `JWT_SECRET` and no `DATABASE_URL`.

> **Merge these keys into the host's existing `backend/.env`. Do NOT copy the
> file over it** — that produces an env with no database and no JWT secret, and
> the backend will not boot.

### 1.1 Keys the backend refuses to boot without

`main.go` calls `log.Fatalf` for each of these when unset and `APP_ENV != local`.
A missing key is a container that restart-loops, not a degraded feature.

| Key | Value | Notes |
|---|---|---|
| `JWT_SECRET` | 32-byte random, base64 | pre-existing |
| `TICKETMAN_JWT_SECRET` | 32-byte random, base64 | **new.** Must NOT equal `JWT_SECRET`, and must differ between sandbox and production |
| `FRONTEND_URL` | the real public origin, no trailing slash | **new.** e.g. `https://crowdflow.id` |

Generate a secret:

```sh
openssl rand -base64 32
```

**Why `TICKETMAN_JWT_SECRET` must be its own value:** `aud` is validated nowhere
in this codebase. A ticketman token signed with the platform key would be
accepted by every ordinary authenticated route, with the staff id read as a user
id. A separate signing key makes that impossible by construction.

**Why `FRONTEND_URL` is not optional:** every e-ticket email link is built from
it, and since the PDF and the QR image were removed that link is the only way a
buyer reaches their ticket. It is also what stops the password-reset flow
trusting an attacker-supplied `Host` header. Unset, it used to silently produce
`http://localhost:3000` links — dead links delivered to real customers.

### 1.2 Optional but recommended

| Key | Value | Notes |
|---|---|---|
| `ALLOWED_FRONTEND_ORIGINS` | comma-separated origins | fallback allowlist when `FRONTEND_URL` is unset; with `FRONTEND_URL` set it is not consulted |
| `TICKETMAN_ACCESS_TOKEN_TTL` | default `12h` | one event shift |
| `NIK_ENC_KEY` | base64, decodes to exactly 32 bytes | **required if attendee NIK capture is live.** Never share across environments |

### 1.3 Local / docker-compose

`FRONTEND_URL` for the compose stack is `http://localhost` — **no port** — which
matches `NGINX_PORT=80` in the root `.env`. Not `:3000` (that is the bare-metal
`npm run dev` port) and not `:8080`. Local Google OAuth also requires the origin
to be exactly `http://localhost`.

`FRONTEND_URL` deliberately does **not** live in `docker-compose.yml`'s
`environment:` block. That block overrides `env_file:` wholesale, which is how a
stray `DEV_MODE=true` once pinned production into dev mode for a month.

### 1.4 Verify

```sh
# on the host, after editing backend/.env
grep -E '^(JWT_SECRET|TICKETMAN_JWT_SECRET|FRONTEND_URL|DATABASE_URL|APP_ENV)=' backend/.env
```

STOP if any is missing or if `TICKETMAN_JWT_SECRET` equals `JWT_SECRET`.

---

## 2. Database migrations

Every migration needs **two** entries in `backend/migrations/run_all.sql` — the
adopt list and the apply step — keyed by filename, never by number (0008, 0011
and 0014 are each reused twice in this repo's history). See
`.agents/05_database_migrations.md`.

### 2.1 Back up first, always

```sh
pg_dump -Fc -d "$DATABASE_URL" -f crowdflow-$(date +%Y%m%d-%H%M%S).dump
```

### 2.2 Apply

`run_all.sql` is idempotent: it adopts pre-existing schema and only applies what
is missing.

```sh
psql -d "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/run_all.sql
```

### 2.3 Verify the ledger

```sql
SELECT count(*) FILTER (WHERE 1=1) AS total_recorded FROM crowdflow_migrations;
SELECT version FROM crowdflow_migrations ORDER BY version DESC LIMIT 8;
```

If someone applied a migration by hand instead of through `run_all.sql`, the
ledger is out of sync — re-run `run_all.sql` to register it.

---

## 3. Selective data wipe (clean slate) — DESTRUCTIVE

Only when deliberately clearing an environment. Keeps users, roles, permissions,
event types, venues, venue layouts and seats; wipes events, orders, tickets and
everything downstream.

> ### READ BEFORE RUNNING ON PRODUCTION
>
> 1. **`events` must be `DELETE`d, never `TRUNCATE`d.** `user_roles.event_id`
>    has an `ON DELETE CASCADE` FK to `events`. `TRUNCATE events CASCADE` does
>    not row-match — it empties the **entire** `user_roles` table, including
>    every `super_admin` row.
> 2. **There is no super-admin bootstrap in this codebase.** No CLI, no
>    migration, no env seeding. `user_roles` rows are only ever written by an
>    already-authenticated admin. Losing them is a permanent console lockout on
>    that environment until someone hand-writes SQL.
> 3. **`CASCADE` is deliberately omitted** from the `TRUNCATE` below so that an
>    unlisted dependent table fails loudly. If it errors naming a table, add
>    that table to the wipe side. **Never add `CASCADE` to make the error go
>    away.**
> 4. This **orphans every object in R2**. Bucket cleanup is driven by the
>    application on document replace/delete; a direct SQL wipe bypasses it
>    entirely, so the objects are left with no row pointing at them.
> 5. Keeping users while wiping `organizer_applications` means **every organizer
>    must re-apply and re-upload their documents**.
> 6. On production this deletes real paid orders and issued tickets. Confirm
>    that is intended, and that the backup in step 2.1 exists and restores.

### 3.1 Dry run first

Run the whole block with `ROLLBACK` instead of `COMMIT`. The `RAISE NOTICE`
prints the exact list of tables it would truncate — read it.

### 3.2 The script

```sql
BEGIN;

DO $$
DECLARE
  keep text[] := ARRAY[
    'users','user_profiles','user_roles','roles','permissions','role_permissions',
    'event_types','venues','venue_layouts','seats','venue_sections',
    'schema_migrations','crowdflow_migrations',
    'events'   -- NOT kept: DELETEd below, because user_roles references it
  ];
  tbls text;
BEGIN
  SELECT string_agg(format('%I', tablename), ', ')
    INTO tbls
    FROM pg_tables
   WHERE schemaname = 'public' AND NOT (tablename = ANY(keep));
  RAISE NOTICE 'truncating: %', tbls;
  EXECUTE 'TRUNCATE TABLE ' || tbls || ' RESTART IDENTITY';
END $$;

DELETE FROM user_roles WHERE event_id IS NOT NULL;   -- platform rows have event_id IS NULL
DELETE FROM events;                                   -- DELETE, not TRUNCATE
ALTER SEQUENCE IF EXISTS events_id_seq RESTART WITH 1;
```

The keep list is a **complement**, so any table not named above is wiped. New
tables are therefore picked up automatically — including `order_attendees`,
`booking_access_log`, `event_staff`, `event_staff_gates` and `event_staff_tiers`.

### 3.3 Verify BEFORE `COMMIT`

`platform_roles_kept` **must be greater than zero.** If it is 0, `ROLLBACK`.

```sql
SELECT (SELECT count(*) FROM users)                                AS users_kept,
       (SELECT count(*) FROM user_roles WHERE event_id IS NULL)    AS platform_roles_kept,
       (SELECT count(*) FROM venue_layouts)                        AS layouts_kept,
       (SELECT count(*) FROM seats)                                AS seats_kept,
       (SELECT count(*) FROM event_types)                          AS categories_kept,
       (SELECT count(*) FROM events)                               AS events_left;
```

Then `COMMIT;`

### 3.4 After committing

Log back in immediately and confirm the admin console still opens. If roles were
lost, restore from the backup — there is no in-app recovery.

---

## 4. nginx

There are **two** nginx configs and only one is in this repo.

| Layer | File | Limit |
|---|---|---|
| compose stack | `nginx/nginx.conf` (in repo) | `20m` / `12m` |
| **VPS host edge** | **not in this repo**, e.g. `/etc/nginx/sites-available/<site>` | **`1m` (the default)** |

The effective ceiling is the smallest of the two. While the edge stays at `1m`,
every application limit above it is fiction — the edge returns nginx's own HTML
413 before the request reaches Go, so **nothing appears in the backend logs** and
editing the repo's config changes nothing.

```nginx
# host nginx, http block or the /api location — must be >= maxUploadRequestBytes
client_max_body_size 12m;
```

```sh
sudo nginx -t && sudo systemctl reload nginx
```

Verify from **outside** the host — a request that does not traverse the edge does
not exercise the limit:

```sh
curl -s -o /dev/null -w '%{http_code}\n' -F "file=@some-2mb-file.pdf" https://<host>/api/...
```

Full detail in `.agents/06_upload_limits_and_edge_nginx.md`.

---

## 5. Object storage (R2)

- Confirm the Access Key ID and Secret in `backend/.env` are current. Only those
  two values are used — a Cloudflare **API token value goes nowhere**.
- `ListBuckets` failing is **normal** for a bucket-scoped token; it is not a
  broken credential.
- Never put `127.0.0.1` in Cloudflare's Client IP Filtering — it locks the
  server out.
- Free tier is 10GB. Per-document-type upload caps and client-side image
  compression exist to keep that from being consumed by a handful of uploads.

---

## 6. Deploy

```sh
docker compose up --build -d
```

Then confirm the backend actually came up rather than restart-looping:

```sh
docker compose ps
docker compose logs --tail=50 backend
```

A `Fatalf` on a missing env var appears here and nowhere else.

---

## 7. Post-deploy smoke tests

Run against the deployed origin, not localhost.

**Auth**
- [ ] Sign in with email/password.
- [ ] Sign in with Google — confirm the redirect lands on the real origin.
- [ ] Request a password reset; confirm the emailed link points at the real
      origin and not at `localhost` or any other host.

**Buying**
- [ ] Event page lists tiers and the buy CTA is enabled.
- [ ] A seated event renders its map; a **no-seating-plan event lists its GA
      tiers and they are selectable**.
- [ ] Complete a Midtrans sandbox purchase.
- [ ] Ticket issued: one per attendee, not one per order.
- [ ] E-ticket email arrives, link only, and opens the booking page.

**Ticket + gate**
- [ ] Booking page renders a QR that visibly rotates (20s step).
- [ ] `/ticketman/login` accepts email + password + event code.
- [ ] Scan a valid ticket → `VALID`; scan it again → `ALREADY_USED`.
- [ ] A ticket from another event → `WRONG_EVENT`.
- [ ] A tier the staff member is not granted → `WRONG_TIER`, **and the ticket
      still scans as valid at the correct gate afterwards**.

**Uploads**
- [ ] Upload a document larger than 1MB through `/business` — this is the edge
      nginx check, and it must not 413.

---

## Release-specific: 2026-08-30 dynamic QR + ticketman

New required env: `TICKETMAN_JWT_SECRET`, `FRONTEND_URL`.
New migrations: `0032_order_attendees`, `0033_booking_access_log`,
`0036_event_staff`, `0037_ticket_checkins_scanner_logs_event_staff`.

Removed surfaces — expect 404s if anything still calls them:
`GET /tickets/{id}/vault`, `POST /tickets/{id}/request-otp`,
`POST /tickets/{id}/verify-otp`, `GET /tickets/{id}/qr`, the scanner device
registration routes, and the admin `/events/{id}/scanners` routes.

One-time consideration: tickets issued before this release may carry a
`secret_key` in the old md5-hex form rather than base32. The count was 0 on the
local database, which says nothing about an environment holding real paid
orders. Check where the real data is:

```sql
SELECT count(*) FROM tickets
 WHERE secret_key IS NOT NULL
   AND secret_key !~ '^[A-Z2-7]+$';
```

If that returns rows, those tickets will not scan and need their secret rotated.
