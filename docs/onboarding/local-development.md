# Local development

There are two ways to run this stack locally. They are **not** interchangeable
in how they handle environment variables — see
[environment-configuration.md](./environment-configuration.md) for the full
picture. This doc covers *when* to use each and the operational details
(Postgres, Redis, MinIO) both of them share.

## The two ways to run, and when to use each

| | Full `docker compose` stack | `npm run dev` + local backend |
|---|---|---|
| Starts | frontend, backend, redis, nginx (all containerized) | Next dev server + `go run main.go`, both on the bare host |
| Env source for the 3 frontend runtime values | root `.env` → `docker-entrypoint.sh` → `window.__ENV__` | `frontend/.env`, read directly by Next |
| Frontend hot reload | No — you're running the production build | Yes — Next's dev server, fast refresh |
| Backend hot reload | No — rebuild the image to pick up a change | No either way; Go has no hot reload here — restart `go run main.go` |
| Access via | `http://localhost` (nginx, port 80) | `http://localhost:3000` (frontend directly) |
| Best for | Verifying the whole stack behaves like production/sandbox will, testing nginx routing itself, testing the Docker build | Day-to-day frontend or backend iteration — anything where you want to actually save a file and see it react |

**Use `npm run dev` + local backend for regular feature work.** It's faster
to iterate in, and — importantly — it needs *no* Docker image rebuild for a
frontend or backend code change. Reach for the full `docker compose` stack
when you specifically need to verify container/nginx/routing behavior, or
before handing off something that touches the Docker build itself.

You do not need to pick one exclusively — `backend/.env` and `frontend/.env`
are what `npm run dev` + local backend reads either way, so you can run that
path day-to-day and occasionally bring up the full stack to sanity-check.
Just be aware both stacks bind the same host ports (`3000`, `8080`) — stop
one before starting the other, or the second one's containers/process will
fail to bind.

## Path A — full `docker compose` stack

```bash
# from the repo root
docker compose up --build -d
```

`docker-compose.yml` alone is pull-only now (it exists to serve the VPS,
which never builds from source — see
[operations/deployment.md](../operations/deployment.md)). What actually
makes `--build` work locally is `docker-compose.override.yml`, which compose
auto-merges with **no extra flags** whenever it's present in the repo root —
that's a file you should already have from a normal clone, not something you
create yourself. If `--build` seems to do nothing and you get an
`error from registry: denied` instead, `docker-compose.override.yml` is
missing or you ran compose with an explicit `-f docker-compose.yml` (which
disables the auto-merge on purpose — see the deployment doc for why that
flag exists elsewhere).

Once it's up:

