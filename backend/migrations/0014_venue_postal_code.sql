-- Migration: 0014_venue_postal_code.sql
-- Purpose: Complete the venue address so the organizer create wizard can
--          capture a structured address instead of one free-text blob. The old
--          wizard wrote the same string into venues.name, venues.address AND
--          venues.city at once (organizer/repository.go:1167-1171), which minted
--          a duplicate venue row on every typo — and duplicates break the
--          venue-designer handoff, because venue_layouts.venue_id (0008) and
--          events.layout_id (0009) key off venues(id), so an event bound to a
--          junk duplicate can never select the layouts saved against the real
--          venue.
--
-- Tables:  venues (altered, additive only)
--
-- Design decisions baked in:
--   1. postal_code only. No latitude/longitude and no external place id: venue
--      entry is plain text, with no maps provider involved. If a map or
--      geocoding is ever added, that is its own migration.
--   2. Nullable, because the existing rows have no postal code and many
--      Indonesian addresses are written without one.
--   3. Existing rows (including the magic 'Virtual Venue' row this release
--      stops creating) are left untouched — they are FK-referenced by live
--      events.
--
-- Additive + idempotent, house style.
BEGIN;

ALTER TABLE venues
    ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

COMMIT;
