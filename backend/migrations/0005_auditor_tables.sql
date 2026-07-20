-- Migration: 0005_auditor_tables.sql
-- Purpose: Add tables needed for the auditor review portal
-- Tables: auditor_event_reviews, auditor_revisions, auditor_document_reviews, organizer_review_log

-- Stage tracking for auditor event reviews
CREATE TABLE IF NOT EXISTS auditor_event_reviews (
    id              SERIAL PRIMARY KEY,
    event_id        INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    reviewer_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    stage           VARCHAR(50) NOT NULL DEFAULT 'Submitted'
                        CHECK (stage IN ('Submitted', 'Document Verification', 'Event Validation', 'Final Approval')),
    internal_notes  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id)
);

-- Revision requests sent by auditor to organizer
CREATE TABLE IF NOT EXISTS auditor_revisions (
    id              SERIAL PRIMARY KEY,
    event_id        INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    auditor_id      INTEGER NOT NULL REFERENCES users(id),
    category        VARCHAR(50) NOT NULL DEFAULT 'Other',
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    required_action TEXT NOT NULL,
    priority        VARCHAR(20) NOT NULL DEFAULT 'Medium'
                        CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status          VARCHAR(30) NOT NULL DEFAULT 'Draft'
                        CHECK (status IN ('Draft', 'Sent', 'In Progress', 'Resolved', 'Rejected', 'Expired')),
    deadline        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-document review decisions by auditor
CREATE TABLE IF NOT EXISTS auditor_document_reviews (
    id              SERIAL PRIMARY KEY,
    document_id     INTEGER NOT NULL REFERENCES organizer_documents(id) ON DELETE CASCADE,
    reviewer_id     INTEGER NOT NULL REFERENCES users(id),
    decision        VARCHAR(20) NOT NULL CHECK (decision IN ('verified', 'rejected')),
    notes           TEXT,
    reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- History trail for organizer application status changes
CREATE TABLE IF NOT EXISTS organizer_review_log (
    id              SERIAL PRIMARY KEY,
    application_id  INTEGER NOT NULL REFERENCES organizer_applications(id) ON DELETE CASCADE,
    actor_id        INTEGER NOT NULL REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_auditor_event_reviews_event     ON auditor_event_reviews(event_id);
CREATE INDEX IF NOT EXISTS idx_auditor_event_reviews_reviewer  ON auditor_event_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_auditor_revisions_event         ON auditor_revisions(event_id);
CREATE INDEX IF NOT EXISTS idx_auditor_revisions_status        ON auditor_revisions(status);
CREATE INDEX IF NOT EXISTS idx_auditor_doc_reviews_document    ON auditor_document_reviews(document_id);
CREATE INDEX IF NOT EXISTS idx_organizer_review_log_app        ON organizer_review_log(application_id);
CREATE INDEX IF NOT EXISTS idx_organizer_review_log_created    ON organizer_review_log(created_at DESC);
