-- Migration 0007: Update auditor event reviews schema
-- Renames internal_notes to notes and adds assigned_auditor_name column to match the repository implementation.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='auditor_event_reviews' AND column_name='internal_notes'
    ) THEN
        ALTER TABLE auditor_event_reviews RENAME COLUMN internal_notes TO notes;
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='auditor_event_reviews' AND column_name='notes'
        ) THEN
            ALTER TABLE auditor_event_reviews ADD COLUMN notes TEXT;
        END IF;
    END IF;
END $$;

ALTER TABLE auditor_event_reviews ADD COLUMN IF NOT EXISTS assigned_auditor_name VARCHAR(255);
