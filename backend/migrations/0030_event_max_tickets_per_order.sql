-- Migration 0030: per-order ticket cap moves from the tier to the event
--
-- `ticket_tiers.max_ticket_per_user` capped each tier independently, so an
-- event with VIP=4 and Regular=4 let one buyer take 8 tickets in a single
-- order. The organizer had no way to express "10 tickets per order, split
-- however you like" — which is the limit they actually wanted to set.
--
-- The cap is now a property of the ORDER, so it belongs on the event: one
-- number covering every tier, seated and general admission alike.
--
-- 0 means uncapped, matching the convention the tier column already used and
-- what booking.CreateHold already treats as "no limit".
--
-- BACKFILL: each event takes the MAX of its tiers' caps, deliberately not the
-- SUM. MAX never tightens what a buyer could already do within any one tier,
-- so no cart in flight becomes invalid the moment this lands; SUM would have
-- preserved the old absolute ceiling but handed multi-tier events a very large
-- total. An event with ANY uncapped tier becomes uncapped: that tier could
-- already be bought without limit, and lowering it to the MAX of its capped
-- siblings would be a restriction this migration has no mandate to impose.
-- Events with no tiers keep the column default.
--
-- `ticket_tiers.max_ticket_per_user` is left in place but is no longer read or
-- written by any code path after this migration. It is commented as superseded
-- rather than dropped, so the backfill can be re-derived if the rollout needs
-- reversing. Dropping it is a follow-up, once this has run in production.

BEGIN;

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS max_tickets_per_order INTEGER NOT NULL DEFAULT 10;

ALTER TABLE events
    DROP CONSTRAINT IF EXISTS events_max_tickets_per_order_non_negative;

ALTER TABLE events
    ADD CONSTRAINT events_max_tickets_per_order_non_negative
    CHECK (max_tickets_per_order >= 0);

UPDATE events e
SET max_tickets_per_order = sub.cap
FROM (
    SELECT
        event_id,
        CASE
            -- Any uncapped tier makes the whole event uncapped; see above.
            WHEN bool_or(max_ticket_per_user <= 0) THEN 0
            ELSE MAX(max_ticket_per_user)
        END AS cap
    FROM ticket_tiers
    GROUP BY event_id
) sub
WHERE e.id = sub.event_id;

COMMENT ON COLUMN ticket_tiers.max_ticket_per_user IS
    'SUPERSEDED by events.max_tickets_per_order (migration 0030). No longer read or written. Retained only so the 0030 backfill can be re-derived; safe to drop once that rollout is settled.';

COMMENT ON COLUMN events.max_tickets_per_order IS
    'Maximum tickets one order may contain, across all tiers combined. 0 means uncapped. Enforced in booking.CreateHold before any inventory is acquired.';

COMMIT;
