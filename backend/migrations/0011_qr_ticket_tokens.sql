-- Migration: 0011_qr_ticket_tokens.sql
-- CrowdFlow Dynamic QR Ticket Generation & History Tables
-- Version: 1.0

BEGIN;

-- 1. Extend ticket_status ENUM with 'ready', 'refunded', 'expired' if needed
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'ready';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'expired';

-- 2. Order Items Table (Breakdown of ticket tiers per order)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_tier_id INT NOT NULL REFERENCES ticket_tiers(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 3. Ticket Tokens Table (Stores 10-minute server time dynamic tokens)
CREATE TABLE IF NOT EXISTS ticket_tokens (
    id SERIAL PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    secure_token VARCHAR(255) UNIQUE NOT NULL,
    time_window BIGINT NOT NULL, -- 10-minute server time window (unix_timestamp / 600)
    version INT DEFAULT 1,
    is_current BOOLEAN DEFAULT TRUE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expired_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ticket_tokens_ticket_id ON ticket_tokens(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tokens_secure_token ON ticket_tokens(secure_token);
CREATE INDEX IF NOT EXISTS idx_ticket_tokens_time_window ON ticket_tokens(time_window);

-- 4. Ticket QR History Table (Audit trail for dynamic QR rotation)
CREATE TABLE IF NOT EXISTS ticket_qr_history (
    id SERIAL PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    time_window BIGINT NOT NULL,
    reason VARCHAR(100) DEFAULT 'rotation_10m',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expired_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ticket_qr_history_ticket_id ON ticket_qr_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_qr_history_token ON ticket_qr_history(token);

COMMIT;
