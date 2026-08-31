-- Migration: 0033_booking_access_log.sql
-- Purpose: M5 (plan_2026-08-30_dynamic_qr_ticketman.md, "link-forwarding gap"
-- mitigations) — record every secret fetch through GET
-- /order-access/{orderId}/tickets/{ticketId} so an organizer can see "this
-- order's link was opened from N distinct devices" and flag outliers as a
-- resale/leak signal, even before M2 (first-device claim) ships.
--
-- ip_hash/ua_hash are plain SHA-256 hex of the request's resolved client IP
-- and User-Agent header — a device-distinctness heuristic, not a security
-- secret, so no salt/pepper: the goal is "does this look like the same
-- device as last time", not protecting the hash from a determined attacker
-- who already controls the server. Never store the raw IP/UA.

BEGIN;

CREATE TABLE IF NOT EXISTS booking_access_log (
    id           BIGSERIAL PRIMARY KEY,
    order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_id    UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    ip_hash      CHAR(64) NOT NULL,
    ua_hash      CHAR(64) NOT NULL,
    accessed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_access_log_order ON booking_access_log(order_id);
CREATE INDEX IF NOT EXISTS idx_booking_access_log_ticket ON booking_access_log(ticket_id);

COMMIT;
