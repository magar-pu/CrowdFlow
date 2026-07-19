-- Migration 0004: Notifications
-- Backing table for Phase 10 / Sprint 6: Notifications

BEGIN;

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    detail TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Seed some initial mock notifications for testing
INSERT INTO notifications (user_id, title, detail, is_read)
SELECT u.id, 'Welcome to CrowdFlow', 'Your organizer portal is ready for management.', FALSE
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.role_name = 'Event Organizer'
ON CONFLICT DO NOTHING;

COMMIT;
