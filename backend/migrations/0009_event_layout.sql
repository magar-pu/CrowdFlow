-- 0009_event_layout.sql
-- Phase 4 (start): bind an event to a specific venue layout.
-- Nullable — an event may have no seating layout yet. ON DELETE SET NULL so
-- deleting a layout just unbinds any events using it rather than cascading.
-- Additive + idempotent, house style.
BEGIN;

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS layout_id INTEGER REFERENCES venue_layouts(id) ON DELETE SET NULL;

COMMIT;
