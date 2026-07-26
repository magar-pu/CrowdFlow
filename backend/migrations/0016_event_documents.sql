-- Migration 0016: Per-event document submissions
--
-- organizer_documents (0003) holds ACCOUNT-level documents: the KTP/NPWP/NIB an
-- organizer submits once, attached to their organizer_applications row. Those are
-- reused across every event they run.
--
-- This table holds the documents that belong to ONE event and are re-submitted for
-- each new one: the proposal, the police crowd permit (izin keramaian), the ID of
-- the person responsible for this specific event, and the venue-usage letter.
--
-- Status reuses public.verification_status so the auditor's existing verify/reject
-- vocabulary ('pending_verification' | 'verified' | 'rejected') applies unchanged.

BEGIN;

CREATE TABLE IF NOT EXISTS event_documents (
    id              SERIAL PRIMARY KEY,
    event_id        INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    document_type   VARCHAR(50) NOT NULL,   -- EVENT_PROPOSAL | CROWD_PERMIT | PIC_ID | VENUE_PERMIT
    file_path       VARCHAR(500) NOT NULL,  -- object key in the PRIVATE bucket, never public
    file_name       VARCHAR(255) NOT NULL,  -- original filename, for display only
    file_size       BIGINT NOT NULL DEFAULT 0,
    content_type    VARCHAR(100) NOT NULL DEFAULT '',
    status          public.verification_status NOT NULL DEFAULT 'pending_verification'::public.verification_status,
    review_notes    TEXT,                   -- auditor's reason when status = 'rejected'
    uploaded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at     TIMESTAMPTZ,
    reviewed_by     INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- One document per type per event. Re-uploading REPLACES the row rather than
-- accumulating versions, which is what makes the publish gate a simple existence
-- check and keeps the auditor from reviewing a stale copy.
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_documents_event_type
    ON event_documents(event_id, document_type);

CREATE INDEX IF NOT EXISTS idx_event_documents_event   ON event_documents(event_id);
CREATE INDEX IF NOT EXISTS idx_event_documents_status  ON event_documents(status);

COMMIT;
