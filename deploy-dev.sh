#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment..."

# Make sure we are on the dev branch
git checkout dev

echo "📥 Pulling latest changes from origin/dev..."
git pull origin dev

echo "🏗️ Rebuilding and starting Docker containers..."
# Using -d to run containers in the background (detached mode)
docker compose up --build -d

# force rebuilds the nginx
docker compose up -d --force-recreate --no-deps nginx

echo "🧹 Cleaning up old unused images..."
docker image prune -f

echo "✅ Deployment completed successfully!"
