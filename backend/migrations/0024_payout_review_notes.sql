-- Migration 0024: give a payout somewhere to keep its review notes
--
-- The payout detail screen has always offered two note fields — "Internal Notes
-- (not visible to organizer)" and "Organizer Notes (sent to organizer)" — but
-- `payouts` has no column for either. Approve and Reject stitched them into an
-- activity_log detail string, which is a log line, not a field you can read back
-- and edit.
--
-- Worse, GetPayout populated InternalNotes from COALESCE(oa.notes, '') — the
-- ORGANIZER APPLICATION's review notes. Those belong to the organizer, not the
-- payout, so the same text appeared on every payout that organizer ever
-- requested, and an auditor typing a note about one payout was looking at a
-- field describing something else entirely.
--
-- Defaults are '' rather than NULL: the console renders these straight into
-- textareas, and a NULL there is just an empty string with extra scan handling.

BEGIN;

ALTER TABLE payouts
    ADD COLUMN IF NOT EXISTS internal_notes  TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS organizer_notes TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN payouts.internal_notes IS
    'Auditor-only notes about this payout. Never returned to the organizer.';
COMMENT ON COLUMN payouts.organizer_notes IS
    'Notes shown to the organizer, e.g. why a payout was rejected or sent back.';

COMMIT;
