-- Migration 0027: gate event submission on verified organizer account documents
--
-- From here on an organizer may not submit an event for review until their
-- KTP, NPWP and NIB have each been VERIFIED by an auditor in the auditor
-- console's organizer panel. Before this, POST /api/organizer/events and the
-- publish call were guarded only by requirePlatformRole("Event Organizer") — a
-- ROLE check. Nothing anywhere read document status, and the role can be
-- granted directly by an admin, so "is an organizer" never implied "has been
-- vetted".
--
-- Two things have to happen here or the gate locks out the people already
-- using the platform.
--
-- 1. EVERY organizer holding the role today would fail the new gate: one has no
--    documents at all, one has no organizer_applications row whatsoever, and
--    the third has a pending NPWP. Two of the three have live APPROVED events.
--    Freezing running events to enforce a rule introduced after they were
--    approved would be retroactive. They are grandfathered.
--
-- 2. The exemption is a COLUMN rather than an implicit "has an approved event"
--    check in Go. A derived rule would keep re-deciding itself: an organizer
--    whose only approved event is later archived or rejected would silently
--    lose an exemption they were granted once. A column records the decision at
--    the moment it was made and stops moving.

BEGIN;

ALTER TABLE organizer_applications
    ADD COLUMN IF NOT EXISTS document_gate_exempt BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN organizer_applications.document_gate_exempt IS
    'TRUE for organizers grandfathered by migration 0027: they already had an approved event when the account-document gate was introduced. Set once, never derived.';

-- Create the missing application rows FIRST, so the backfill below can mark
-- them. An admin can grant the Event Organizer role straight from the Users
-- screen, which bypasses organizer_applications entirely — user 15 has 8 events
-- and no row. Without a row there is nothing to attach documents to, so such an
-- organizer would be gated with no way to ever pass.
--
-- Built from data that actually exists: the user's own profile name and login
-- email. business_type and business_phone are NOT NULL with no honest value
-- available, so they are left empty and render as "Not provided" rather than
-- being invented. status is 'approved' because it already is — the role grant
-- WAS the approval. reviewed_by stays NULL: no auditor reviewed an application
-- that was never submitted, and naming one would fabricate an audit trail.
--
-- This mirrors exactly what UpdatePayoutDetails already does at runtime.
INSERT INTO organizer_applications (
    user_id, business_name, business_type, business_email, business_phone, status
)
SELECT
    u.id,
    COALESCE(NULLIF(TRIM(up.full_name), ''), u.email),
    '',
    u.email,
    '',
    'approved'
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r       ON r.id = ur.role_id
LEFT JOIN user_profiles up ON up.user_id = u.id
WHERE r.role_name = 'Event Organizer'
  AND NOT EXISTS (
      SELECT 1 FROM organizer_applications a WHERE a.user_id = u.id
  )
GROUP BY u.id, u.email, up.full_name;

-- Grandfather anyone with an approved event. Deliberately keyed on 'approved'
-- only: a draft or rejected event represents no commitment the platform has
-- already honoured, so those organizers go through the gate like a new signup.
UPDATE organizer_applications a
SET document_gate_exempt = TRUE
WHERE EXISTS (
    SELECT 1 FROM events e
    WHERE e.organizer_id = a.user_id
      AND e.status = 'approved'
);

COMMIT;
