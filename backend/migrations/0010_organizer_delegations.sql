-- Migration 0009: Co-Organizer Delegations
-- Backs the co-organizer delegation & approval feature (docs/architecture/delegation.md).
-- An event owner (organizer_id / "author") delegates management of their events to
-- co-organizers. A delegation is only effective once status = 'active' (owner approval).
-- Payouts are unaffected: events.organizer_id stays the sole payee (design D4).

BEGIN;

-- The delegation grant + its approval lifecycle. One relationship per (owner, delegate).
CREATE TABLE organizer_delegations (
    id            SERIAL PRIMARY KEY,
    owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- the EO / author
    delegate_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- the co-EO
    scope         VARCHAR(10) NOT NULL CHECK (scope IN ('all','specific')),
    status        VARCHAR(10) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','active','declined','revoked')),
    requested_by  INTEGER NOT NULL REFERENCES users(id),   -- owner | delegate | admin who initiated
    approved_by   INTEGER REFERENCES users(id),            -- the owner who approved (author's approval)
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at    TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (owner_id <> delegate_id),                        -- no self-delegation
    UNIQUE (owner_id, delegate_id)
);

-- For scope='specific': which of the owner's events are covered.
-- (scope='all' stores NO rows here -- it covers every event where organizer_id = owner_id,
--  including events the owner creates in the future.)
CREATE TABLE organizer_delegation_events (
    delegation_id INTEGER NOT NULL REFERENCES organizer_delegations(id) ON DELETE CASCADE,
    event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    PRIMARY KEY (delegation_id, event_id)
);

-- Middleware reads by (delegate_id, status) on every organizer-console request;
-- the owner console lists by (owner_id, status). Index both hot paths.
CREATE INDEX idx_org_delegations_delegate_status ON organizer_delegations(delegate_id, status);
CREATE INDEX idx_org_delegations_owner_status ON organizer_delegations(owner_id, status);

COMMIT;
