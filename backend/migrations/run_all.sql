-- run_all.sql — apply every migration that has not been applied yet.
--
--   psql "$DB_DSN" -f backend/migrations/run_all.sql
--
-- Safe to run repeatedly. Nothing already recorded in crowdflow_migrations is
-- re-executed, and the script reports what it did at the end.
--
-- \ir resolves relative to THIS file, not the shell's working directory, so it
-- runs from anywhere. Requires psql 9.6+ for \if (this project is on 18).
--
--
-- WHY A LEDGER RATHER THAN JUST RE-RUNNING EVERYTHING
--
-- Most migrations here are written with IF NOT EXISTS and could be replayed,
-- but not all of them, so "just run them all" corrupts or fails:
--
--   * 0001/0002/0003/0004/0010 use bare CREATE TABLE / CREATE TYPE / CREATE
--     INDEX. A second run is a hard error.
--   * 0006 uses bare ALTER TYPE ... ADD VALUE. A second run is a hard error.
--   * 0004 seeds notifications with an UNGUARDED INSERT. A second run silently
--     duplicates those rows — the failure mode that leaves no error behind.
--
-- So the ledger is not bookkeeping, it is the correctness mechanism.
--
--
-- WHY THE VERSION KEY IS A FILENAME, NOT A NUMBER
--
-- Three numbers are used twice: 0008 (scanner_system, venue_layouts), 0011
-- (qr_ticket_tokens, seat_tiering) and 0014 (dynamic_ticket_v2,
-- venue_postal_code). Keying on the number would record one and silently skip
-- its twin forever. Files are applied in filename order, which is the order
-- below.
--
--
-- ADOPTING A DATABASE THAT IS ALREADY MIGRATED
--
-- Every existing database predates this runner and already has most of these
-- applied, so a first run must not replay them. When the ledger is EMPTY, the
-- adopt step below probes for each migration's artifact and records the ones
-- already present without executing them. A genuinely fresh database has no
-- artifacts, so nothing is adopted and everything runs.
--
-- Adoption is deliberately gated on an empty ledger rather than running every
-- time. Left unguarded, a future migration whose column someone had already
-- added by hand would be marked applied and its data backfill skipped.
--
-- Adoption is sound because each migration file is atomic, so a present
-- artifact means the file completed — with EIGHT exceptions that have no
-- BEGIN/COMMIT of their own: 0005, 0006, 0007, 0008_scanner_system, 0013,
-- 0015, 0017, 0018. If one of those ever fails midway it is left part-applied
-- and is NOT recorded; fix it by hand before re-running.
--
--
-- THIS DOES NOT BUILD A DATABASE FROM NOTHING
--
-- 0001 already references users(id) and events(id). The base schema is not in
-- this directory (see backend/db/). Point this at a database that has one.

-- WHY THE LEDGER IS NOT CALLED schema_migrations
--
-- That name is already taken. This database carries an abandoned
-- `schema_migrations` table from some earlier tool — columns
-- (id, migration_name, batch, applied_at), two rows from 2026-06-24 naming
-- `0001_initial_schema.up.sql` and `0002_testing_migration_table.up.sql`,
-- neither of which exists in this directory. No Go code references it.
--
-- Reusing that name is actively unsafe: CREATE TABLE IF NOT EXISTS would
-- silently accept the foreign table, and its two stale rows would make the
-- "is the ledger empty" probe answer NO — skipping adoption and re-running
-- 0001 against a fully migrated database. That is exactly what happened on the
-- first test run of this script.
--
-- The old table is left untouched rather than dropped; it belongs to whoever
-- created it, and deleting it is not this script's decision to make.

\set ON_ERROR_STOP on
\timing off

CREATE TABLE IF NOT EXISTS crowdflow_migrations (
    version    TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    note       TEXT
);

COMMENT ON TABLE crowdflow_migrations IS
    'Applied migration ledger, keyed by FILENAME because three version numbers are reused. Written by backend/migrations/run_all.sql.';

\echo ''
\echo '=== crowdflow migrations ==='

-- ---------------------------------------------------------------------------
-- Adopt step: only when the ledger is empty.
-- ---------------------------------------------------------------------------

SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations) AS do_adopt \gset

\if :do_adopt
\echo 'Ledger empty — probing for migrations already applied to this database.'

