# Deployment

## The model

Three images — `crowdflow-backend`, `crowdflow-frontend`, `crowdflow-nginx`
— are built by CI and pushed to GHCR (`ghcr.io/<owner>/crowdflow-{backend,
frontend,nginx}`). Neither VPS host (sandbox or production) builds from
source; both only ever run `docker compose pull && docker compose up -d`
against images CI already built. This is what makes "sandbox tested it, so
production is running the same bits" actually true, rather than aspirational
— see below for why that guarantee needed the NEXT_PUBLIC_* runtime-config
change to hold for the frontend image specifically.

```
push to dev branch   -> build + push  :sha-<short>   -> sandbox auto-deploys
git tag vX.Y.Z + push -> PROMOTE that exact :sha-<short> to :vX.Y.Z (no rebuild)
                                                       -> production deploys, behind approval
```

Workflow file: `.github/workflows/deploy-pipeline.yaml`.

## Why promotion is a retag, not a rebuild

On a `git tag vX.Y.Z` push, the `promote-production` job does **not** invoke
`docker build`. It runs `docker buildx imagetools create --tag
ghcr.io/.../crowdflow-<image>:vX.Y.Z ghcr.io/.../crowdflow-<image>:sha-<short-of-the-tagged-commit>`
— a registry-side manifest copy. Rebuilding from source for the "production"
image, even from identical source, would quietly reintroduce "sandbox and
production technically ran different bits" as a possibility (different base
image layers pulled at a different time, different builder cache state,
etc.) — retagging removes that possibility entirely, by construction.

**This only finds the source image if the tagged commit was already built
via a `dev` push.** In practice: tag the exact commit that was already
pushed to `dev` (a fast-forward merge from `dev` to `main` keeps the commit
SHA identical, so the `sha-<short>` tag from the `dev` build still matches).
Tagging a brand-new merge commit that was never itself pushed to `dev` will
make this job **fail loudly** — image not found — rather than silently
falling back to building it. That's deliberate: a silent rebuild-on-tag
would defeat the entire point of promotion being a retag.

## Rollback

Set `IMAGE_TAG` in the host's `.env` to an older tag and re-run the deploy
script (or just `docker compose -f docker-compose.yml pull && docker compose
-f docker-compose.yml up -d` directly) — no rebuild, no `git pull`, no CI
run required. Both deploy scripts also accept `IMAGE_TAG`/`GHCR_OWNER` as
exported environment variables (which is how the CI workflow drives them)
and persist whatever value they're given back into that host's `.env`, so a
later bare re-run without an override just redeploys the same tag again.

## The `-f docker-compose.yml` guard, and why it exists

Both deploy scripts invoke every compose command as `docker compose -f
docker-compose.yml ...`, never a bare `docker compose ...`. This is not
stylistic — **do not simplify it away.**

