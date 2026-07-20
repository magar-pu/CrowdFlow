DO $$
DECLARE
    v_venue_id INT;
    v_event_id INT;
    v_tier_id INT;
    v_user_id INT;
    v_order_id UUID;
    v_ticket_id UUID := '123e4567-e89b-12d3-a456-426614174001';
BEGIN
    -- 1. Create a dummy venue
    INSERT INTO venues (name, address, city, province, total_capacity)
    VALUES ('Mock Venue', 'Mock Address', 'Jakarta', 'DKI', 1000)
    RETURNING id INTO v_venue_id;

    -- 2. Create a dummy event
    INSERT INTO events (id, organizer_id, category_id, event_name, slug, description, start_time, end_time, sales_start_time, status, cover_image_url, venue_id)
    VALUES (
        3,
        1,
        1,
        'Soundscape Festival 2026',
        'soundscape-2026',
        'A two-day music festival...',
        CURRENT_TIMESTAMP + INTERVAL '60 days',
        CURRENT_TIMESTAMP + INTERVAL '62 days',
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        'published',
        'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=900&auto=format&fit=crop',
        v_venue_id
    )
    ON CONFLICT (id) DO UPDATE SET 
        event_name = EXCLUDED.event_name,
        cover_image_url = EXCLUDED.cover_image_url
    RETURNING id INTO v_event_id;

    -- 3. Create a dummy ticket tier
    INSERT INTO ticket_tiers (event_id, name, price, max_ticket_per_user, allocation_limit, sales_start, sales_end)
    VALUES (v_event_id, 'VIP Experience', 1500000, 4, 100, NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day')
    RETURNING id INTO v_tier_id;

    -- Delete old ticket if exists to prevent PK violation on re-run
    DELETE FROM tickets WHERE id = v_ticket_id;

    -- For the specific hardcoded mock ticket UUID, assign it to andra@gmail.com (ID 19)
    v_order_id := gen_random_uuid();
    INSERT INTO orders (id, purchaser_id, event_id, order_type, ticket_face_value_total, platform_fee_rate, platform_fee, platform_fee_ppn, gateway_fee, gateway_fee_ppn, ppn_rate, entertainment_tax_rate, entertainment_tax_amount, entertainment_tax_passed_to_buyer, gross_amount, net_amount, payment_provider, payment_type, status, expires_at, quantity)
    VALUES (v_order_id, 19, v_event_id, 'primary', 1500000, 0, 0, 0, 0, 0, 0, 0, 0, false, 1500000, 1500000, 'mock_provider', 'credit_card', 'paid', NOW() + INTERVAL '1 day', 1);

    INSERT INTO tickets (id, order_id, ticket_tier_id, attendee_full_name, attendee_email, unit_price, ticket_status)
    VALUES (v_ticket_id, v_order_id, v_tier_id, 'Andra', 'andra@gmail.com', 1500000, 'issued');

    -- Also assign it to andra123@gmail.com (ID 21) just in case they are logged in with this one
    v_order_id := gen_random_uuid();
    INSERT INTO orders (id, purchaser_id, event_id, order_type, ticket_face_value_total, platform_fee_rate, platform_fee, platform_fee_ppn, gateway_fee, gateway_fee_ppn, ppn_rate, entertainment_tax_rate, entertainment_tax_amount, entertainment_tax_passed_to_buyer, gross_amount, net_amount, payment_provider, payment_type, status, expires_at, quantity)
    VALUES (v_order_id, 21, v_event_id, 'primary', 1500000, 0, 0, 0, 0, 0, 0, 0, 0, false, 1500000, 1500000, 'mock_provider', 'credit_card', 'paid', NOW() + INTERVAL '1 day', 1);

    INSERT INTO tickets (id, order_id, ticket_tier_id, attendee_full_name, attendee_email, unit_price, ticket_status)
    VALUES ('123e4567-e89b-12d3-a456-426614174002', v_order_id, v_tier_id, 'Andra 123', 'andra123@gmail.com', 1500000, 'issued');
END $$;
