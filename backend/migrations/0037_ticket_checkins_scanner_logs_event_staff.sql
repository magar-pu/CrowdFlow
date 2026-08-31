-- Migration: 0037_ticket_checkins_scanner_logs_event_staff.sql
-- Purpose: retire scanner_devices (decision 7) without a single destructive
-- DROP. Two tables have a scanner_device_id FK into it:
--   ticket_checkins.scanner_device_id (0008:37)
--   scanner_logs.scanner_device_id    (0008:48)
-- Both columns are KEPT, nullable, frozen for history. This migration adds
-- the event_staff_id path alongside them so new rows can attribute to a
-- ticketman account instead of a scanner_devices row. scanner_devices itself
-- is untouched by this migration.

BEGIN;

ALTER TABLE ticket_checkins
    ADD COLUMN IF NOT EXISTS event_staff_id INT REFERENCES event_staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_checkins_event_staff_id ON ticket_checkins(event_staff_id);

ALTER TABLE scanner_logs
    ADD COLUMN IF NOT EXISTS event_staff_id INT REFERENCES event_staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scanner_logs_event_staff_id ON scanner_logs(event_staff_id);

COMMIT;
