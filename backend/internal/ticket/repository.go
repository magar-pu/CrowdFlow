package ticket

import (
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"
)

const (
	TimeWindowSeconds int64  = 600 // 10 minutes
	HMACSecretKey     string = "crowdflow_dynamic_qr_secret_key_2026"
)

type Repository interface {
	GetUserTickets(userID int) ([]*Ticket, error)
	GetTicketByID(ticketID string, userID int) (*Ticket, error)
	GetOrCreateDynamicToken(ticketID string) (*TicketQRResponse, error)
	GenerateTicketsForPaidOrder(orderID string) (int, error)
}

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

// Calculate 10-minute server time window
func getCurrentTimeWindow() int64 {
	return time.Now().Unix() / TimeWindowSeconds
}

// Calculate remaining seconds until current 10-minute window ends
func getRemainingSeconds() int {
	rem := TimeWindowSeconds - (time.Now().Unix() % TimeWindowSeconds)
	return int(rem)
}

// Generate deterministic HMAC token for (ticketID + timeWindow)
func generateTokenString(ticketID string, timeWindow int64) string {
	mac := hmac.New(sha256.New, []byte(HMACSecretKey))
	mac.Write([]byte(fmt.Sprintf("%s:%d", ticketID, timeWindow)))
	sig := hex.EncodeToString(mac.Sum(nil))[:32]
	return fmt.Sprintf("cf-tkn-%s-%s", ticketID[:8], sig)
}

func (r *PostgresRepository) GetUserTickets(userID int) ([]*Ticket, error) {
	query := `
		SELECT 
			t.id::text,
			t.order_id::text,
			tt.event_id,
			COALESCE(e.event_name, 'Unknown Event') as event_name,
			t.ticket_tier_id,
			tt.name as tier_name,
			t.attendee_full_name,
			t.attendee_email,
			COALESCE(t.attendee_phone, ''),
			COALESCE(t.attendee_nik, ''),
			t.ticket_status::text,
			t.unit_price,
			t.created_at,
			t.updated_at,
			COALESCE(esm.section_name || ' Row ' || esm.row_name || ' Seat ' || esm.seat_number::text, 'General Admission') as seat_label
		FROM tickets t
		JOIN orders o ON t.order_id = o.id
		JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
		LEFT JOIN events e ON tt.event_id = e.id
		LEFT JOIN event_seats_matrix esm ON t.event_seats_matrix_id = esm.id
		WHERE o.user_id = $1
		ORDER BY t.created_at DESC
	`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user tickets: %w", err)
	}
	defer rows.Close()

	var result []*Ticket
	for rows.Next() {
		t := &Ticket{}
		err := rows.Scan(
			&t.ID,
			&t.OrderID,
			&t.EventID,
			&t.EventName,
			&t.TicketTierID,
			&t.TierName,
			&t.AttendeeFullName,
			&t.AttendeeEmail,
			&t.AttendeePhone,
			&t.AttendeeNik,
			&t.TicketStatus,
			&t.UnitPrice,
			&t.CreatedAt,
			&t.UpdatedAt,
			&t.SeatLabel,
		)
		if err != nil {
			return nil, err
		}
		result = append(result, t)
	}

	return result, nil
}

func (r *PostgresRepository) GetTicketByID(ticketID string, userID int) (*Ticket, error) {
	query := `
		SELECT 
			t.id::text,
			t.order_id::text,
			tt.event_id,
			COALESCE(e.event_name, 'Unknown Event') as event_name,
			t.ticket_tier_id,
			tt.name as tier_name,
			t.attendee_full_name,
			t.attendee_email,
			COALESCE(t.attendee_phone, ''),
			COALESCE(t.attendee_nik, ''),
			t.ticket_status::text,
			t.unit_price,
			t.created_at,
			t.updated_at,
			COALESCE(esm.section_name || ' Row ' || esm.row_name || ' Seat ' || esm.seat_number::text, 'General Admission') as seat_label
		FROM tickets t
		JOIN orders o ON t.order_id = o.id
		JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
		LEFT JOIN events e ON tt.event_id = e.id
		LEFT JOIN event_seats_matrix esm ON t.event_seats_matrix_id = esm.id
		WHERE t.id = $1 AND o.user_id = $2
	`

	t := &Ticket{}
	err := r.db.QueryRow(query, ticketID, userID).Scan(
		&t.ID,
		&t.OrderID,
		&t.EventID,
		&t.EventName,
		&t.TicketTierID,
		&t.TierName,
		&t.AttendeeFullName,
		&t.AttendeeEmail,
		&t.AttendeePhone,
		&t.AttendeeNik,
		&t.TicketStatus,
		&t.UnitPrice,
		&t.CreatedAt,
		&t.UpdatedAt,
		&t.SeatLabel,
	)
	if err != nil {
		return nil, fmt.Errorf("ticket not found or access denied")
	}

	return t, nil
}

