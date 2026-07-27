-- Migration: 0014_dynamic_ticket_v2.sql
-- CrowdFlow Dynamic Ticket Architecture v2 (Offline PWA + TOTP)

BEGIN;

-- 1. Add secret_key to tickets table if not exists
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS secret_key VARCHAR(255);

-- 2. Add end_time to events table if not exists
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;

-- 3. Create ticket_access_otps table for high-friction OTP authentication
CREATE TABLE IF NOT EXISTS ticket_access_otps (
    id SERIAL PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_access_otps_ticket_id ON ticket_access_otps(ticket_id);

COMMIT;
