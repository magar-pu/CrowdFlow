-- Migration 0023: give payout_status the labels the application already writes
--
-- 0001 created the enum with three labels:
--   pending, processed, failed
--
-- but the repository has always written others. ApprovePayout writes
-- 'approved', RejectPayout writes 'rejected', HoldPayout writes 'on_hold' —
-- so EVERY payout action has failed at the database with
-- "invalid input value for enum payout_status". Not one payout has ever been
-- approved, rejected or held through the console.
--
-- Two things start working as a side effect, and both should be tested:
--   * GetPayout's duplicate check (SELECT ... WHERE status = 'approved') has
--     never been able to match, so that fraud alert has never fired.
--   * ListPayouts casts its filter to $n::payout_status, which errors today for
--     Approved / Rejected / On Hold.
--
-- 'need_revision' is added alongside them: a payout sent back to the organizer
-- is a different state from one held for investigation, the console already
-- offers them as separate actions with separate prompts, and collapsing the two
-- would leave the payouts list unable to tell them apart.
--
-- The resulting lifecycle:
--   pending -> approved -> processed        (money sent)
--           -> rejected                     (refused)
--           -> on_hold                      (auditor investigating)
--           -> need_revision                (organizer must supply something)
--
-- NOTE: no DML in this file, deliberately. Postgres permits
-- ALTER TYPE ... ADD VALUE inside a transaction, but the new value cannot be
-- USED in the same transaction ("unsafe use of new value"). Any backfill needs
-- its own migration. Nothing needs backfilling here: every existing row is
-- 'pending'.

BEGIN;

ALTER TYPE payout_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE payout_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE payout_status ADD VALUE IF NOT EXISTS 'on_hold';
ALTER TYPE payout_status ADD VALUE IF NOT EXISTS 'need_revision';

COMMIT;
