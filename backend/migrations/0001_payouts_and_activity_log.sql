-- Adds real backing tables for the admin console's Payouts and Activity Log
-- features, which were previously served as stub endpoints (see
-- backend/internal/admin/service.go). No migration runner exists in this repo
-- (schema_migrations is unreferenced by any Go code) - apply manually, e.g.:
--   psql "$DATABASE_URL" -f backend/migrations/0001_payouts_and_activity_log.sql

BEGIN;

-- payouts -------------------------------------------------------------------
-- One row per settled/rejected organizer payout for an event. There is no
-- organizer-facing "request a payout" flow yet, so "pending" payouts are not
-- stored here - they're computed live in the repository as
-- (paid orders' net_amount for the event) minus (payouts already recorded for
-- that event), and only materialize into a real row once an admin processes
-- or rejects one. See PostgresRepository.ListPayouts/ProcessPayout/RejectPayout.

CREATE TYPE payout_status AS ENUM ('pending', 'processed', 'failed');

CREATE TABLE payouts (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id),
    amount NUMERIC(12,2) NOT NULL,
    status payout_status NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    processed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payouts_event_id ON payouts(event_id);
CREATE INDEX idx_payouts_status ON payouts(status);

-- activity_log ----------------------------------------------------------
-- General admin-action audit trail. Distinct from event_approval_log, which
-- only covers event approve/reject decisions. Populated from the admin
-- package's own mutating endpoints (grant role, approve/reject verification,
-- transaction status change, process/reject payout) - see repository.go's
-- recordActivity helper.

CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    actor_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    detail TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

COMMIT;
