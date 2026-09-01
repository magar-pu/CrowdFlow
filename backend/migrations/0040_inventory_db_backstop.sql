-- Migration 0040: database-level backstop against overselling
--
-- Migration 0039's sibling in the inventory fix (see the M6 overselling bug):
-- ticket.GenerateTicketsForPaidOrder now writes event_seats_matrix.current_state
-- and ticket_tiers.tickets_sold at settlement, and booking's GA hold logic no
-- longer leaks capacity on Redis TTL expiry. Both are application logic, and
-- application logic regresses — a future change to either code path could
-- reintroduce a double-sold seat or an over-quota tier without anyone
-- noticing until a buyer complains. These two constraints make both outcomes
-- impossible at the database level, independent of whatever the application
-- currently does right:
--
--   1. A partial unique index on tickets(event_seats_matrix_id) WHERE NOT
--      NULL. Two tickets referencing the same seat can no longer both be
--      inserted; the second INSERT fails instead of silently double-selling.
--      Partial (not a plain UNIQUE) because most tickets are GA and carry
--      event_seats_matrix_id = NULL — a plain unique constraint treats
--      multiple NULLs as distinct, so this is only ever a no-op for them, but
--      spelling it as WHERE ... IS NOT NULL says that explicitly rather than
--      leaning on NULL semantics no future reader is guaranteed to know.
--
--   2. CHECK (tickets_sold <= allocation_limit) on ticket_tiers. A GA tier
--      cannot be oversold by whatever writes tickets_sold, present or future.
--
-- Before writing this migration, both existing databases (local; sandbox and
-- production were not accessible from this session) were checked for rows
-- that would already violate these constraints:
--   SELECT event_seats_matrix_id, COUNT(*) FROM tickets
--     WHERE event_seats_matrix_id IS NOT NULL GROUP BY 1 HAVING COUNT(*) > 1;
--   SELECT id FROM ticket_tiers WHERE tickets_sold > allocation_limit;
-- Local returned zero rows for both (tickets_sold has never had a writer
-- before this change, so it is 0 everywhere and cannot yet exceed anything).
-- If either query returns rows on a database this migration is applied to,
-- DO NOT run it there — the ADD CONSTRAINT / CREATE UNIQUE INDEX will fail,
-- which is correct: it means real double-sold seats or over-quota tiers
-- exist and need investigating before the database can refuse to reproduce
-- them.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_one_per_seat
    ON tickets (event_seats_matrix_id)
    WHERE event_seats_matrix_id IS NOT NULL;

ALTER TABLE ticket_tiers
    DROP CONSTRAINT IF EXISTS ticket_tiers_tickets_sold_within_allocation;

ALTER TABLE ticket_tiers
    ADD CONSTRAINT ticket_tiers_tickets_sold_within_allocation
    CHECK (tickets_sold <= allocation_limit);

COMMIT;
