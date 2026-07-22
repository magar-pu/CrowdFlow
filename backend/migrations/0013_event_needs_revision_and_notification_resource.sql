-- Migration: 0013_event_needs_revision_and_notification_resource.sql
-- Purpose: Create the two schema objects the auditor approve/reject/request-changes
--          flows have always written to but no migration ever created.
--
-- 1. event_status enum is missing 'needs_revision'.
--    internal/auditor/repository.go writes it in RequestEventChanges (UPDATE events
--    + event_status_log insert), AddEventRevision and UpdateRevisionStatus, and
--    internal/organizer/repository.go already maps it to the "Need Revision" status
--    the organizer dashboard renders. Only the enum label was missing, so
--    POST /api/v1/auditor/reviews/{id}/request-changes failed with
--      ERROR: invalid input value for enum event_status: "needs_revision"
--
-- 2. notifications is missing resource_type / resource_id.
--    Written by the auditor, organizer and delegation packages and read back by
--    ListNotifications in auditor + organizer. Their absence broke the auditor
--    notification bell outright, and — because the organizer-notification insert
--    inside the approve/reject transactions swallowed its error with `_, _ =` —
--    it also aborted those transactions, surfacing as the opaque
--      commit unexpectedly resulted in rollback
--    Both columns are nullable: every reader already COALESCEs them to ''.
--
-- Additive and idempotent.

-- NOTE: intentionally NOT wrapped in BEGIN/COMMIT. ALTER TYPE ... ADD VALUE may
-- only run outside a transaction block on PostgreSQL < 12, and even on 12+ the
-- new label is unusable until the enclosing transaction commits. Each statement
-- below is independently idempotent, so a partial run is safe to re-apply.

ALTER TYPE public.event_status ADD VALUE IF NOT EXISTS 'needs_revision';

ALTER TABLE notifications
    -- Kind of entity this notification points at: 'event', 'payout', 'delegation'.
    ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50),
    -- Identifier of that entity, kept as text because ids across the referenced
    -- tables are a mix of integer and uuid.
    ADD COLUMN IF NOT EXISTS resource_id VARCHAR(100);

-- The consoles deep-link from a notification to its resource.
CREATE INDEX IF NOT EXISTS idx_notifications_resource
    ON notifications(resource_type, resource_id);
