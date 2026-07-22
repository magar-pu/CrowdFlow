-- Migration: 0012_auditor_revision_responses.sql
-- Purpose: Add the organizer-response columns on auditor_revisions that the Go
--          code has always queried but no migration ever created.
--
-- 0005_auditor_tables.sql creates auditor_revisions with:
--   id, event_id, auditor_id, category, title, description, required_action,
--   priority, status, deadline, created_at, updated_at
--
-- ...but these four columns are read by
--   internal/auditor/repository.go   (GetEventReview, step 5)
--   internal/organizer/repository.go (revision feedback read)
-- and WRITTEN by
--   internal/organizer/repository.go (organizer responds to a revision)
--
-- Without them, GET /api/v1/auditor/reviews/{id} fails with
--   ERROR: column "organizer_comment" does not exist
-- which surfaces as a 500 INTERNAL_ERROR. The auditor LIST endpoint is
-- unaffected because it never selects these columns, so the console looks
-- healthy right up until you open a single review.
--
-- Additive and idempotent.

BEGIN;

ALTER TABLE auditor_revisions
    -- Free-text reply from the organizer addressing the requested change.
    ADD COLUMN IF NOT EXISTS organizer_comment TEXT,
    -- What the organizer actually changed, as distinct from their commentary.
    ADD COLUMN IF NOT EXISTS organizer_action_taken TEXT,
    -- Optional supporting upload (storage object key, not a URL).
    ADD COLUMN IF NOT EXISTS organizer_file TEXT,
    -- Set when the organizer responds; NULL means still awaiting a reply.
    ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- The auditor console lists revisions still awaiting an organizer response.
CREATE INDEX IF NOT EXISTS idx_auditor_revisions_awaiting
    ON auditor_revisions(event_id)
    WHERE responded_at IS NULL;

COMMIT;
