#!/bin/sh
# frontend/docker-entrypoint.sh
#
# Writes /app/public/env-config.js from the CONTAINER'S ACTUAL environment on
# every start, before `node server.js` runs. This is what makes one frontend
# image work in every environment: the three NEXT_PUBLIC_* values below used
# to be Docker build ARGs (see git history on frontend/Dockerfile), which
# meant a value change required a rebuild and the image itself was
# environment-specific.
#
# public/env-config.js is served as a plain static file by Next's standalone
# server (it never goes through App Router rendering), so writing it here at
# container start — rather than baking it in at `next build` time via a
# Server Component reading process.env — sidesteps a real trap: Next may
# statically prerender parts of the app at build time, in which case a
# process.env read baked into that output would freeze on whatever the BUILD
# machine's (e.g. CI, no real secrets) environment happened to have, not the
# running container's. A static file written fresh at container start has no
# such ambiguity.
#
# app/layout.tsx loads this file via next/script's strategy="beforeInteractive"
# — Next's own guarantee that it runs before any page JS, including the
# module-scope reads in the checkout page and Turnstile.tsx (see
# lib/runtimeEnv.ts) — which matters because Midtrans Snap and Cloudflare
# Turnstile both need their key before their own script loads; a lazy
# fetch-on-mount would race that.
set -e

node -e '
const fs = require("fs");

const env = {
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || "local",
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
};

// Fail LOUDLY in the container logs when a value is missing, rather than
// silently shipping a blank key the way the old build-arg mechanism shipped
// the literal string "undefined" whenever frontend/.dockerignore ate .env.
// Not a hard boot failure: local/dev images legitimately run with payments
// unconfigured, and lib/runtimeEnv.ts + the checkout page also surface this
// to the browser console / UI so it cannot pass unnoticed into a real deploy.
const missing = Object.keys(env).filter((k) => k !== "NEXT_PUBLIC_APP_ENV" && !env[k]);
if (missing.length > 0) {
  console.error(
    "[docker-entrypoint] WARNING: missing runtime env var(s): " + missing.join(", ") +
    " -- Midtrans and/or Turnstile will not work until these are set in the environment " +
    "this container was started with (see .env.example)."
  );
}

fs.writeFileSync("/app/public/env-config.js", "window.__ENV__ = " + JSON.stringify(env) + ";\n");
console.log("[docker-entrypoint] wrote /app/public/env-config.js (NEXT_PUBLIC_APP_ENV=" + env.NEXT_PUBLIC_APP_ENV + ")");
'

exec "$@"
