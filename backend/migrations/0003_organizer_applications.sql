-- Migration 0003: Organizer Applications and Documents
-- Creates backing tables for Organizer Verification flow (Phase 1)

BEGIN;

CREATE TYPE application_status AS ENUM ('pending', 'in_review', 'approved', 'rejected');

CREATE TABLE organizer_applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(150) NOT NULL,
    business_type VARCHAR(50) NOT NULL,
    business_email VARCHAR(255) NOT NULL,
    business_phone VARCHAR(50) NOT NULL,
    website VARCHAR(255),
    description TEXT,
    status application_status NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    CONSTRAINT unique_user_application UNIQUE (user_id)
);

CREATE TABLE organizer_documents (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES organizer_applications(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- e.g., KTP, NPWP, NIB, SIUP, etc.
    file_path VARCHAR(500) NOT NULL,     -- path in private bucket
    status public.verification_status NOT NULL DEFAULT 'pending_verification'::public.verification_status,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizer_applications_user ON organizer_applications(user_id);
CREATE INDEX idx_organizer_applications_status ON organizer_applications(status);
CREATE INDEX idx_organizer_documents_application ON organizer_documents(application_id);

COMMIT;
