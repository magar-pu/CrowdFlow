-- Migration 0026: let an organizer re-file a rejected account document
--
-- organizer_documents has no unique constraint on (application_id,
-- document_type) — unlike event_documents, which is unique and overwrites on
-- replacement. So a re-upload APPENDS a row, and every count in the auditor
-- repository of the form
--
--     SELECT COUNT(*) FROM organizer_documents
--      WHERE application_id = ... AND status = 'verified'
--
-- would count the same document twice once re-uploads exist.
--
-- Rather than adding the unique constraint and overwriting, this keeps the
-- history and marks which row is current. An auditor reviewing a re-filed
-- document needs to see that the first one was rejected; overwriting destroys
-- exactly the evidence the review depends on. It is the same reasoning that
-- forced the revision changelog to snapshot document state instead of deriving
-- it — event_documents overwrites uploaded_at, so a derived trail rewrites
-- itself.
--
-- Every existing row is current: nothing has ever been superseded, because
-- until now there was no way to re-upload.
--
-- The partial unique index is what actually enforces the invariant — at most
-- one current row per document type. Without it, a bug in the write ordering
-- would silently produce two current rows and reintroduce the double-count.

BEGIN;

ALTER TABLE organizer_documents
    ADD COLUMN IF NOT EXISTS is_current  BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS organizer_documents_one_current_per_type
    ON organizer_documents (application_id, document_type)
    WHERE is_current;

COMMENT ON COLUMN organizer_documents.is_current IS
    'FALSE once a newer upload of the same document_type supersedes this row. Every count of an organizer''s documents must filter on this.';

COMMIT;
