-- Migration 0039: add 'snap' to payment_method — the label was stranded outside migrations/
--
-- backend/db/sql/01_alter_enum.sql held exactly one statement:
--   ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'snap';
-- It lived outside backend/migrations/ and had zero references in run_all.sql,
-- so it never ran for any database built through the runner. Only the local
-- database had it, applied by hand. Any database built from run_all.sql alone
-- was missing 'snap' and broke at order creation the moment a Snap payment was
-- attempted, with Postgres refusing the row as an invalid enum label. This
-- migration is that statement, wired into the runner, so run_all.sql is once
-- again the single source of truth for schema — backend/db/sql/01_alter_enum.sql
-- is deleted in the same change.
--
-- 'snap' does not mean "the buyer chose Snap" — payment/service.go:386 hardcodes
-- PaymentType to "snap" for every transaction regardless of the buyer's actual
-- method (mapSnapPaymentTypes narrows the enabled payment channels within that
-- one Snap transaction instead). So this label records which Midtrans
-- INTEGRATION created the transaction, not which method the webhook reports
-- back — every order created through this backend carries it.
--
-- NOTE: no DML in this file, deliberately, mirroring 0023. PostgreSQL permits
-- ALTER TYPE ... ADD VALUE inside a transaction, but the new value cannot be
-- USED in the same transaction ("unsafe use of new value"). Nothing here
-- depends on the label until this script ends.

BEGIN;

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'snap';

COMMIT;
