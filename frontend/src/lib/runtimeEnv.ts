/**
 * lib/runtimeEnv.ts
 *
 * Runtime (not build-time) config for the three NEXT_PUBLIC_* values the
 * client bundle needs before a third-party script loads (Midtrans Snap,
 * Cloudflare Turnstile). One frontend image now serves every environment —
 * see frontend/Dockerfile and frontend/docker-entrypoint.sh — so these can no
 * longer be `process.env.NEXT_PUBLIC_*` reads, which Next inlines into the
 * bundle at `npm run build` and freezes for the life of the image.
 *
 * The entrypoint script writes /app/public/env-config.js from the
 * container's actual environment on every start, and app/layout.tsx loads it
 * via next/script's `strategy="beforeInteractive"` — Next's own guarantee
 * that a script runs before any page JS (including this module's top-level
 * consts) executes. That beats a lazy fetch-on-mount: a fetch is async, and
 * a value that arrives even one tick late means Snap/Turnstile already
 * started loading against the wrong (or no) key — the exact bug this
 * migration exists to prevent, just moved from build time to a render-time
 * race instead of removed.
 */

export interface RuntimeEnv {
  NEXT_PUBLIC_APP_ENV: string;
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: string;
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: string;
}

declare global {
  interface Window {
    __ENV__?: Partial<RuntimeEnv>;
  }
}

const EMPTY_ENV: RuntimeEnv = {
  NEXT_PUBLIC_APP_ENV: "local",
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: "",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
};

let warned = false;

/**
 * Reads window.__ENV__. Safe to call at module scope in a "use client" file
 * (the read sites this exists for already do) — during SSR/build
 * `window` doesn't exist yet, so this returns EMPTY_ENV; every consumer is a
 * client component that only acts on the value after mount, by which point
 * the real browser-side call re-evaluates and gets the actual config.
 *
 * Fails loudly rather than silently: a missing window.__ENV__ (the
 * entrypoint script didn't run, or the beforeInteractive script tag failed
 * to load) logs a console.error naming the exact cause, instead of quietly
 * handing back `undefined` the way the old build-arg mechanism did.
 */
export function getRuntimeEnv(): RuntimeEnv {
  if (typeof window === "undefined") return EMPTY_ENV;

  if (!window.__ENV__ && !warned) {
    warned = true;
    console.error(
      "[runtimeEnv] window.__ENV__ is missing. Either /env-config.js failed to load " +
        "(check the network tab) or frontend/docker-entrypoint.sh did not run before " +
        "`node server.js` started. Midtrans/Turnstile keys and APP_ENV will read as blank " +
        "until this is fixed — do not treat a blank client key as normal."
    );
  }

  const env = window.__ENV__;
  return {
    NEXT_PUBLIC_APP_ENV: env?.NEXT_PUBLIC_APP_ENV || EMPTY_ENV.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: env?.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: env?.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
  };
}