`docker-compose.override.yml` exists in this repo (committed, for local
development — see [local-development.md](../onboarding/local-development.md))
and restores `build:` on all three services so `docker compose up --build`
works from source on a developer's machine. Compose auto-merges any
`docker-compose.override.yml` present in the working directory with **no
flag required** — that's normally a convenience, but on a VPS host it's a
live hazard: as of this writing, both VPS hosts still hold a git checkout of
this repo (mid-migration to the target "holds only `docker-compose.yml` and
`.env`" layout). If the override file is present there — via a `git pull`,
or simply because the checkout was never cleaned up — an unqualified
`docker compose up -d` run on that host would silently start **compiling Go
and Next on the production box**, exactly the behavior this whole workstream
exists to remove, and nobody would notice until the box was visibly busy
compiling.

An explicit `-f docker-compose.yml` disables override auto-merging
regardless of what else happens to be sitting in that directory. That's the
actual guard — not "the VPS doesn't have the file," which isn't reliably
true today and shouldn't be relied on even once the checkouts are gone.

## One-time VPS setup

Each host (sandbox, production) needs:

1. **GHCR authentication.** Recommended: a classic Personal Access Token
   scoped to `read:packages` only, on an account with access to this
   repo/org, then once per host:
   ```bash
   docker login ghcr.io -u <username> -p <PAT>
   ```
   This persists in that host's Docker credential store and is not a
   per-deploy step. (The alternative — making the GHCR packages public — was
   considered and rejected: this is a production business app, and public
   packages would let anyone pull images containing internal env var names
   and API shapes, even with no code secrets inside them.)
2. **`.env`** in the deploy directory, containing at minimum:
   - `GHCR_OWNER`, `IMAGE_TAG` (see `.env.example`) — the deploy script
     overwrites `IMAGE_TAG` when CI passes one, but the file needs *some*
     value the first time.
   - `NGINX_PORT` / `BACKEND_PORT` / `FRONTEND_PORT` if this host runs more
     than one stack (prod + sandbox) side by side.
   - `APP_ENV`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`,
     `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — the frontend's three runtime values,
     per-host, read by the frontend container at start (see
     [environment-configuration.md](../onboarding/environment-configuration.md)).
3. **`backend/.env`**, hand-maintained on the host — merge in the relevant
   overlay (`backend/.env.sandbox.example` or
   `backend/.env.production.example`) rather than copying it over the
   existing file (the overlay files intentionally omit `DB_DSN`/`JWT_SECRET`
   /etc. — copying wholesale produces a broken environment). Both overlay
   files now include `TICKETMAN_JWT_SECRET` — confirm it's actually set on
   each host; `main.go` fatals on boot without it outside `APP_ENV=local`.
4. **Migrations are not run by any deploy script** — apply
   `backend/migrations/run_all.sql` against the host's database by hand,
   before deploying a release that needs it. See
   [migrations-runbook.md](./migrations-runbook.md).

### Migrating a host still holding a git checkout

Both VPS hosts predate this GHCR-only layout. To finish moving one over:
`git pull` one last time to receive the deploy-script changes, run the
`docker login` step above, add `GHCR_OWNER`/`IMAGE_TAG` to that host's
`.env`, and the *next* deploy from CI will pull instead of build. The git
checkout itself has no further functional dependency once that's done — the
deploy scripts never touch git again — but removing it is a deliberate,
host-side, destructive step for whoever operates that host to do
intentionally, not something either deploy script does automatically.

## GitHub repository settings required

- **`production` environment**, with required reviewers configured (Settings
  → Environments → New environment → `production`, add reviewers). This is
  what pauses `deploy-production` for approval. Without this environment
  existing, that job runs unpaused.
- **Settings → Actions → General → Workflow permissions** must allow "Read
  and write permissions." The workflow's own `permissions: packages: write`
  declaration is necessary but not sufficient — if the repo-level setting is
  read-only, the built-in `GITHUB_TOKEN` still can't push to GHCR even
  though the workflow YAML asked for write access.
- **`SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_PORT`** secrets — pre-existing,
  used by both deploy jobs' SSH steps. No new secrets are needed for the
  GHCR push itself; it authenticates with the automatically-provided
  `GITHUB_TOKEN`.

## Build caching

The `build` job (triggered by a `dev` push) uses GitHub Actions' own cache
backend (`cache-from: type=gha` / `cache-to: type=gha,mode=max`), scoped per
image, so repeated builds of the same image reuse layers across runs. The
`promote-production` job needs no cache at all — it's a registry API call,
not a build.

## Verifying the pipeline is what's actually deployed

- Workflow: `.github/workflows/deploy-pipeline.yaml`
- `deploy-dev.sh` / `deploy-main.sh` are the two scripts the workflow SSHes
  in and runs — read them directly on a host to see exactly what a deploy
  does; there's no hidden step.
- A host's currently-running tag is whatever `IMAGE_TAG=` reads in that
  host's `.env` — that file is the source of truth for "what's live," and
  the deploy scripts keep it in sync with every deploy (see Rollback above).
