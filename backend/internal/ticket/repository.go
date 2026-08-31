package ticket

import (
	"crypto/rand"
	"database/sql"
	"fmt"
	"math/big"
	"strconv"
	"strings"
	"time"
)

type Repository interface {
	GetUserTickets(userID int) ([]*Ticket, error)
	GetTicketByID(ticketID string, userID int) (*Ticket, error)
	GenerateTicketsForPaidOrder(orderID string) (int, error)
	GetOrderAccess(orderID string) (*OrderAccessResponse, error)
	GetTicketAccess(orderID string, ticketID string) (*TicketAccessResponse, error)
	RotateSecretForOrderTicket(orderID string, ticketID string) error
	RotateSecret(ticketID string) (string, error)
	RecordBookingAccess(orderID string, ticketID string, ipHash string, uaHash string) error
	CountDistinctBookingAccessDevices(orderID string) (int, error)
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
			t.ticket_status::text,
			t.unit_price,
			t.created_at,
			t.updated_at,
			COALESCE('Row ' || s.row_number || ' Seat ' || s.seat_number, 'General Admission') as seat_label,
			e.event_start,
			COALESCE(v.name, '') as venue_name,
			COALESCE(v.city, '') as venue_city,
			COALESCE(e.cover_image_url, '') as cover_image_url
		FROM tickets t
		JOIN orders o ON t.order_id = o.id
		JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
		LEFT JOIN events e ON tt.event_id = e.id
		LEFT JOIN venues v ON v.id = e.venue_id
		LEFT JOIN event_seats_matrix esm ON t.event_seats_matrix_id = esm.id
		LEFT JOIN seats s ON s.id = esm.seat_id
		WHERE o.purchaser_id = $1
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
		// events is LEFT JOINed, so a ticket whose event row is missing still
		// returns rather than failing the whole list.
		var eventStart sql.NullTime
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
			&t.TicketStatus,
			&t.UnitPrice,
			&t.CreatedAt,
			&t.UpdatedAt,
			&t.SeatLabel,
			&eventStart,
			&t.VenueName,
			&t.VenueCity,
			&t.CoverImageURL,
		)
		if err != nil {
			return nil, err
		}
		if eventStart.Valid {
			t.EventStart = &eventStart.Time
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
			t.ticket_status::text,
			t.unit_price,
			t.created_at,
			t.updated_at,
			COALESCE('Row ' || s.row_number || ' Seat ' || s.seat_number, 'General Admission') as seat_label,
			e.event_start,
			COALESCE(v.name, '') as venue_name,
			COALESCE(v.city, '') as venue_city,
			COALESCE(e.cover_image_url, '') as cover_image_url
		FROM tickets t
		JOIN orders o ON t.order_id = o.id
		JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id
		LEFT JOIN events e ON tt.event_id = e.id
		LEFT JOIN venues v ON v.id = e.venue_id
		LEFT JOIN event_seats_matrix esm ON t.event_seats_matrix_id = esm.id
		LEFT JOIN seats s ON s.id = esm.seat_id
		WHERE t.id = $1 AND o.purchaser_id = $2
	`

	t := &Ticket{}
	var eventStart sql.NullTime
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
		&t.TicketStatus,
		&t.UnitPrice,
		&t.CreatedAt,
		&t.UpdatedAt,
		&t.SeatLabel,
		&eventStart,
		&t.VenueName,
		&t.VenueCity,
		&t.CoverImageURL,
	)
	if err != nil {
		return nil, fmt.Errorf("ticket not found or access denied")
	}
	if eventStart.Valid {
		t.EventStart = &eventStart.Time
	}

	return t, nil
}

// GenerateTicketsForPaidOrder issues one ticket per order_attendees row,
// against the tier and (for assigned seating) the seat that attendee was
// actually captured for at checkout, priced from order_items.unit_price —
// never orders.net_amount, which is the order's whole total and previously
// got written onto a single ticket regardless of quantity.
//
// order_attendees (migration 0032) is the source of truth for WHO each
// ticket belongs to; order_items (0011) is the source of truth for WHAT
// each ticket costs. Neither the purchaser's own profile nor a LIMIT 1 over
// ticket_tiers enters into this any more.
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

	// 2. Idempotency guard: if tickets already exist for this order, this is a
	// retried webhook / a second call from the buyer's client racing the
	// webhook. Report what already exists rather than issuing again.
	var existingCount int
	_ = tx.QueryRow("SELECT COUNT(*) FROM tickets WHERE order_id = $1", orderID).Scan(&existingCount)
	if existingCount > 0 {
		_ = tx.Commit()
		return existingCount, nil
	}

	// 3. One row per ticket to be issued, carrying both who it is for
	// (order_attendees) and what it was sold for (order_items.unit_price for
	// that attendee's tier). event_seats_matrix_id is NULL for GA attendees.
	rows, err := tx.Query(`
		SELECT oa.id::text, oa.ticket_tier_id, oa.event_seats_matrix_id,
		       oa.full_name, oa.email, oa.nik_enc, oa.phone, oa.dob,
		       oi.unit_price
		FROM order_attendees oa
		JOIN order_items oi
		  ON oi.order_id = oa.order_id AND oi.ticket_tier_id = oa.ticket_tier_id
		WHERE oa.order_id = $1
	`, orderID)
	if err != nil {
		return 0, fmt.Errorf("failed to load order attendees: %w", err)
	}

	type attendeeRow struct {
		id           string
		tierID       int
		seatMatrixID sql.NullInt64
		fullName     string
		email        string
		nikEnc       []byte
		phone        string
		dob          time.Time
		unitPrice    float64
	}

	var attendees []attendeeRow
	for rows.Next() {
		var a attendeeRow
		if err := rows.Scan(
			&a.id, &a.tierID, &a.seatMatrixID,
			&a.fullName, &a.email, &a.nikEnc, &a.phone, &a.dob,
			&a.unitPrice,
		); err != nil {
			rows.Close()
			return 0, fmt.Errorf("failed to scan order attendee: %w", err)
		}
		attendees = append(attendees, a)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return 0, err
	}
	rows.Close()

	if len(attendees) == 0 {
		return 0, fmt.Errorf("order %s has no attendee rows to issue tickets from", orderID)
	}

	// 4. One INSERT per attendee, each with its own freshly generated
	// secret_key — the QR credential must never be shared across tickets.
	//
	// soldSeatIDs and gaCountByTier are built from rows actually inserted in
	// THIS pass, not from the attendees slice loaded in step 3: the whole
	// function returns early at step 2 on a retried webhook, so this loop —
	// and everything counted from it — only ever runs once per order. That
	// early return is what makes the tickets_sold increment below idempotent
	// against Midtrans's at-least-once webhook delivery; it is not
	// re-derived here, only relied on.
	soldSeatIDs := make([]int64, 0, len(attendees))
	gaCountByTier := map[int]int{}

	for _, a := range attendees {
		var seatMatrixID interface{}
		if a.seatMatrixID.Valid {
			seatMatrixID = a.seatMatrixID.Int64
		}

		secretKey := generateBase32Secret()
		_, err := tx.Exec(`
			INSERT INTO tickets (
				order_id, ticket_tier_id, event_seats_matrix_id,
				attendee_full_name, attendee_email, attendee_nik_enc, attendee_phone, attendee_dob,
				ticket_status, unit_price, secret_key, created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'issued'::ticket_status, $9, $10, NOW(), NOW())
		`, orderID, a.tierID, seatMatrixID, a.fullName, a.email, a.nikEnc, a.phone, a.dob, a.unitPrice, secretKey)
		if err != nil {
			return 0, fmt.Errorf("failed to insert ticket for order_attendees %s: %w", a.id, err)
		}

		if a.seatMatrixID.Valid {
			soldSeatIDs = append(soldSeatIDs, a.seatMatrixID.Int64)
		} else {
			gaCountByTier[a.tierID]++
		}
	}

	// 5. Commit inventory in the SAME transaction as the tickets: a seat this
	// order paid for must never be readable as available again once the Redis
	// hold's TTL lapses, and a GA tier's remaining count must reflect this
	// sale from the moment the order is paid, not "eventually, once someone
	// notices". Both statements are no-ops (WHERE matches nothing) if
	// attendees is empty, but attendees is never empty here (checked above).
	if len(soldSeatIDs) > 0 {
		if _, err := tx.Exec(`
			UPDATE event_seats_matrix
			SET current_state = 'sold'
			WHERE id = ANY($1::int[])
		`, int64ArrayLiteral(soldSeatIDs)); err != nil {
			return 0, fmt.Errorf("failed to mark seats sold: %w", err)
		}
	}
	for tierID, qty := range gaCountByTier {
		if _, err := tx.Exec(`
			UPDATE ticket_tiers SET tickets_sold = tickets_sold + $1 WHERE id = $2
		`, qty, tierID); err != nil {
			return 0, fmt.Errorf("failed to increment tickets_sold for tier %d: %w", tierID, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return len(attendees), nil
}

// int64ArrayLiteral renders ids as a Postgres array literal ("{1,2,3}") for
// use with `= ANY($n::int[])`. The project drives pgx through database/sql,
// where a plain []int64 is not a valid driver value, and lib/pq (whose
// pq.Array would do this) is not a dependency — same reasoning as
// organizer/seating.go's intArrayLiteral. The literal is still bound as a
// parameter, not interpolated into the query.
func int64ArrayLiteral(ids []int64) string {
	if len(ids) == 0 {
		return "{}"
	}
	var b strings.Builder
	b.WriteByte('{')
	for i, id := range ids {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString(strconv.FormatInt(id, 10))
	}
	b.WriteByte('}')
	return b.String()
}

func minLen(s string, n int) int {
	if len(s) < n {
		return len(s)
	}
	return n
}

// orderIDShort renders the M7 watermark's truncated order id — enough for a
// human to recognise "their" screenshot without republishing the full
// order UUID (which is itself the order-level credential) onto the page.
func orderIDShort(orderID string) string {
	return orderID[:minLen(orderID, 8)]
}

// purchaserNameSelect is shared by GetOrderAccess and GetTicketAccess: the
// purchaser's display name for the M7 watermark. Deliberately does NOT fall
// back to u.email — both endpoints are unauthenticated, and a per-attendee
// link would otherwise show a different attendee the purchaser's real email
// address, and a leaked screenshot would carry it too. An empty string here
// just means the watermark falls back to "Guest" (BookingWatermark.tsx) plus
// the still-present truncated order id, which is enough for the deterrent
// without leaking PII.
const purchaserNameSelect = `COALESCE(up.full_name, '')`

// GetOrderAccess backs GET /order-access/{orderId} — the purchaser's
// no-login overview of every ticket on their order. The order UUID is the
// credential (decision 4); this endpoint deliberately never returns a
// secret_key or NIK, only enough to list and link to each attendee's own
// ticket page.
func (r *PostgresRepository) GetOrderAccess(orderID string) (*OrderAccessResponse, error) {
	resp := &OrderAccessResponse{OrderID: orderID, OrderIDShort: orderIDShort(orderID)}

	var eventStart sql.NullTime
	err := r.db.QueryRow(`
		SELECT `+purchaserNameSelect+`,
		       COALESCE(e.event_name, 'Unknown Event'),
		       e.event_start,
		       COALESCE(v.name, ''),
		       COALESCE(v.city, ''),
		       COALESCE(e.cover_image_url, '')
		FROM orders o
		JOIN users u ON u.id = o.purchaser_id
		LEFT JOIN user_profiles up ON up.user_id = u.id
		LEFT JOIN events e ON e.id = o.event_id
		LEFT JOIN venues v ON v.id = e.venue_id
		WHERE o.id::text = $1
	`, orderID).Scan(&resp.PurchaserName, &resp.EventName, &eventStart, &resp.VenueName, &resp.VenueCity, &resp.CoverImageURL)
	if err != nil {
		return nil, fmt.Errorf("order not found")
	}
	if eventStart.Valid {
		resp.EventStart = &eventStart.Time
	}

	rows, err := r.db.Query(`
		SELECT
			t.id::text,
			t.attendee_full_name,
			tt.name,
			COALESCE('Row ' || s.row_number || ' Seat ' || s.seat_number, 'General Admission'),
			t.ticket_status::text
		FROM tickets t
		JOIN ticket_tiers tt ON tt.id = t.ticket_tier_id
		LEFT JOIN event_seats_matrix esm ON esm.id = t.event_seats_matrix_id
		LEFT JOIN seats s ON s.id = esm.seat_id
		WHERE t.order_id::text = $1
		ORDER BY t.created_at ASC
	`, orderID)
	if err != nil {
		return nil, fmt.Errorf("failed to load order tickets: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var tk OrderAccessTicket
		if err := rows.Scan(&tk.TicketID, &tk.AttendeeFullName, &tk.TierName, &tk.SeatLabel, &tk.TicketStatus); err != nil {
			return nil, err
		}
		resp.Tickets = append(resp.Tickets, tk)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(resp.Tickets) == 0 {
		return nil, fmt.Errorf("order not found")
	}

	return resp, nil
}

// GetTicketAccess backs GET /order-access/{orderId}/tickets/{ticketId} — the
// single-attendee page DigitalTicketCard loads its secret_key from. Scoped
// to (orderID, ticketID) together so a per-attendee link can never be used
// to pull a sibling ticket on the same order.
func (r *PostgresRepository) GetTicketAccess(orderID string, ticketID string) (*TicketAccessResponse, error) {
	resp := &TicketAccessResponse{OrderID: orderID, OrderIDShort: orderIDShort(orderID)}

	query := `
		SELECT
			t.id::text,
			` + purchaserNameSelect + `,
			tt.event_id,
			COALESCE(e.event_name, 'Unknown Event') as event_name,
			tt.name as tier_name,
			t.attendee_full_name,
			t.attendee_email,
			COALESCE('Row ' || s.row_number || ' Seat ' || s.seat_number, 'General Admission') as seat_label,
			t.ticket_status::text,
			COALESCE(t.secret_key, '') as secret_key,
			COALESCE(to_char(e.event_end, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), to_char(e.event_start + INTERVAL '1 day', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '') as event_end_time
		FROM tickets t
		JOIN orders o ON o.id = t.order_id
		JOIN users u ON u.id = o.purchaser_id
		LEFT JOIN user_profiles up ON up.user_id = u.id
		JOIN ticket_tiers tt ON tt.id = t.ticket_tier_id
		LEFT JOIN events e ON e.id = tt.event_id
		LEFT JOIN event_seats_matrix esm ON esm.id = t.event_seats_matrix_id
		LEFT JOIN seats s ON s.id = esm.seat_id
		WHERE t.id::text = $1 AND t.order_id::text = $2
	`

	err := r.db.QueryRow(query, ticketID, orderID).Scan(
		&resp.TicketID,
		&resp.PurchaserName,
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

// RotateSecretForOrderTicket is the purchaser-authorized rotation path (M3
// explicit transfer / M4 panic revoke): scoped to (orderID, ticketID)
// together, identically to GetTicketAccess — the order/ticket UUID pair IS
// the authorization, matching the link-as-credential model everywhere else
// on this endpoint family. See RotateSecret for what rotation does and does
// not touch.
func (r *PostgresRepository) RotateSecretForOrderTicket(orderID string, ticketID string) error {
	newSecret := generateBase32Secret()
	res, err := r.db.Exec(
		"UPDATE tickets SET secret_key = $1, updated_at = NOW() WHERE id = $2 AND order_id = $3",
		newSecret, ticketID, orderID,
	)
	if err != nil {
		return fmt.Errorf("failed to rotate ticket secret: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("ticket not found")
	}
	return nil
}

// RotateSecret is the unscoped rotation primitive: generates a fresh base32
// secret (the SAME generateBase32Secret used by issuance — never a second
// secret representation or a derived/fallback value) and overwrites
// tickets.secret_key. Callers are responsible for authorization BEFORE
// calling this — internal/organizer and internal/admin each verify their
// own ownership/role rules first (see their SecretRotator wiring), since
// this method has no notion of who is allowed to rotate what.
//
// Rotation touches ONLY tickets.secret_key. It never writes ticket_status or
// ticket_checkins: an already-used ticket stays "used" forever — rotation
// cannot un-admit someone who already walked through the gate, it only
// changes what verifies on any FUTURE scan attempt. A re-scan of an already
// admitted ticket after rotation reports EXPIRED rather than ALREADY_USED
// (the ticketqr TOTP check runs before the ticket_status check in the
// frozen contract's check order), which is a cosmetic gate-UX difference,
// not a data or security issue — the person is already inside either way.
func (r *PostgresRepository) RotateSecret(ticketID string) (string, error) {
	newSecret := generateBase32Secret()
	res, err := r.db.Exec(
		"UPDATE tickets SET secret_key = $1, updated_at = NOW() WHERE id = $2",
		newSecret, ticketID,
	)
	if err != nil {
		return "", fmt.Errorf("failed to rotate ticket secret: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return "", err
	}
	if n == 0 {
		return "", fmt.Errorf("ticket not found")
	}
	return newSecret, nil
}

// RecordBookingAccess is M5's write side: one row per secret fetch through
// GET /order-access/{orderId}/tickets/{ticketId}, the endpoint that
// actually returns a ticket's secret_key. The order-level overview endpoint
// is deliberately NOT logged here — it never returns a secret, so it isn't
// "a secret fetch" in the sense the mitigation is about.
func (r *PostgresRepository) RecordBookingAccess(orderID string, ticketID string, ipHash string, uaHash string) error {
	_, err := r.db.Exec(
		"INSERT INTO booking_access_log (order_id, ticket_id, ip_hash, ua_hash) VALUES ($1, $2, $3, $4)",
		orderID, ticketID, ipHash, uaHash,
	)
	return err
}

// CountDistinctBookingAccessDevices powers the organizer-facing "accessed
// by N distinct devices" surfacing — a device is approximated as one
// (ip_hash, ua_hash) pair, which is the same heuristic the log itself
// stores; no additional fingerprinting signal is collected or derived.
func (r *PostgresRepository) CountDistinctBookingAccessDevices(orderID string) (int, error) {
	var count int
	err := r.db.QueryRow(
		"SELECT COUNT(DISTINCT (ip_hash, ua_hash)) FROM booking_access_log WHERE order_id = $1",
		orderID,
	).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}
