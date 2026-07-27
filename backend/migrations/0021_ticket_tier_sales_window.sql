-- Migration 0021: repair ticket_tiers sales windows truncated by UTC midnight
--
-- CreateTicketTier/UpdateTicketTier parsed the console's date-only sales window
-- with time.Parse("2006-01-02"), which yields MIDNIGHT UTC. Stored in a
-- timestamptz column that is 07:00 Asia/Jakarta, so a tier whose organizer
-- chose "sales close July 27" actually stopped selling at 07:00 on July 27 and
-- vanished from the public listing (booking/repository.go filters on
-- sales_end >= now()) while the organizer console still displayed it as
-- "On Sale". The whole final selling day was lost.
--
-- Only rows landing exactly on UTC midnight are touched: that is the signature
-- of the bug. A window deliberately set to a precise time by any other path
-- does not sit on an exact 00:00:00.000000+00 boundary and is left alone.
--
-- sales_end moves to the last second of the organizer's intended day.
-- sales_start is corrected in the same pass: it opened sales at 07:00 local
-- instead of 00:00, which failed safe (7 hours late) and so went unnoticed,
-- but the two columns must agree on what a bare date means.

BEGIN;

UPDATE ticket_tiers
SET sales_end = (sales_end AT TIME ZONE 'UTC')::date
                + TIME '23:59:59' AT TIME ZONE 'Asia/Jakarta'
WHERE sales_end = date_trunc('day', sales_end AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

UPDATE ticket_tiers
SET sales_start = (sales_start AT TIME ZONE 'UTC')::date
                  + TIME '00:00:00' AT TIME ZONE 'Asia/Jakarta'
WHERE sales_start = date_trunc('day', sales_start AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

-- A backwards window silently means "never on sale": the listing filter
-- requires sales_start <= now() AND sales_end >= now(), which no instant can
-- satisfy. Rejecting it at write time turns an invisible tier into an error
-- the organizer can act on.
--
-- Added NOT VALID so the constraint governs new writes without failing the
-- migration on historical rows; validated separately below so a genuinely
-- inconsistent row surfaces as a migration failure rather than silently
-- persisting.
ALTER TABLE ticket_tiers
    DROP CONSTRAINT IF EXISTS ticket_tiers_sales_window_check;

ALTER TABLE ticket_tiers
    ADD CONSTRAINT ticket_tiers_sales_window_check
    CHECK (sales_end > sales_start) NOT VALID;

ALTER TABLE ticket_tiers
    VALIDATE CONSTRAINT ticket_tiers_sales_window_check;

COMMIT;
