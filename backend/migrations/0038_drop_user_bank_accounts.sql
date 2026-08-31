-- Migration 0038: drop user_bank_accounts — buyer bank accounts are dead code
--
-- WHY THE TABLE GOES
--
-- user_bank_accounts (id, user_id, bank_name, account_number,
-- account_holder_name, is_verified, verified_at, created_at, updated_at) held
-- BUYER bank accounts, added by the deleted backend/internal/bankaccount
-- package via POST /api/users/me/bank-accounts. Buyers never pay by bank
-- transfer here — Midtrans (backend/internal/payment/) is the only inbound
-- payment path — so nothing in the checkout/payment flow ever read this
-- table. It existed to let a buyer save an account number that nothing used.
--
-- ORGANIZER payout details are a different table and are UNAFFECTED by this
-- migration: bank_name/bank_account_holder/bank_account_number live on
-- organizer_applications (migration 0003), with verification state on
-- bank_verification_status / bank_verified_by / bank_verified_at (migrations
-- 0022, 0025). That is now the single source for "where does payout money
-- go" — see backend/internal/auditor/repository.go, the payout-destination
-- query resolved there and nowhere else.
--
-- THE BUG THIS REMOVES
--
-- Before this change, the auditor payout screen's bank-resolution query
-- PREFERRED a user_bank_accounts row over organizer_applications when one
-- existed for the same user_id, and displayed that row's is_verified as the
-- account's verification state. But no code path anywhere in backend/internal
-- ever wrote user_bank_accounts.is_verified — Create() always inserted
-- whatever zero-value the caller passed, and no service ever set it true —
-- so an organizer's payout account read "unverified" forever regardless of
-- what an auditor did on the (correct) verification endpoint. Worse, because
-- the preferred row and the verified row could be different tables entirely,
-- an auditor's "verify" action could confirm an account that was not the one
-- being displayed. Both bugs are structural to the table's existence, not
-- fixable by patching the query, which is why it is dropped rather than
-- reconciled.
--
-- SAFETY: ROW COUNT IS UNKNOWN OUTSIDE LOCAL
--
-- Only the local database has been checked (0 rows). Sandbox and production
-- counts are UNCONFIRMED. A bare DROP TABLE would silently destroy any data
-- an operator has not yet verified is disposable, so this migration refuses
-- to run if the table is not empty: it raises an exception naming the row
-- count instead of dropping. If that exception fires:
--
--   1. Do NOT re-run this migration to force it through.
--   2. Inspect the rows: SELECT * FROM user_bank_accounts;
--   3. Confirm with the team whether that data is genuinely orphaned (no
--      buyer-facing feature has read this table since the bankaccount
--      package was deleted) or whether it needs to be exported first.
--   4. Once confirmed disposable, either truncate it by hand and re-run this
--      file, or replace this file's guard with an explicit archival step —
--      do not just delete the check.
--
-- Idempotent: to_regclass makes the whole migration a no-op once the table is
-- gone (either because this migration already ran, or because it never
-- existed on this database), so it is safe to replay.

BEGIN;

DO $$
DECLARE
    row_count BIGINT;
BEGIN
    IF to_regclass('public.user_bank_accounts') IS NULL THEN
        RETURN;
    END IF;

    EXECUTE 'SELECT count(*) FROM public.user_bank_accounts' INTO row_count;

    IF row_count > 0 THEN
        RAISE EXCEPTION 'user_bank_accounts has % row(s) — refusing to drop. '
            'This table''s row count was never confirmed on this database '
            'before 0038 was written. Inspect the rows, confirm with the '
            'team whether they are disposable, then either truncate by hand '
            'and re-run this migration or replace its guard with an '
            'explicit archival step. See the header comment in '
            '0038_drop_user_bank_accounts.sql.', row_count;
    END IF;

    DROP TABLE public.user_bank_accounts;
END $$;

COMMIT;
