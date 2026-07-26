-- 0015_event_venue_optional.sql
--
-- The venue is no longer chosen in the event-creation wizard. Organizers create
-- a bare draft (title, category, description, schedule) and pick the venue later
-- inside the event workspace, alongside the layout, tiers and seating.
--
-- events.venue_id must therefore be nullable: a draft legitimately has no venue
-- yet. The FK stays, so a non-null value is still a real venues row.
--
-- A venue-less event can never reach the public catalogue: the publish gate in
-- organizer/repository.go PublishOrganizerEvent rejects the submission with
-- VENUE_REQUIRED, so anything at pending_review or beyond still has a venue.

ALTER TABLE events ALTER COLUMN venue_id DROP NOT NULL;
