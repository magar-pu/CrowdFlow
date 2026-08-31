-- Migration: 0032_order_attendees.sql
-- Purpose: capture per-attendee identity at checkout so ticket issuance can
-- stop guessing. order_items (0011) already carries the per-tier breakdown
-- of an order; this adds the per-seat / per-GA-unit attendee rows that sit
-- underneath it, one row per ticket that will eventually be issued.
--
-- NIK is stored encrypted (nik_enc, AES-GCM — see internal/nik) and is never
-- written or logged in plaintext.
--
-- THIS MIGRATION ALONE DOES NOT FINISH THE JOB. It is pure DDL: it adds
-- attendee_nik_enc but does not populate it, and does not touch the existing
-- plaintext tickets.attendee_nik column. AES-GCM keyed by an application
-- secret (NIK_ENC_KEY) cannot run inside psql/run_all.sql, and inlining the
-- key into a pgcrypto call would put it in psql history and query logs —
-- worse than the plaintext column being replaced. After this migration is
-- applied, run the Go one-shot backfill:
--
--   go run ./backend/cmd/backfill_nik
--
-- which encrypts every non-null tickets.attendee_nik into attendee_nik_enc
-- and only then nulls attendee_nik (encrypt-then-null, never the reverse).
-- It is idempotent — safe to re-run, rows already migrated are skipped.

BEGIN;

CREATE TABLE IF NOT EXISTS order_attendees (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id               UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_tier_id         INT NOT NULL REFERENCES ticket_tiers(id),
    -- NULL for general admission; set for assigned seating.
    event_seats_matrix_id  INT REFERENCES event_seats_matrix(id),
    full_name              VARCHAR(255) NOT NULL,
    nik_enc                BYTEA NOT NULL,
    email                  VARCHAR(255) NOT NULL,
    phone                  VARCHAR(30) NOT NULL,
    dob                    DATE NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_attendees_order_id ON order_attendees(order_id);

-- attendee_full_name, attendee_email, attendee_phone and attendee_nik
-- (plaintext!) already exist on tickets from an earlier, untracked change.
-- attendee_phone is untouched (already the right shape). attendee_nik is
-- being retired in favour of attendee_nik_enc: this migration only adds the
-- new column, cmd/backfill_nik moves the data and nulls attendee_nik, and
-- the plaintext column is then left in place (permanently null) rather than
-- dropped, so nothing currently reading it can break by surprise. Only the
-- genuinely new columns are added here:
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attendee_nik_enc BYTEA;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attendee_dob DATE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS nik_purged_at TIMESTAMPTZ;

COMMIT;
