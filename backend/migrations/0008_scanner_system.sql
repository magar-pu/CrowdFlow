-- Migration: Scanner System Tables
-- CrowdFlow EO Scanner System v1.0

-- Tabel Gate/Pintu Masuk Event
CREATE TABLE IF NOT EXISTS event_gates (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_gates_event_id ON event_gates(event_id);

-- Tabel Perangkat Scanner Terdaftar
CREATE TABLE IF NOT EXISTS scanner_devices (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    gate_id INT REFERENCES event_gates(id) ON DELETE SET NULL,
    device_name VARCHAR(100) NOT NULL,
    device_token VARCHAR(255) UNIQUE NOT NULL,
    staff_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'QR Scanner',
    status VARCHAR(20) DEFAULT 'online',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scanner_devices_event_id ON scanner_devices(event_id);
CREATE INDEX idx_scanner_devices_token ON scanner_devices(device_token);

-- Tabel Log Check-in Tiket
CREATE TABLE IF NOT EXISTS ticket_checkins (
    id SERIAL PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    gate_id INT REFERENCES event_gates(id) ON DELETE SET NULL,
    scanner_device_id INT REFERENCES scanner_devices(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL,
    checked_in_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ticket_checkins_event_id ON ticket_checkins(event_id);
CREATE INDEX idx_ticket_checkins_ticket_id ON ticket_checkins(ticket_id);

-- Tabel Log Aktivitas Scanner (Audit)
CREATE TABLE IF NOT EXISTS scanner_logs (
    id SERIAL PRIMARY KEY,
    scanner_device_id INT REFERENCES scanner_devices(id) ON DELETE SET NULL,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    detail TEXT,
    ip_address VARCHAR(45),
    response_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scanner_logs_event_id ON scanner_logs(event_id);
CREATE INDEX idx_scanner_logs_device_id ON scanner_logs(scanner_device_id);
