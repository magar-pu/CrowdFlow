-- Migration: 0008_venue_layouts.sql
-- Purpose: Persist the venue-editor seat maps. Adds a "saved plan" grouping
--          (venue_layouts) that owns decorative geometry as JSONB, and gives
--          physical seats real x/y coordinates while keeping them relational
--          so existing booking joins (GetSeatMap) stay intact.
-- Tables:  venue_layouts (new); seats, venue_sections (altered, additive only)
--
-- Design decisions baked in (see venue-editor backend plan):
--   1. Canonical seat identity stays the existing integer seats.id (orders /
--      tickets / scanner already reference it). No opaque string id is added.
--   2. Geometry split: decorative geometry (stage, facilities, blueprint ref,
--      section shapes) lives in venue_layouts.geometry JSONB; per-seat position
--      stays relational on seats (pos_x / pos_y).
--   3. seats.section_id becomes NULLABLE -- physical seats are section-free;
--      commercial grouping is event-scoped via event_sections.
--   4. seats.seat_status is DEPRECATED in favour of event_seats_matrix (status
--      is per-event, not per-physical-seat). Left in place here to avoid
--      breaking current reads; a later migration may drop it.

BEGIN;

-- A named, versioned saved plan for a venue. "public" plans are reusable across
-- events/organizers; "event_exclusive" plans are private to a single event.
CREATE TABLE IF NOT EXISTS venue_layouts (
    id              SERIAL PRIMARY KEY,
    venue_id        INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    schema_version  INTEGER NOT NULL DEFAULT 2,
    geometry        JSONB NOT NULL DEFAULT '{}'::jsonb,
    visibility      VARCHAR(20) NOT NULL DEFAULT 'public'
                        CHECK (visibility IN ('public', 'event_exclusive')),
    owner_user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'published', 'archived')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seats gain geometry + a layout, and are freed from requiring a section.
ALTER TABLE seats
    ADD COLUMN IF NOT EXISTS layout_id INTEGER REFERENCES venue_layouts(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS pos_x REAL,
    ADD COLUMN IF NOT EXISTS pos_y REAL;
ALTER TABLE seats ALTER COLUMN section_id DROP NOT NULL;

-- Sections carry decorative shape + colour and belong to a layout.
ALTER TABLE venue_sections
    ADD COLUMN IF NOT EXISTS layout_id INTEGER REFERENCES venue_layouts(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS shape JSONB,
    ADD COLUMN IF NOT EXISTS color VARCHAR(20);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_venue_layouts_venue       ON venue_layouts(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_layouts_owner       ON venue_layouts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_venue_layouts_visibility  ON venue_layouts(visibility);
CREATE INDEX IF NOT EXISTS idx_seats_layout              ON seats(layout_id);
CREATE INDEX IF NOT EXISTS idx_venue_sections_layout     ON venue_sections(layout_id);

COMMIT;
