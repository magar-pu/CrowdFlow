-- Migration 0025: record WHO verified a bank account, and when
--
-- 0022 added bank_verification_status and bank_details_updated_at, but nothing
-- recording the verification itself. There were only ever two writers of that
-- status: the reset to 'unverified' when an organizer edits their details, and
-- 0022's one-time backfill. No runtime path set 'verified', so the flag was a
-- one-way door that only SQL could clear.
--
-- Adding the endpoint without these columns would mean an auditor could
-- authorise the destination of every future payout for an organizer and leave
-- no record of having done it. That is the one thing this flag exists to
-- establish.
--
-- Both are nullable: rows backfilled as 'verified' by 0022 were verified by
-- nobody, and inventing an actor for them would fabricate an audit trail.
-- A 'verified' row with a NULL bank_verified_by therefore means "grandfathered
-- in by 0022", which is exactly what happened and is worth being able to see.
--
-- ON DELETE SET NULL: an auditor's account being removed must not delete the
-- payout history, and must not silently reassign the verification to nobody in
-- a way that looks deliberate.

BEGIN;

ALTER TABLE organizer_applications
    ADD COLUMN IF NOT EXISTS bank_verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS bank_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN organizer_applications.bank_verified_by IS
    'Auditor who confirmed the current account. NULL on rows grandfathered by 0022.';

COMMIT;
