#!/bin/bash

# Production deployment. Sibling of deploy-dev.sh, which does the same for the
# sandbox checkout off the dev branch — keep the two in step when either changes.
#
# Run from the production checkout (/var/www/crowdflow-production/app), normally
# by the Deployment workflow after a push to main is approved.
#
# Deliberately does NOT touch the database. This repo has no migration runner and
# some migrations are destructive, so schema changes are applied by hand — check
# backend/migrations against the production DB before promoting a release that
# needs one.

# Exit on error, on unset variables, and on any failure inside a pipeline.
set -euo pipefail

echo "🚀 Starting production deployment..."

# Fail loudly if this is not the checkout we expect, rather than rebuilding
# whatever happens to be in the current directory.
if [ ! -f docker-compose.yml ]; then
  echo "❌ No docker-compose.yml here ($(pwd)). Run this from the production checkout." >&2
  exit 1
fi

# Make sure we are on the main branch
git checkout main

echo "📥 Pulling latest changes from origin/main..."
git pull origin main

echo "🔖 Deploying $(git rev-parse --short HEAD) — $(git log -1 --format=%s)"

echo "🏗️ Rebuilding and starting Docker containers..."
# Using -d to run containers in the background (detached mode)
docker compose up --build -d

# force rebuilds the nginx
docker compose up -d --force-recreate --no-deps nginx

echo "🧹 Cleaning up old unused images..."
docker image prune -f

echo "✅ Deployment completed successfully!"
