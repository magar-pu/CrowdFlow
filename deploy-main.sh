#!/bin/bash

# Production deployment. Sibling of deploy-dev.sh, which does the same for
# the sandbox stack off the dev branch — keep the two in step when either
# changes.
#
# Run from the production checkout's DIRECTORY (/var/www/crowdflow-production/app),
# which after the GHCR migration holds ONLY docker-compose.yml and .env — no
# git checkout, no source, no compiler. Normally run by the Deployment
# workflow after a tag push is approved (see
# .github/workflows/deploy-pipeline.yaml), which exports IMAGE_TAG (the
# vX.Y.Z tag it just promoted) and GHCR_OWNER into this script's environment.
#
# Deliberately does NOT touch the database. This repo has no migration runner
# and some migrations are destructive, so schema changes are applied by hand —
# check backend/migrations against the production DB before promoting a
# release that needs one.
#
# Rollback: edit IMAGE_TAG in .env to an older tag (or export it before
# calling this script, same as the workflow does) and re-run this script — no
# git, no rebuild.

# Exit on error, on unset variables, and on any failure inside a pipeline.
set -euo pipefail

echo "🚀 Starting production deployment..."

# Fail loudly if this is not the checkout we expect, rather than pulling
# whatever docker-compose.yml happens to be in the current directory.
if [ ! -f docker-compose.yml ]; then
  echo "❌ No docker-compose.yml here ($(pwd)). Run this from the production checkout." >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "❌ No .env here ($(pwd)). This host needs one with IMAGE_TAG, GHCR_OWNER and the rest of .env.example." >&2
  exit 1
fi

# If the caller (the CI workflow, or a human doing a manual promote) exported
# IMAGE_TAG/GHCR_OWNER, persist them into .env so the running config on disk
# always reflects what's actually deployed — a later plain re-run of this
# script with no exported override, or a manual rollback by hand-editing
# .env, both then just work.
if [ -n "${IMAGE_TAG:-}" ]; then
  echo "📌 Pinning IMAGE_TAG=$IMAGE_TAG into .env"
  if grep -q '^IMAGE_TAG=' .env; then
    sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=$IMAGE_TAG|" .env
  else
    echo "IMAGE_TAG=$IMAGE_TAG" >> .env
  fi
fi
if [ -n "${GHCR_OWNER:-}" ]; then
  if grep -q '^GHCR_OWNER=' .env; then
    sed -i "s|^GHCR_OWNER=.*|GHCR_OWNER=$GHCR_OWNER|" .env
  else
    echo "GHCR_OWNER=$GHCR_OWNER" >> .env
  fi
fi

echo "🔖 Deploying image tag $(grep '^IMAGE_TAG=' .env | cut -d= -f2-)"

# Every compose call below names docker-compose.yml explicitly with -f. Do
# NOT drop this flag: an unqualified `docker compose ...` auto-merges any
# docker-compose.override.yml sitting in this directory (compose does this
# with no opt-in), and that override file (committed for local dev, see its
# own header comment) puts `build:` back on every service. Without -f here, a
# stray override file on this box — this host may still hold a git checkout
# mid-migration — would make a "deploy" silently start compiling Go/Next on
# the production box instead of pulling the image CI already built and
# tested. -f is what makes that impossible regardless of what else is in
# this directory, not just unlikely.
echo "📥 Pulling images..."
docker compose -f docker-compose.yml pull

echo "🏗️ Starting containers..."
docker compose -f docker-compose.yml up -d

echo "🧹 Cleaning up old unused images..."
docker image prune -f

echo "✅ Deployment completed successfully!"