-- Probe helpers. pg_temp is session-scoped and disappears on disconnect, so
-- this leaves nothing behind. to_regclass/to_regtype return NULL instead of
-- raising when the object is absent, which is what makes them usable here.
CREATE OR REPLACE FUNCTION pg_temp.tbl(t text) RETURNS boolean AS
$$ SELECT to_regclass(t) IS NOT NULL $$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION pg_temp.col(t text, c text) RETURNS boolean AS
$$ SELECT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = t AND column_name = c) $$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION pg_temp.enum_has(e text, v text) RETURNS boolean AS
$$ SELECT EXISTS (SELECT 1 FROM pg_enum
                   WHERE enumtypid = to_regtype(e) AND enumlabel = v) $$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION pg_temp.con(n text) RETURNS boolean AS
$$ SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = n) $$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION pg_temp.nullable(t text, c text) RETURNS boolean AS
$$ SELECT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = t AND column_name = c
                     AND is_nullable = 'YES') $$ LANGUAGE sql;

INSERT INTO crowdflow_migrations (version, note)
SELECT v, 'adopted: artifact already present' FROM (VALUES
    ('0001_payouts_and_activity_log.sql',                 pg_temp.tbl('public.payouts')),
    ('0002_event_status_log.sql',                         pg_temp.tbl('public.event_status_log')),
    ('0003_organizer_applications.sql',                   pg_temp.tbl('public.organizer_applications')),
    ('0004_notifications.sql',                            pg_temp.tbl('public.notifications')),
    ('0005_auditor_tables.sql',                           pg_temp.tbl('public.auditor_event_reviews')),
    ('0006_add_needs_revision_and_business_fields.sql',   pg_temp.enum_has('application_status', 'needs_revision')),
    ('0007_update_auditor_reviews_schema.sql',            pg_temp.col('auditor_event_reviews', 'assigned_auditor_name')),
    ('0008_scanner_system.sql',                           pg_temp.tbl('public.scanner_devices')),
    ('0008_venue_layouts.sql',                            pg_temp.tbl('public.venue_layouts')),
    ('0009_event_layout.sql',                             pg_temp.col('events', 'layout_id')),
    ('0010_organizer_delegations.sql',                    pg_temp.tbl('public.organizer_delegations')),
    ('0011_qr_ticket_tokens.sql',                         pg_temp.tbl('public.ticket_tokens')),
    ('0011_seat_tiering.sql',                             pg_temp.col('ticket_tiers', 'color')),
    ('0012_auditor_revision_responses.sql',               pg_temp.col('auditor_revisions', 'organizer_comment')),
    ('0013_event_needs_revision_and_notification_resource.sql', pg_temp.col('notifications', 'resource_type')),
    ('0014_dynamic_ticket_v2.sql',                        pg_temp.tbl('public.ticket_access_otps')),
    ('0014_venue_postal_code.sql',                        pg_temp.col('venues', 'postal_code')),
    ('0015_event_venue_optional.sql',                     pg_temp.nullable('events', 'venue_id')),
    ('0016_event_documents.sql',                          pg_temp.tbl('public.event_documents')),
    ('0017_event_archive.sql',                            pg_temp.col('events', 'archived_at')),
    ('0018_event_public_listing.sql',                     pg_temp.col('events', 'published_at')),
    ('0019_revision_document_changelog.sql',              pg_temp.col('auditor_revisions', 'organizer_documents_changed')),
    ('0020_revision_status_vocabulary.sql',               pg_temp.con('auditor_revisions_status_check')),
    ('0021_ticket_tier_sales_window.sql',                 pg_temp.con('ticket_tiers_sales_window_check')),
    ('0022_organizer_bank_verification.sql',              pg_temp.col('organizer_applications', 'bank_verification_status')),
    ('0023_payout_lifecycle_status.sql',                  pg_temp.enum_has('payout_status', 'on_hold')),
    ('0024_payout_review_notes.sql',                      pg_temp.col('payouts', 'internal_notes')),
    ('0025_bank_verification_actor.sql',                  pg_temp.col('organizer_applications', 'bank_verified_by')),
    ('0026_organizer_document_versions.sql',              pg_temp.col('organizer_documents', 'is_current')),
    ('0027_organizer_document_gate.sql',                  pg_temp.col('organizer_applications', 'document_gate_exempt')),
    ('0028_payout_review_checks.sql',                     pg_temp.tbl('public.payout_review_checks')),
    ('0029_event_google_maps_url.sql',                    pg_temp.col('events', 'google_maps_url')),
    ('0030_event_max_tickets_per_order.sql',              pg_temp.col('events', 'max_tickets_per_order')),
    ('0031_organizer_document_file_metadata.sql',         pg_temp.col('organizer_documents', 'file_name')),
    ('0032_order_attendees.sql',                          pg_temp.tbl('public.order_attendees')),
    ('0033_booking_access_log.sql',                       pg_temp.tbl('public.booking_access_log')),
    ('0036_event_staff.sql',                              pg_temp.tbl('public.event_staff')),
    ('0037_ticket_checkins_scanner_logs_event_staff.sql',  pg_temp.col('ticket_checkins', 'event_staff_id')),
    -- 0038 DROPS user_bank_accounts, so its artifact is ABSENCE, not presence
    -- — the inverse of every other probe here. This is sound under the same
    -- rule as the rest of adoption: the migration is a no-op when the table
    -- is already gone, so marking it adopted on an empty-ledger database that
    -- has no such table (never existed, or already dropped by hand) is
    -- correct either way — running it later would do nothing.
    ('0038_drop_user_bank_accounts.sql',                  NOT pg_temp.tbl('public.user_bank_accounts')),
    ('0039_payment_method_snap.sql',                      pg_temp.enum_has('payment_method', 'snap')),
    ('0040_inventory_db_backstop.sql',                     pg_temp.tbl('public.idx_tickets_one_per_seat')
                                                             AND pg_temp.con('ticket_tiers_tickets_sold_within_allocation'))
) AS probe(v, present)
WHERE present
ON CONFLICT (version) DO NOTHING;

