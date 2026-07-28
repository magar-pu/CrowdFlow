-- Migration 0029: per-event Google Maps link
--
-- The buyer's event page builds its "Open in Google Maps" link from a search on
-- the venue name and address. That resolves the wrong pin often enough to be a
-- problem for venues with a generic name or an address that maps ambiguously,
-- and the organizer had no way to correct it.
--
-- Scoped to the event, not the venue, on purpose. `venues` is a shared global
-- catalogue with no ownership column: every organizer sees every venue and
-- inline creation dedupes by name+city across all of them. A writable URL there
-- would let any organizer change a link rendered on another organizer's public
-- event page. Event scope costs a re-entry per event and owns nothing shared.
--
-- NULL and '' both mean "no link set" — the client falls back to the search URL.
-- The host allowlist (google.com/maps, goo.gl, maps.app.goo.gl, waze.com) is
-- enforced in the handler rather than by a CHECK constraint, so the rejection
-- reaches the organizer as a validation message they can act on.

BEGIN;

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

COMMIT;
