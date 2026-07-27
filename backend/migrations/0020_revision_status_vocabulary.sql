-- Migration 0020: align auditor_revisions.status with the vocabulary the app uses
--
-- 0005 created the CHECK constraint with six labels:
--   Draft, Sent, In Progress, Resolved, Rejected, Expired
--
-- but the application has always used nine. In particular
-- RespondToEventRevision writes 'Resubmitted', so an organizer answering a
-- revision has never been able to succeed — every attempt failed with
-- 23514 auditor_revisions_status_check. 'Viewed' and 'Verified' are likewise in
-- the frontend RevisionStatus union and rejected by the database.
--
-- The constraint is widened rather than dropped: it is what stops a typo'd
-- status from silently entering the audit trail.

BEGIN;

ALTER TABLE auditor_revisions
    DROP CONSTRAINT IF EXISTS auditor_revisions_status_check;

ALTER TABLE auditor_revisions
    ADD CONSTRAINT auditor_revisions_status_check
    CHECK (status IN (
        'Draft',        -- auditor is still composing the request
        'Sent',         -- delivered to the organizer
        'Viewed',       -- organizer has opened it
        'In Progress',  -- organizer is working on it
        'Resubmitted',  -- organizer has answered; awaiting auditor
        'Verified',     -- auditor checked the response
        'Resolved',     -- auditor accepted the fix
        'Rejected',     -- auditor rejected the fix
        'Expired'       -- deadline passed without a response
    ));

COMMIT;
