CREATE OR REPLACE FUNCTION check_ticket_limit_per_user() RETURNS trigger AS $$
BEGIN
    IF (
        SELECT COUNT(*)
        FROM tickets t
        JOIN orders o ON t.order_id = o.id
        JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
        WHERE o.purchaser_id = (SELECT purchaser_id FROM orders WHERE id = NEW.order_id)
          AND t.ticket_tier_id = NEW.ticket_tier_id
          AND tt.event_id = (SELECT event_id FROM ticket_tiers WHERE id = NEW.ticket_tier_id)
          AND t.ticket_status NOT IN ('cancelled')
    ) >= (SELECT max_ticket_per_user FROM ticket_tiers WHERE id = NEW.ticket_tier_id) THEN
        RAISE EXCEPTION 'Ticket limit per user exceeded for this tier';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
