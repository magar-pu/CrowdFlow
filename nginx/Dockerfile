# nginx/Dockerfile
#
# Bakes nginx.conf into the image instead of bind-mounting it from a git
# checkout on the VPS. Target end state (see docker-compose.yml's nginx
# service): the VPS holds only docker-compose.yml and .env, and a deploy is
# `docker compose pull && docker compose up -d` — no `git pull`, no repo
# checkout at all.
#
# This is NOT the VPS edge nginx that terminates TLS and separately caps
# uploads at 1MB in front of the whole stack — that config lives outside this
# repo and is untouched by this image.
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