- Web app: [http://localhost](http://localhost) (via nginx, port 80)
- API health check: [http://localhost/api/health](http://localhost/api/health)
  or directly at [http://localhost:8080/api/health](http://localhost:8080/api/health)

`docker compose ps` shows **four** services: `frontend`, `backend`, `redis`,
`nginx`. Deliberately no Postgres — see below.

Stop with `docker compose down` (containers only; add `-v` only if you
intend to also wipe the Redis session volume, which is a mass logout for
every account — see the Gotchas section).

## Path B — `npm run dev` + local backend

```bash
# terminal 1 — backend
cd backend
go run main.go

# terminal 2 — frontend
cd frontend
npm install   # first time only
npm run dev
```

- Frontend dev server: [http://localhost:3000](http://localhost:3000)
- Backend directly: [http://localhost:8080](http://localhost:8080)

The frontend already has same-origin API rewrites configured
(`frontend/next.config.ts`) — any `/api/*` request the browser makes to
`localhost:3000` is proxied server-side to `http://localhost:8080` (the
`BACKEND_URL` env var overrides that target if you ever need to point it
elsewhere). You do **not** need to enable CORS or hand-configure a proxy for
this path to work.

Both `go run main.go` and `npm run dev` here read their config from
`backend/.env` and `frontend/.env` respectively (copy both from their
`.env.example`). `frontend/.env` is the ONLY place `NEXT_PUBLIC_*` matters
for this path — see
[environment-configuration.md](./environment-configuration.md) for why the
Docker path is different.

## Postgres runs on the HOST, not in Docker, either way

There is no `postgres` service in `docker-compose.yml`. Install Postgres
directly on your machine (this project runs Postgres 18) and point
`backend/.env`'s `DB_DSN` at it.

The DSN's hostname differs by which path you're running, and this is a real,
easy-to-hit trap:

| Running the backend... | `DB_DSN` host part |
|---|---|
| Inside a container (Path A) | `host.docker.internal` — Docker's own alias for "the host machine", resolvable *only from inside a container* |
| Directly on Windows (Path B, `go run main.go`) | `localhost` (or `127.0.0.1`) — `host.docker.internal` does not resolve from the bare Windows host, so a `go run` with that hostname in `DB_DSN` fails to connect |

`backend/.env.example`'s default (`host.docker.internal`) is written for
Path A. Running Path B, change it:

```
DB_DSN=postgres://postgres:postgres@localhost:5432/crowdflow?sslmode=disable
```

The database itself doesn't come from nothing — this repo's migration runner
(`backend/migrations/run_all.sql`) only ever adds to an *existing* schema.
See [operations/migrations-runbook.md](../operations/migrations-runbook.md)
for how to get a base schema onto a brand-new local Postgres install.

## Redis is required to boot, even for Path B

The backend pings Redis at startup with a 5-second timeout and calls
`log.Fatalf` if it can't connect — there's no "run without Redis" mode.
Redis holds every refresh-token session, every seat/GA hold, and backs the
rate limiters, so this isn't optional infrastructure even for a quick local
check.

For Path B (no full compose stack running), the simplest way to get a
reachable Redis is to start just that one service from the main compose
file:

```bash
docker compose up -d redis
```

`backend/.env`'s `REDIS_ADDR` defaults to `localhost:6379` if unset, which
matches that container's published port.

## MinIO — local object storage

Production and sandbox use Cloudflare R2; locally, MinIO stands in as an
S3-compatible service so you don't need real R2 credentials to develop
document/image upload.

```bash
docker compose -f docker-compose-minio.yml up -d
```

**This depends on the main stack's Docker network already existing.**
`docker-compose-minio.yml` declares `crowdflow_crowdflow-net` as an
`external: true` network — it does not create one — and that network is the
one `docker-compose.yml` creates under the project name `crowdflow`. If
you've never run `docker compose up` (even just `docker compose up -d
redis`, per the previous section) at least once in this repo, that network
won't exist yet and starting MinIO alone will fail with a "network not
found" error. Bring up any service from the main stack first (redis is the
cheapest), then start MinIO.

Once it's up:

- MinIO console: [http://localhost:9001](http://localhost:9001)
  (`minioadmin` / `minioadminpassword`)
- S3 endpoint: [http://localhost:9000](http://localhost:9000)
- Two buckets are auto-created: `crowdflow-public` (anonymously readable —
  event covers, avatars) and `crowdflow-private` (no anonymous access —
  identity documents, only reachable through a short-lived presigned URL the
  backend mints after an auth check)

`backend/.env`:

```ini
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadminpassword
S3_PUBLIC_BUCKET_NAME=crowdflow-public
S3_PRIVATE_BUCKET_NAME=crowdflow-private
S3_REGION=us-east-1
S3_PUBLIC_BASE_URL=http://localhost:9000/crowdflow-public
```

`S3_PUBLIC_BASE_URL` matters more than it looks: leave it empty and the
backend does **not** error — it silently falls back to
`http://localhost:9000/crowdflow-public` regardless of what you actually
set `S3_ENDPOINT` to, which only happens to be correct here because that IS
the local MinIO endpoint. On a deployed host this same silent fallback would
serve every image as a dead `localhost` link — set it explicitly there.

None of this (`S3_*`) is required for the backend to boot — unlike Postgres
and Redis, the S3 client is constructed lazily and only errors when an
upload/view actually happens, not at startup.

## Gotchas

- **A Redis `FLUSHDB` is a mass logout, not a debugging convenience.** Every
  refresh-token session lives there. Don't run it against a shared dev
  Redis without warning whoever else is testing against it.
- **The first `docker compose up -d` after any change to the `redis` service
  definition recreates that container once**, ending every existing session
  one time. Expected, not a bug — the named volume (`redis-data`) is what
  makes every *subsequent* restart NOT do this.
- **A signed-out `POST` request returns `403 CSRF_TOKEN_MISSING`, not
  `401`.** If you're testing an endpoint that's supposed to require login and
  you get a CSRF error instead of `UNAUTHORIZED`, that's expected — a
  browser with no session has no `csrf_token` cookie either, so the CSRF
  check rejects the request before auth middleware ever runs. `POST
  /auth/login` and `/auth/register` are themselves CSRF-exempt (there's no
  session yet to have a token from), so logging in works fine from a cold
  browser.
