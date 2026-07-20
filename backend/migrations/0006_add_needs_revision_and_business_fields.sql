-- Migration 0006: Add needs_revision and business fields
-- Adds backing fields for bank verification and business address, and supports a new needs_revision status.

ALTER TYPE application_status ADD VALUE 'needs_revision';

ALTER TABLE organizer_applications 
ADD COLUMN bank_name VARCHAR(100),
ADD COLUMN bank_account_holder VARCHAR(150),
ADD COLUMN bank_account_number VARCHAR(50),
ADD COLUMN business_address TEXT;
