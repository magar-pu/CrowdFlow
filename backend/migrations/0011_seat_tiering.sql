-- Migration: 0011_seat_tiering.sql
-- Purpose: Replace section-based seat grouping with per-seat ticket tiering.
--
-- Model (locked 2026-07-22):
--   * A venue layout is a REUSABLE TEMPLATE: pure geometry (seats + positions,
--     stage, facilities, decorative zone outlines). No tiers, no colouring.
--   * Ticket-tier grouping is EVENT-SCOPED and per-seat.
--
-- Sections existed only as the indirection letting a reusable layout map onto
-- event-specific ticket_tiers. Templates are now deliberately untiered, so the
-- indirection has no job.
--
-- THIS IS LOSSLESS: event_seats_matrix already carries ticket_tier_id NOT NULL
-- on every row, so the tier is already per-seat. event_section_id and the whole
-- event_sections table are redundant middleware. Verify with:
--   SELECT seat_id, ticket_tier_id FROM event_seats_matrix WHERE event_id = <id>;
-- before and after — the rows must be identical.
--
-- DESTRUCTIVE AND IRREVERSIBLE. Restore db/sql/crowdflow-1782101431.sql onto a
-- scratch database and verify the zone backfill below before applying anywhere
-- shared. Apply 0010_organizer_delegations.sql first.

BEGIN;

-- 1. Preserve decorative zone outlines.
--
-- venue_sections.shape / .color (added by 0008) are the coloured polygons drawn
-- behind the seats. They carry no commercial meaning under the new model, so
-- they move into the layout's existing decorative blob alongside the stage and
-- facilities. This MUST run before the table is dropped.
--
-- Only sections that actually belong to a layout and have geometry are carried
-- over; legacy venue-scoped sections (layout_id IS NULL) were never drawable.
UPDATE venue_layouts vl
SET geometry = jsonb_set(
        COALESCE(vl.geometry, '{}'::jsonb),
        '{zones}',
        COALESCE(z.zones, '[]'::jsonb),
        true
    )
FROM (
    SELECT layout_id,
           jsonb_agg(
               jsonb_build_object(
                   'name',  section_name,
                   'color', color,
                   'shape', shape
               )
           ) AS zones
    FROM venue_sections
    WHERE layout_id IS NOT NULL
      AND shape IS NOT NULL
    GROUP BY layout_id
) z
WHERE z.layout_id = vl.id;

-- 2. Drop the section indirection.
--
-- event_seats_matrix.event_section_id is NOT NULL and FK-bound to event_sections,
-- so the column goes before the table.
ALTER TABLE event_seats_matrix DROP COLUMN IF EXISTS event_section_id;
DROP TABLE IF EXISTS event_sections;

-- 3. Physical seats are geometry only; commercial grouping is per-event.
-- 0008 already made this nullable on the way to exactly this state.
ALTER TABLE seats DROP COLUMN IF EXISTS section_id;

-- 4. venue_sections is now unreferenced: layouts keep zones in JSONB, and the
-- legacy admin venue-section CRUD is removed in the same change.
DROP TABLE IF EXISTS venue_sections;

-- 5. Buyer seat maps colour seats by their ticket tier, so the tier needs one.
ALTER TABLE ticket_tiers ADD COLUMN IF NOT EXISTS color VARCHAR(20);

COMMIT;
