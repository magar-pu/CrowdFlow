"use client";

/**
 * lib/hooks/useHoldCountdown.ts
 *
 * Counts down a seat hold from its absolute deadline.
 *
 * Driven by the `expires_at` the backend returns on both POST /booking/holds
 * and GET /booking/holds/{token}, which is derived from the Redis key's own
 * TTL — so the number on screen cannot drift away from the moment the seats
 * actually go back on sale.
 *
 * The remaining time is derived from that deadline on every render rather than
 * decremented into state. A decrementing counter loses time whenever the tab is
 * backgrounded (browsers throttle setInterval to roughly once a minute) and
 * would keep showing time remaining on a hold that had already lapsed. Deriving
 * means throttling only slows the refresh rate, never the accuracy, and the
 * visibilitychange listener snaps the display back to the truth the instant the
 * tab returns.
 */

import { useEffect, useMemo, useRef, useState } from "react";

const TICK_MS = 1000;

export interface HoldCountdown {
  /** Whole seconds remaining, floored at zero. */
  seconds_left: number;
  /**
   * The deadline has passed. Always false when there is no hold to count, so
   * callers can treat this as "the hold you had is gone" rather than having to
   * separately check that one existed.
   */
  is_expired: boolean;
}

/**
 * @param expires_at RFC3339 from the hold, or null when nothing is held.
 * @param on_expire  Fired once, when the deadline passes with this hook
 *                   mounted. Not called for a hold that was already expired
 *                   before it arrived — that case belongs to whoever fetched
 *                   it. Use it to release local state; the seats themselves are
 *                   already gone server-side by the time it runs.
 */
export function useHoldCountdown(
  expires_at: string | null | undefined,
  on_expire?: () => void
): HoldCountdown {
  const deadline_ms = useMemo(() => {
    if (!expires_at) return null;
    const parsed = Date.parse(expires_at);
    return Number.isNaN(parsed) ? null : parsed;
  }, [expires_at]);

  const [now_ms, set_now_ms] = useState(() => Date.now());

  // Kept in a ref so a caller re-creating the callback each render doesn't tear
  // down and re-arm the interval.
  const on_expire_ref = useRef(on_expire);
  useEffect(() => {
    on_expire_ref.current = on_expire;
  });

  useEffect(() => {
    if (deadline_ms === null) return;

    let fired = false;
    const sync = () => {
      const now = Date.now();
      set_now_ms(now);
      if (!fired && now >= deadline_ms) {
        fired = true;
        on_expire_ref.current?.();
      }
    };

    const interval = setInterval(sync, TICK_MS);
    document.addEventListener("visibilitychange", sync);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [deadline_ms]);

  /*
    Derived here rather than stored, so a hold arriving (or being replaced)
    reports its own remaining time on the very first render. Holding it in state
    would leave one render showing the previous hold's value — and a zero left
    over from an expired hold would read as "this new hold is already expired".

    now_ms can trail real time by up to one tick before the interval catches up,
    which only ever overstates the time left. Erring that way is the safe
    direction: it can delay the expiry by under a second, never trigger one early.
  */
  const seconds_left =
    deadline_ms === null
      ? 0
      : Math.max(0, Math.ceil((deadline_ms - now_ms) / 1000));

  return {
    seconds_left,
    is_expired: deadline_ms !== null && seconds_left === 0,
  };
}