\echo 'Adopted:'
SELECT count(*) AS already_applied FROM crowdflow_migrations WHERE note LIKE 'adopted%';
\else
\echo 'Ledger present — applying only what is missing.'
\endif

-- ---------------------------------------------------------------------------
-- Apply step. One block per migration, in filename order.
-- ---------------------------------------------------------------------------

\set f '0001_payouts_and_activity_log.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0001_payouts_and_activity_log.sql'
\ir 0001_payouts_and_activity_log.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0002_event_status_log.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0002_event_status_log.sql'
\ir 0002_event_status_log.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0003_organizer_applications.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0003_organizer_applications.sql'
\ir 0003_organizer_applications.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0004_notifications.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0004_notifications.sql'
\ir 0004_notifications.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0005_auditor_tables.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0005_auditor_tables.sql  (no BEGIN/COMMIT — not atomic)'
\ir 0005_auditor_tables.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0006_add_needs_revision_and_business_fields.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0006_add_needs_revision_and_business_fields.sql  (no BEGIN/COMMIT — not atomic)'
\ir 0006_add_needs_revision_and_business_fields.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0007_update_auditor_reviews_schema.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0007_update_auditor_reviews_schema.sql  (no BEGIN/COMMIT — not atomic)'
\ir 0007_update_auditor_reviews_schema.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0008_scanner_system.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0008_scanner_system.sql  (no BEGIN/COMMIT — not atomic)'
\ir 0008_scanner_system.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0008_venue_layouts.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0008_venue_layouts.sql'
\ir 0008_venue_layouts.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0009_event_layout.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0009_event_layout.sql'
\ir 0009_event_layout.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0010_organizer_delegations.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0010_organizer_delegations.sql'
\ir 0010_organizer_delegations.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0011_qr_ticket_tokens.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0011_qr_ticket_tokens.sql'
\ir 0011_qr_ticket_tokens.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0011_seat_tiering.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0011_seat_tiering.sql'
\ir 0011_seat_tiering.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0012_auditor_revision_responses.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0012_auditor_revision_responses.sql'
\ir 0012_auditor_revision_responses.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0013_event_needs_revision_and_notification_resource.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0013_event_needs_revision_and_notification_resource.sql  (no BEGIN/COMMIT — not atomic)'
\ir 0013_event_needs_revision_and_notification_resource.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0014_dynamic_ticket_v2.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0014_dynamic_ticket_v2.sql'
\ir 0014_dynamic_ticket_v2.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0014_venue_postal_code.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0014_venue_postal_code.sql'
\ir 0014_venue_postal_code.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0015_event_venue_optional.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0015_event_venue_optional.sql  (no BEGIN/COMMIT — not atomic)'
\ir 0015_event_venue_optional.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0016_event_documents.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0016_event_documents.sql'
\ir 0016_event_documents.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0017_event_archive.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0017_event_archive.sql  (no BEGIN/COMMIT — not atomic)'
\ir 0017_event_archive.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0018_event_public_listing.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0018_event_public_listing.sql  (no BEGIN/COMMIT — not atomic)'
\ir 0018_event_public_listing.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0019_revision_document_changelog.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0019_revision_document_changelog.sql'
\ir 0019_revision_document_changelog.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0020_revision_status_vocabulary.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0020_revision_status_vocabulary.sql'
\ir 0020_revision_status_vocabulary.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0021_ticket_tier_sales_window.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0021_ticket_tier_sales_window.sql'
\ir 0021_ticket_tier_sales_window.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0022_organizer_bank_verification.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0022_organizer_bank_verification.sql'
\ir 0022_organizer_bank_verification.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

