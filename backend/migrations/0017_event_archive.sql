-- 0017: archiving for terminal events.
--
-- Why a nullable timestamp and NOT a new event_status enum label:
-- archiving is orthogonal to where an event sits in the review pipeline. A
-- rejected event that is archived is still rejected — the auditor's verdict is
-- the status, and hiding it from a dashboard must not overwrite that. Adding an
-- 'archived' label would force every `status = 'rejected'` check in the codebase
-- (and the auditor's own queries) to learn about a value that carries no review
-- meaning, and would make the original verdict unrecoverable.
--
-- This exists because deletion is deliberately restricted to drafts: anything an
-- auditor has seen cascades into auditor_event_reviews / event_approval_log /
-- event_status_log, so erasing it would destroy the review trail. Archiving is
-- how an organizer clears a dead event without that.
--
-- Apply:
--   psql "$DB_DSN" -f backend/migrations/0017_event_archive.sql

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- The organizer's active lists filter on `archived_at IS NULL`, so index the
-- live rows only; archived events are read rarely and by explicit request.
CREATE INDEX IF NOT EXISTS idx_events_active
    ON events (organizer_id)
    WHERE archived_at IS NULL;
