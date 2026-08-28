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

# Every NEXT_PUBLIC_* below must be an ENV, not just an ARG, before the build
# runs: Next reads process.env at build time and inlines these into the client
# bundle, and an ARG alone is not visible to the build process.
#
# They have to arrive here as build args because frontend/.dockerignore excludes
# .env, so `COPY . .` above never brings the real values into the image. Setting
# them at runtime (compose `env_file:`) does nothing — the bundle is already
# built by then. Changing any of these therefore requires a rebuild, not a
# restart.
ARG NEXT_PUBLIC_APP_ENV
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
ARG NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
ENV NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=$NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

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

USER nextjs

ENV NODE_ENV=production
ENV PORT=3000
# Next's standalone server.js binds to $HOSTNAME if set, and Docker sets
# HOSTNAME to the container ID for every container - without this it only
# listens on its own bridge IP, never on 127.0.0.1/0.0.0.0.
ENV HOSTNAME=0.0.0.0

EXPOSE 3000
CMD ["node", "server.js"]

