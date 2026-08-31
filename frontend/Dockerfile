# Dependencies installation
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# building the app
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG BACKEND_URL
ENV BACKEND_URL=$BACKEND_URL

# NEXT_PUBLIC_APP_ENV / NEXT_PUBLIC_MIDTRANS_CLIENT_KEY /
# NEXT_PUBLIC_TURNSTILE_SITE_KEY are deliberately NOT build args here any
# more. They used to be, which meant Next inlined them into the client bundle
# at `npm run build` and the resulting image only worked for one environment
# (and, before the args existed at all, frontend/.dockerignore excluding .env
# meant every containerised deploy shipped the literal string "undefined" as
# the client key). They are now read at container START, not build time — see
# docker-entrypoint.sh, which writes them into public/env-config.js from the
# actual runtime environment, and src/lib/runtimeEnv.ts, which the client
# bundle reads that from via window.__ENV__. One image now serves every
# environment; changing one of these three values is a container restart with
# a different env var, not a rebuild.
RUN npm run build

# prod run engine
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs

ENV NODE_ENV=production
ENV PORT=3000
# Next's standalone server.js binds to $HOSTNAME if set, and Docker sets
# HOSTNAME to the container ID for every container - without this it only
# listens on its own bridge IP, never on 127.0.0.1/0.0.0.0.
ENV HOSTNAME=0.0.0.0

EXPOSE 3000
# Writes public/env-config.js from the live container environment, then execs
# into the CMD below — see docker-entrypoint.sh for why this replaced the
# build-arg mechanism.
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]

