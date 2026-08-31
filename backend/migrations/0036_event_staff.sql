-- Migration: 0036_event_staff.sql
-- Purpose: ticketman accounts. One account = one event, many gates + many
-- tiers granted as separate permission sets (locked decision 14). Credentials
-- are system-generated and shown once (decision 10) — this table stores only
-- the password hash, never a plaintext credential.
--
-- Login is email + password + event_code (the user's own brief): event_code
-- is the opaque, non-sequential account identifier (format K7QM-2F9X) that
-- selects the row, never the numeric event_id. email is NOT globally unique —
-- the same person can hold one account per event (decision 14), so the same
-- email may appear on multiple event_staff rows, one per event.
--
-- valid_from + valid_until give the account an activation WINDOW, not just an
-- end: an organizer can mint credentials for a future shift that stay inert
-- until it starts. status + valid_until are re-checked from this table on
-- every ticketman request (RequireTicketman middleware) rather than trusted
-- from the JWT, so revocation is instant instead of waiting out a token's
-- lifetime.
--
-- created_by_organizer_id records which organizer minted the credentials, for
-- the audit trail and to scope the organizer-facing CRUD.

BEGIN;

CREATE TABLE IF NOT EXISTS event_staff (
    id                       SERIAL PRIMARY KEY,
    event_id                 INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    event_code               VARCHAR(20) NOT NULL,
    full_name                VARCHAR(100) NOT NULL,
    email                    VARCHAR(255) NOT NULL,
    password_hash            VARCHAR(255) NOT NULL,
    status                   VARCHAR(20) NOT NULL DEFAULT 'active',
    valid_from               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until              TIMESTAMPTZ NOT NULL,
    created_by_organizer_id  INT REFERENCES users(id) ON DELETE SET NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_staff_event_code ON event_staff(event_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_staff_event_id_email ON event_staff(event_id, email);
CREATE INDEX IF NOT EXISTS idx_event_staff_event_id ON event_staff(event_id);

-- Gate grants. One account may be posted to several gates.
CREATE TABLE IF NOT EXISTS event_staff_gates (
    id              SERIAL PRIMARY KEY,
    event_staff_id  INT NOT NULL REFERENCES event_staff(id) ON DELETE CASCADE,
    gate_id         INT NOT NULL REFERENCES event_gates(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_staff_id, gate_id)
);

CREATE INDEX IF NOT EXISTS idx_event_staff_gates_staff_id ON event_staff_gates(event_staff_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_gates_gate_id ON event_staff_gates(gate_id);

-- Tier grants. Authorises which ticket_tiers this account may admit; a scan
-- against an ungranted tier is WRONG_TIER (staff authorisation failure, not a
-- ticket failure — see the frozen check-in contract).
CREATE TABLE IF NOT EXISTS event_staff_tiers (
    id              SERIAL PRIMARY KEY,
    event_staff_id  INT NOT NULL REFERENCES event_staff(id) ON DELETE CASCADE,
    ticket_tier_id  INT NOT NULL REFERENCES ticket_tiers(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_staff_id, ticket_tier_id)
);

CREATE INDEX IF NOT EXISTS idx_event_staff_tiers_staff_id ON event_staff_tiers(event_staff_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_tiers_tier_id ON event_staff_tiers(ticket_tier_id);

COMMIT;
