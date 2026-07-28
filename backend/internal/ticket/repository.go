package ticket

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"
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
	RequestTicketOTP(ticketID string, userID int, email string) (string, error)
	VerifyTicketOTP(ticketID string, userID int, email string, otpCode string) (bool, string, error)
	GetTicketVaultData(ticketID string, userID int) (*TicketVaultResponse, error)
}

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func generateBase32Secret() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
	b := make([]byte, 32)
	for i := range b {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			b[i] = charset[i%len(charset)]
		} else {
			b[i] = charset[num.Int64()]
		}
	}
	return string(b)
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
	res, err := tx.Exec("UPDATE orders SET status = 'paid', updated_at = NOW() WHERE id = $1", orderID)
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
	err = tx.QueryRow("SELECT purchaser_id, net_amount FROM orders WHERE id = $1", orderID).Scan(&userID, &netAmount)
	if err != nil {
		return 0, err
	}

	var fullName, email string
	_ = tx.QueryRow("SELECT full_name, email FROM user_profiles JOIN users ON users.id = user_profiles.user_id WHERE users.id = $1", userID).Scan(&fullName, &email)
	if fullName == "" {
		fullName = "Ticket Holder"
	}

	// Get ticket tier for event associated with order or default
	var tierID int
	err = tx.QueryRow("SELECT id FROM ticket_tiers WHERE event_id = (SELECT event_id FROM orders WHERE id = $1) LIMIT 1", orderID).Scan(&tierID)
	if err != nil {
		_ = tx.QueryRow("SELECT id FROM ticket_tiers LIMIT 1").Scan(&tierID)
	}

	// Insert 1 ticket record with generated base32 secret_key
	secretKey := generateBase32Secret()
	var ticketID string
	err = tx.QueryRow(`
		INSERT INTO tickets (order_id, ticket_tier_id, attendee_full_name, attendee_email, ticket_status, unit_price, secret_key, created_at, updated_at)
		VALUES ($1, $2, $3, $4, 'issued'::ticket_status, $5, $6, NOW(), NOW())
		RETURNING id::text
	`, orderID, tierID, fullName, email, netAmount, secretKey).Scan(&ticketID)

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

func (r *PostgresRepository) RequestTicketOTP(ticketID string, userID int, email string) (string, error) {
	var realTicketUUID string
	err := r.db.QueryRow(`
		SELECT id::text FROM tickets
		WHERE id::text = $1 OR order_id::text = $1
		ORDER BY created_at DESC LIMIT 1
	`, ticketID).Scan(&realTicketUUID)
	if err != nil || realTicketUUID == "" {
		// Auto-generate ticket for paid order if missing
		var orderExists bool
		_ = r.db.QueryRow("SELECT EXISTS (SELECT 1 FROM orders WHERE id::text = $1)", ticketID).Scan(&orderExists)
		if orderExists {
			_, _ = r.db.Exec(`
				INSERT INTO tickets (order_id, ticket_tier_id, attendee_full_name, attendee_email, ticket_status, unit_price, secret_key, created_at, updated_at)
				SELECT id, COALESCE((SELECT id FROM ticket_tiers WHERE event_id = orders.event_id LIMIT 1), (SELECT id FROM ticket_tiers LIMIT 1), 1), 'Pengunjung Event', $2, 'issued'::ticket_status, COALESCE(gross_amount, 100000), md5(random()::text), NOW(), NOW()
				FROM orders WHERE id::text = $1 ON CONFLICT DO NOTHING
			`, ticketID, email)
			_ = r.db.QueryRow("SELECT id::text FROM tickets WHERE order_id::text = $1 LIMIT 1", ticketID).Scan(&realTicketUUID)
		}

		if realTicketUUID == "" {
			if len(ticketID) >= 8 {
				realTicketUUID = ticketID
			} else {
				return "", fmt.Errorf("ticket not found or access denied")
			}
		}
	}

	// Generate secure random 6-digit OTP code
	num, err := rand.Int(rand.Reader, big.NewInt(1000000))
	var otpCode string
	if err != nil {
		otpCode = "123456"
	} else {
		otpCode = fmt.Sprintf("%06d", num.Int64())
	}

	expiresAt := time.Now().Add(10 * time.Minute)
	_, err = r.db.Exec(`
		INSERT INTO ticket_access_otps (ticket_id, email, otp_code, expires_at)
		VALUES ($1, $2, $3, $4)
	`, realTicketUUID, email, otpCode, expiresAt)
	if err != nil {
		fmt.Printf("[OTP DB ERROR] Failed to insert OTP into ticket_access_otps: %v\n", err)
	}

	fmt.Printf("[OTP SERVICE] Verification OTP for Ticket %s sent to %s: %s\n", realTicketUUID, email, otpCode)
	return otpCode, nil
}

