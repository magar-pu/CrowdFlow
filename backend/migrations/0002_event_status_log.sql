-- Adds a per-event audit trail covering all four status transitions
-- (draft, pending_review, approved, rejected), not just approve/reject like
-- event_approval_log (whose decision column is CHECK-constrained to
-- 'approved'/'rejected' and so can't represent the other two). Additive -
-- event_approval_log and activity_log keep being written exactly as before.
-- No migration runner exists in this repo - apply manually, e.g.:
--   psql "$DATABASE_URL" -f backend/migrations/0002_event_status_log.sql

BEGIN;

CREATE TABLE event_status_log (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    actor_id INTEGER NOT NULL REFERENCES users(id),
    from_status event_status NOT NULL,
    to_status event_status NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_status_log_event ON event_status_log(event_id);

COMMIT;
