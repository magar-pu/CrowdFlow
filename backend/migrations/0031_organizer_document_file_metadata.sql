-- Migration 0031: give account documents the same file metadata as event documents
--
-- organizer_documents (0003) stores only the object key. event_documents (0016)
-- stores file_name and file_size alongside it, which is why the event workspace
-- can show "izin-keramaian.pdf · 2.4 MB · uploaded 12 Jul" while the Business
-- Documents card in organizer Settings could only ever say "Verified" — the
-- organizer had no way to tell WHICH file was on file, and replacing the wrong
-- one is unrecoverable from the UI (a replacement supersedes, it does not undo).
--
-- The two surfaces are the same task and now render from the same component, so
-- the columns have to match.
--
-- Backfill: the original filename was never recorded, so it cannot be recovered.
-- The object key's basename is the closest honest value — it carries the type
-- and the extension (organizers/documents/12_1721..._ktp.pdf). file_size stays
-- 0 for historical rows and the UI omits the size rather than printing "0 B";
-- re-reading every object out of the private bucket to fill it in is not worth
-- a cosmetic line, and every replacement from here on records the real size.

BEGIN;

ALTER TABLE organizer_documents
    ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS file_size BIGINT       NOT NULL DEFAULT 0;

UPDATE organizer_documents
SET file_name = regexp_replace(file_path, '^.*/', '')
WHERE file_name = '';

COMMENT ON COLUMN organizer_documents.file_name IS
    'Original client filename at upload. Rows predating migration 0031 hold the object key''s basename instead — the real name was never recorded.';
COMMENT ON COLUMN organizer_documents.file_size IS
    'Size in bytes at upload. 0 on rows predating migration 0031; the UI treats 0 as unknown.';

COMMIT;