-- 0023 adds enum values. PostgreSQL will not let a newly added value be USED in
-- the same transaction that added it, which is why no backfill lives in that
-- file and why nothing here may depend on those labels until this script ends.
\set f '0023_payout_lifecycle_status.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0023_payout_lifecycle_status.sql'
\ir 0023_payout_lifecycle_status.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0024_payout_review_notes.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0024_payout_review_notes.sql'
\ir 0024_payout_review_notes.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0025_bank_verification_actor.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0025_bank_verification_actor.sql'
\ir 0025_bank_verification_actor.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0026_organizer_document_versions.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0026_organizer_document_versions.sql'
\ir 0026_organizer_document_versions.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

-- 0027 BACKFILLS: it creates organizer_applications rows for role-holders who
-- never had one, and grandfathers anyone with an approved event. Skipping it
-- locks every existing organizer out of event submission.
\set f '0027_organizer_document_gate.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0027_organizer_document_gate.sql  (backfills data)'
\ir 0027_organizer_document_gate.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0028_payout_review_checks.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0028_payout_review_checks.sql'
\ir 0028_payout_review_checks.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0029_event_google_maps_url.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0029_event_google_maps_url.sql'
\ir 0029_event_google_maps_url.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

-- 0030 backfills events.max_tickets_per_order from each event's tier caps.
\set f '0030_event_max_tickets_per_order.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0030_event_max_tickets_per_order.sql (backfills data)'
\ir 0030_event_max_tickets_per_order.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

-- 0031 backfills organizer_documents.file_name from the object key's basename.
\set f '0031_organizer_document_file_metadata.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0031_organizer_document_file_metadata.sql (backfills data)'
\ir 0031_organizer_document_file_metadata.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

-- 0032 is pure DDL — it does NOT finish the attendee_nik migration. Run
-- `go run ./backend/cmd/backfill_nik` afterwards to encrypt existing
-- plaintext tickets.attendee_nik into attendee_nik_enc and null the source
-- column; this SQL file cannot do that (AES-GCM needs NIK_ENC_KEY, an
-- application secret psql must never see).
\set f '0032_order_attendees.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0032_order_attendees.sql (DDL only — run cmd/backfill_nik after)'
\ir 0032_order_attendees.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

-- 0033 adds booking_access_log (M5 access telemetry, no data migration needed).
\set f '0033_booking_access_log.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0033_booking_access_log.sql'
\ir 0033_booking_access_log.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0036_event_staff.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0036_event_staff.sql'
\ir 0036_event_staff.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

\set f '0037_ticket_checkins_scanner_logs_event_staff.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0037_ticket_checkins_scanner_logs_event_staff.sql'
\ir 0037_ticket_checkins_scanner_logs_event_staff.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

-- 0038 drops user_bank_accounts (guarded — refuses if the table has rows).
\set f '0038_drop_user_bank_accounts.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0038_drop_user_bank_accounts.sql'
\ir 0038_drop_user_bank_accounts.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

-- 0039 adds the 'snap' payment_method label (see 0023's note on ADD VALUE and
-- same-transaction use).
\set f '0039_payment_method_snap.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0039_payment_method_snap.sql'
\ir 0039_payment_method_snap.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

-- 0040 is the database-level overselling backstop (partial unique index on
-- tickets(event_seats_matrix_id), CHECK on ticket_tiers.tickets_sold). Fails
-- to apply if either constraint is already violated by existing rows — see
-- the file's header for the queries to run first if it does.
\set f '0040_inventory_db_backstop.sql'
SELECT NOT EXISTS (SELECT 1 FROM crowdflow_migrations WHERE version = :'f') AS run_it \gset
\if :run_it
\echo '  applying 0040_inventory_db_backstop.sql'
\ir 0040_inventory_db_backstop.sql
INSERT INTO crowdflow_migrations (version) VALUES (:'f');
\endif

-- ---------------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------------

\echo ''
\echo 'Done. Ledger:'

SELECT
    count(*) FILTER (WHERE note IS NULL)              AS executed_by_runner,
    count(*) FILTER (WHERE note LIKE 'adopted%')      AS adopted_pre_existing,
    count(*)                                          AS total_recorded
FROM crowdflow_migrations;

\echo ''
\echo 'Applied in the last minute (empty means nothing needed doing):'

SELECT version, applied_at
FROM crowdflow_migrations
WHERE applied_at > now() - interval '1 minute' AND note IS NULL
ORDER BY version;
