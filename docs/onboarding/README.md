# Onboarding

Start here. This is a genuine day-one path — prerequisites through "I can see
the app running and know it actually works" — written so you can follow it
start to finish without asking anyone a question. Commands are
copy-pasteable in **Git Bash** (this project is developed on Windows with Git
Bash + PowerShell; commands below assume Git Bash unless noted).

## 1. Prerequisites

| Tool | Version | Why |
|---|---|---|
| Docker Desktop | any recent | Runs the full stack; also needed for Redis/MinIO even if you develop with `npm run dev` |
| Go | 1.26.2+ | Backend |
| Node.js + npm | 20+ | Frontend |
| PostgreSQL client tools (`psql`, `pg_restore`) | 18.x to match the server | Database setup, migrations |
| Git | any recent | — |

You do **not** need a local PostgreSQL *server* necessarily on day one if you
have another way to reach one, but this project runs Postgres on the host
machine (not in Docker — see
[local-development.md](./local-development.md)), so installing PostgreSQL 18
locally is the path this guide assumes.

## 2. Clone

```bash
git clone <this-repo-url>
cd crowdflow
```

## 3. Create your `.env` files

Four files, three of them from an `.example` template. Do this now, before
anything else — several other steps assume these exist.

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

(There's no root `.env.example` step you can skip — the root `.env` is
required by `docker compose` even locally, for port numbers and the GHCR
image tag; see below.)

Now edit the two that need real values filled in:

**`backend/.env`** — at minimum:
- `DB_DSN` — point it at the Postgres you'll set up in the next step. For
  `npm run dev` + `go run main.go` (the day-to-day path), use
  `postgres://postgres:postgres@localhost:5432/crowdflow?sslmode=disable`
  — **not** the `host.docker.internal` default in the example file, which
  only resolves from inside a container.
- `JWT_SECRET` / `TICKETMAN_JWT_SECRET` — leave empty for local dev
  (`APP_ENV=local` has an insecure hardcoded fallback for both). Generate
  real values with `openssl rand -base64 48` before this ever leaves your
  machine.
- `NIK_ENC_KEY` — generate with `openssl rand -base64 32`; the app will
  error on any attendee-NIK write path without it, though it won't fail to
  boot.
- Everything else (Midtrans, Resend, R2/MinIO, Google OAuth) can stay empty
  for a first run — see [environment-configuration.md](./environment-configuration.md)
  for what each one silently does when unset (usually: that one feature is
  mocked/disabled, not a crash).

**`frontend/.env`** — can stay entirely empty for a first run. Only needed
if you're testing Midtrans checkout or Turnstile CAPTCHA specifically.

Full reference for every variable, which file it belongs in, and what's
build-time vs runtime: [environment-configuration.md](./environment-configuration.md)
— read it before your second session, not necessarily before your first.

## 4. Set up the database

There's no command that builds this schema from nothing — a base schema
dump exists, and the migration runner only ever adds to it.

```bash
createdb crowdflow
pg_restore -d crowdflow backend/db/crowdflow-1782101431-custom.sql
psql -d crowdflow -f backend/migrations/run_all.sql
```

(If `createdb`/`psql`/`pg_restore` aren't found, PostgreSQL's `bin/`
directory isn't on your `PATH` — add it, or invoke them by full path, e.g.
`/c/Program\ Files/PostgreSQL/18/bin/psql`.)

Notes on what just happened:
- `pg_restore` is required, not `psql -f` — despite one of the files in
  `backend/db/` having a `.sql` extension, both dump files in that directory
  are PostgreSQL's binary **custom format** (`pg_dump -Fc`), not plain SQL.
- This restores a real snapshot from 2026-07-06, including whatever
  users/events/roles existed on that date. You'll have pre-seeded reference
  data (roles, permissions, event types) and some historical rows you didn't
  create — that's expected, not a leak into your machine of anything
  sensitive; it's the project's own dev-era fixture data. You do not know
  those accounts' passwords and don't need to — register your own account in
  the next step.
- `run_all.sql` brings that 2026-07-06 snapshot up to the current schema (40
  migrations, some of which don't exist yet in the snapshot). It's safe to
  re-run at any time — see
  [operations/migrations-runbook.md](../operations/migrations-runbook.md).

## 5. Start Redis (and, optionally, MinIO)

The backend refuses to boot without Redis reachable:

```bash
docker compose up -d redis
```

Object storage (R2/MinIO) is not required to boot — only needed if you're
testing document/image upload. See
[local-development.md](./local-development.md#minio--local-object-storage)
if you want it running from day one.

## 6. First run

```bash
# terminal 1
cd backend
go run main.go

# terminal 2
cd frontend
npm install
npm run dev
```

Frontend: [http://localhost:3000](http://localhost:3000). Backend directly:
[http://localhost:8080](http://localhost:8080).

## 7. Verify it actually works

Health check:

```bash
curl http://localhost:8080/api/health
```

Expect: `{"success":true,"data":{"status":"ok","message":"CrowdFlow API is running"}}`
(if the DB is unreachable, this endpoint reports it as a 500 instead of
silently 200'ing — it pings the database on every call).

Register an account and log in (a cookie jar makes the login cookie usable
by the next curl call):

```bash
curl -c cookies.txt -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"ChangeMe123!","full_name":"Your Name"}'

curl -b cookies.txt -c cookies.txt http://localhost:8080/api/v1/auth/me
```

Expect the `/auth/me` call to return your account's `email`/`full_name` —
that confirms registration, login-cookie issuance, and session validation
all worked end to end. (No CAPTCHA token is required for either call in
local dev — Turnstile verification defaults to a pass when
`TURNSTILE_REQUIRED` isn't explicitly `"true"`.)

See an event (through the restored snapshot's data, or Path A's nginx if
you're running the full stack — direct-to-backend also works):

```bash
curl http://localhost:8080/api/v1/events
```

Expect a JSON array — non-empty if the restored dump's 2026-07-06 events are
still inside their sales window, which is unlikely given the date; an empty
array here is not a failure, it means nothing is currently on sale. Open
[http://localhost:3000/events](http://localhost:3000/events) in a browser to
see the same thing rendered.

If all three of those worked, your environment is set up correctly.

## 8. Where to go next

| I want to... | Go to |
|---|---|
| Understand day-to-day dev workflow, the two ways to run the stack, MinIO/Redis/Postgres specifics | [local-development.md](./local-development.md) |
| Look up any environment variable — which file, build-time vs runtime, per-host rules | [environment-configuration.md](./environment-configuration.md) |
| Understand the system architecture, how packages/routes are organized | `docs/architecture/` |
| Deploy, understand the CI/CD pipeline, roll back a release | `docs/operations/deployment.md` |
| Write or apply a database migration | `docs/operations/migrations-runbook.md` |
| Something is broken and you want to know if it's already a known issue | `docs/operations/troubleshooting.md` |
