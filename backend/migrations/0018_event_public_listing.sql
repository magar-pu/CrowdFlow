-- 0018: organizer-controlled public listing.
--
-- Until now `status = 'approved'` meant "publicly listed" — an auditor's
-- approval put the event on sale immediately, with no step the organizer
-- controlled. This splits the two: approval is the auditor's verdict, and
-- published_at is the organizer's decision to go on sale.
--
-- Same reasoning as 0017's archived_at: this is NOT a new event_status label.
-- An unpublished event is still 'approved' — the auditor's verdict must survive
-- the organizer toggling their listing off and on, and every existing
-- `status = 'approved'` check keeps its meaning.
--
-- Apply:
--   psql "$DB_DSN" -f backend/migrations/0018_event_public_listing.sql

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;

-- BACKFILL, and it is not optional. The public list query becomes
-- `status = 'approved' AND published_at IS NOT NULL`; without this every
-- already-approved event would silently disappear from the public site the
-- moment this ships. Approved events are live today, so they are published.
UPDATE events
SET published_at = COALESCE(updated_at, created_at, now())
WHERE status = 'approved' AND published_at IS NULL;

-- Supports the public browse query, which reads only listed events.
CREATE INDEX IF NOT EXISTS idx_events_public_listed
    ON events (event_start)
    WHERE published_at IS NOT NULL AND archived_at IS NULL;
