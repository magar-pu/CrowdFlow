-- Migration 0019: record which documents changed in a revision response
--
-- Until now a revision response carried only free text plus `organizer_file`,
-- which held a FILENAME STRING the browser never uploaded anywhere — the
-- auditor saw an attachment that did not exist and could not be opened.
--
-- `organizer_documents_changed` replaces it with a snapshot, taken at response
-- time, of the event documents that were actually re-uploaded after the auditor
-- raised that revision. It is a snapshot rather than a live lookup because
-- event_documents is UNIQUE (event_id, document_type) — replacing a document
-- overwrites uploaded_at, so a derived changelog would silently rewrite itself
-- every time the organizer uploaded again. An audit trail must not move.
--
-- Shape: JSONB array of {"documentType": "...", "label": "...", "uploadedAt": "..."}.
-- Empty array = the organizer responded without changing any document, which is
-- legitimate (some revisions are about event details, not paperwork) and is
-- exactly what the auditor needs to see.
--
-- `organizer_file` is deliberately NOT dropped: it still holds rows written by
-- the old flow, and dropping it would destroy that history. It is simply no
-- longer written or read.

BEGIN;

ALTER TABLE auditor_revisions
    ADD COLUMN IF NOT EXISTS organizer_documents_changed JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
