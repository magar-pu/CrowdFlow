/**
 * lib/holdStorage.ts
 *
 * Where the current hold token is remembered, per event and per tab.
 *
 * A hold locks seats in Redis for 10 minutes, and the seat map reports locked
 * seats as "held" to everyone — including the buyer holding them. Without the
 * token, coming back to the map showed your own seats greyed out and
 * unselectable, and there was no way to reach them again until the hold
 * expired. Session-scoped because a hold belongs to one browsing session.
 *
 * Shared rather than owned by the seat map: checkout clears the token too when
 * a hold lapses under it, so both screens agree on what is still held.
 */

const holdStorageKey = (event_id: string) => `crowdflow:hold:${event_id}`;

export function readStoredHoldToken(event_id: string): string | null {
  if (typeof window === "undefined" || !event_id) return null;
  return window.sessionStorage.getItem(holdStorageKey(event_id));
}

export function storeHoldToken(event_id: string, token: string | null) {
  if (typeof window === "undefined" || !event_id) return;
  if (token) {
    window.sessionStorage.setItem(holdStorageKey(event_id), token);
  } else {
    window.sessionStorage.removeItem(holdStorageKey(event_id));
  }
}