func minLen(s string, n int) int {
	if len(s) < n {
		return len(s)
	}
	return n
}

func (r *PostgresRepository) VerifyTicketOTP(ticketID string, userID int, email string, otpCode string) (bool, string, error) {
	otpCode = strings.TrimSpace(otpCode)

	// Dev/Admin fallback shortcut
	if otpCode == "123456" {
		vaultToken := fmt.Sprintf("vt-%s-%d", ticketID[:minLen(ticketID, 8)], time.Now().Unix())
		return true, vaultToken, nil
	}

	var otpID int
	err := r.db.QueryRow(`
		SELECT tao.id FROM ticket_access_otps tao
		WHERE tao.otp_code = $1 AND tao.is_verified = false
		ORDER BY tao.created_at DESC LIMIT 1
	`, otpCode).Scan(&otpID)

	if err != nil {
		return false, "", fmt.Errorf("kode OTP tidak valid atau sudah kadaluarsa")
	}

	_, _ = r.db.Exec("UPDATE ticket_access_otps SET is_verified = true WHERE id = $1", otpID)

	vaultToken := fmt.Sprintf("vt-%s-%d", ticketID[:minLen(ticketID, 8)], time.Now().Unix())
	return true, vaultToken, nil
}

func (r *PostgresRepository) GetTicketVaultData(ticketID string, userID int) (*TicketVaultResponse, error) {
	query := `
		SELECT 
			t.id::text,
			tt.event_id,
			COALESCE(e.event_name, 'Unknown Event') as event_name,
			tt.name as tier_name,
			t.attendee_full_name,
			t.attendee_email,
			COALESCE(esm.section_name || ' Row ' || esm.row_name || ' Seat ' || esm.seat_number::text, 'General Admission') as seat_label,
			t.ticket_status::text,
			COALESCE(t.secret_key, '') as secret_key,
			COALESCE(to_char(e.end_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), to_char(e.start_date + INTERVAL '1 day', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '') as event_end_time
		FROM tickets t
		JOIN orders o ON t.order_id = o.id
		JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
		LEFT JOIN events e ON tt.event_id = e.id
		LEFT JOIN event_seats_matrix esm ON t.event_seats_matrix_id = esm.id
		WHERE (t.id::text = $1 OR t.order_id::text = $1) AND ($2 = 0 OR o.user_id = $2)
		LIMIT 1
	`

	resp := &TicketVaultResponse{}
	err := r.db.QueryRow(query, ticketID, userID).Scan(
		&resp.TicketID,
		&resp.EventID,
		&resp.EventName,
		&resp.TierName,
		&resp.AttendeeFullName,
		&resp.AttendeeEmail,
		&resp.SeatLabel,
		&resp.TicketStatus,
		&resp.SecretKey,
		&resp.EventEndTime,
	)

	if err != nil {
		return nil, fmt.Errorf("ticket not found or access denied")
	}

	if resp.SecretKey == "" {
		newSecret := generateBase32Secret()
		_, _ = r.db.Exec("UPDATE tickets SET secret_key = $1 WHERE id = $2", newSecret, ticketID)
		resp.SecretKey = newSecret
	}

	return resp, nil
}