func (r *PostgresRepository) GetOrCreateDynamicToken(ticketID string) (*TicketQRResponse, error) {
	window := getCurrentTimeWindow()
	remSeconds := getRemainingSeconds()
	windowEndTime := time.Unix((window+1)*TimeWindowSeconds, 0)

	// Check if active token exists in DB for current time window
	var secureToken string
	err := r.db.QueryRow(`
		SELECT secure_token 
		FROM ticket_tokens 
		WHERE ticket_id = $1 AND time_window = $2 AND is_current = true
	`, ticketID, window).Scan(&secureToken)

	if err == nil && secureToken != "" {
		return &TicketQRResponse{
			TicketID:         ticketID,
			SecureToken:      secureToken,
			TimeWindow:       window,
			RefreshInSeconds: remSeconds,
			ExpiredAt:        windowEndTime.Format(time.RFC3339),
		}, nil
	}

	// Generate new token for this 10-minute window
	newToken := generateTokenString(ticketID, window)

	tx, err := r.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Deactivate old tokens for this ticket
	_, _ = tx.Exec("UPDATE ticket_tokens SET is_current = false WHERE ticket_id = $1", ticketID)

	// Insert new current token
	_, err = tx.Exec(`
		INSERT INTO ticket_tokens (ticket_id, secure_token, time_window, is_current, issued_at, expired_at)
		VALUES ($1, $2, $3, true, NOW(), $4)
		ON CONFLICT (secure_token) DO UPDATE SET is_current = true
	`, ticketID, newToken, window, windowEndTime)
	if err != nil {
		return nil, fmt.Errorf("failed to save ticket token: %w", err)
	}

	// Also insert into qr history
	_, _ = tx.Exec(`
		INSERT INTO ticket_qr_history (ticket_id, token, time_window, reason, created_at, expired_at)
		VALUES ($1, $2, $3, 'rotation_10m', NOW(), $4)
	`, ticketID, newToken, window, windowEndTime)

	// Update tickets.qr_signature for backwards compatibility
	_, _ = tx.Exec("UPDATE tickets SET qr_signature = $1, updated_at = NOW() WHERE id = $2", newToken, ticketID)

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &TicketQRResponse{
		TicketID:         ticketID,
		SecureToken:      newToken,
		TimeWindow:       window,
		RefreshInSeconds: remSeconds,
		ExpiredAt:        windowEndTime.Format(time.RFC3339),
	}, nil
}

func (r *PostgresRepository) GenerateTicketsForPaidOrder(orderID string) (int, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	// 1. Update order status to paid
	res, err := tx.Exec("UPDATE orders SET order_status = 'paid', updated_at = NOW() WHERE id = $1", orderID)
	if err != nil {
		return 0, fmt.Errorf("failed to update order status: %w", err)
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return 0, fmt.Errorf("order not found")
	}

	// 2. Count existing tickets for this order
	var existingCount int
	_ = tx.QueryRow("SELECT COUNT(*) FROM tickets WHERE order_id = $1", orderID).Scan(&existingCount)
	if existingCount > 0 {
		_ = tx.Commit()
		return existingCount, nil
	}

	// 3. Query order details to create tickets
	var userID int
	var netAmount float64
	err = tx.QueryRow("SELECT user_id, net_amount FROM orders WHERE id = $1", orderID).Scan(&userID, &netAmount)
	if err != nil {
		return 0, err
	}

	var fullName, email string
	_ = tx.QueryRow("SELECT full_name, email FROM user_profiles JOIN users ON users.id = user_profiles.user_id WHERE users.id = $1", userID).Scan(&fullName, &email)
	if fullName == "" {
		fullName = "Ticket Holder"
	}

	// Get first ticket tier for event associated with order or default
	var tierID int
	err = tx.QueryRow("SELECT id FROM ticket_tiers LIMIT 1").Scan(&tierID)
	if err != nil {
		return 0, fmt.Errorf("no ticket tier available")
	}

	// Insert 1 ticket record
	var ticketID string
	err = tx.QueryRow(`
		INSERT INTO tickets (order_id, ticket_tier_id, attendee_full_name, attendee_email, ticket_status, unit_price, created_at, updated_at)
		VALUES ($1, $2, $3, $4, 'ready', $5, NOW(), NOW())
		RETURNING id::text
	`, orderID, tierID, fullName, email, netAmount).Scan(&ticketID)

	if err != nil {
		return 0, fmt.Errorf("failed to insert ticket: %w", err)
	}

	// Generate initial dynamic token
	window := getCurrentTimeWindow()
	tokenStr := generateTokenString(ticketID, window)
	windowEndTime := time.Unix((window+1)*TimeWindowSeconds, 0)

	_, _ = tx.Exec(`
		INSERT INTO ticket_tokens (ticket_id, secure_token, time_window, is_current, issued_at, expired_at)
		VALUES ($1, $2, $3, true, NOW(), $4)
	`, ticketID, tokenStr, window, windowEndTime)

	_, _ = tx.Exec("UPDATE tickets SET qr_signature = $1 WHERE id = $2", tokenStr, ticketID)

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return 1, nil
}
