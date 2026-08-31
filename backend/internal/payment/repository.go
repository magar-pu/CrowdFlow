package payment

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
)

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) CreateOrder(ctx context.Context, order *Order) error {
	query := `
		INSERT INTO orders (
			purchaser_id, event_id, order_type, ticket_face_value_total,
			platform_fee_rate, platform_fee, platform_fee_ppn, gateway_fee,
			gateway_fee_ppn, ppn_rate, entertainment_tax_rate, entertainment_tax_amount,
			gross_amount, net_amount, payment_provider, payment_type, status, expires_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
		) RETURNING id
	`
	err := r.db.QueryRowContext(
		ctx, query,
		order.PurchaserID, order.EventID, order.OrderType, order.TicketFaceValueTotal,
		order.PlatformFeeRate, order.PlatformFee, order.PlatformFeePPN, order.GatewayFee,
		order.GatewayFeePPN, order.PPNRate, order.EntertainmentTaxRate, order.EntertainmentTaxAmount,
		order.GrossAmount, order.NetAmount, order.PaymentProvider, order.PaymentType, order.Status, order.ExpiresAt,
	).Scan(&order.ID)

	return err
}

// CreateOrderItems writes the per-tier breakdown of an order in one statement.
// order_items has existed since migration 0011 but nothing ever wrote to it,
// which is why ticket issuance had to guess the tier.
func (r *PostgresRepository) CreateOrderItems(ctx context.Context, orderID string, items []OrderItem) error {
	if len(items) == 0 {
		return nil
	}

	// Built as one multi-row VALUES rather than a loop of single inserts so the
	// whole breakdown lands in one round trip and one implicit transaction —
	// a partially-written breakdown would under-issue tickets later.
	// Placeholders are generated positionally; no value is ever interpolated
	// into the SQL text.
	placeholders := make([]string, 0, len(items))
	args := make([]interface{}, 0, 1+len(items)*4)
	args = append(args, orderID)
	for i, item := range items {
		base := i*4 + 2 // $1 is order_id
		placeholders = append(placeholders, fmt.Sprintf("($1, $%d, $%d, $%d, $%d)", base, base+1, base+2, base+3))
		args = append(args, item.TicketTierID, item.Quantity, item.UnitPrice, item.Subtotal)
	}

	query := `
		INSERT INTO order_items (order_id, ticket_tier_id, quantity, unit_price, subtotal)
		VALUES ` + strings.Join(placeholders, ", ")

	_, err := r.db.ExecContext(ctx, query, args...)
	return err
}

// CreateOrderAttendees writes the identity captured at checkout for every
// ticket in the order. Mirrors CreateOrderItems: one multi-row INSERT so a
// partial write cannot under-capture attendees for some tickets and not
// others.
func (r *PostgresRepository) CreateOrderAttendees(ctx context.Context, orderID string, attendees []Attendee) error {
	if len(attendees) == 0 {
		return nil
	}

	placeholders := make([]string, 0, len(attendees))
	args := make([]interface{}, 0, 1+len(attendees)*7)
	args = append(args, orderID)
	for i, a := range attendees {
		base := i*7 + 2 // $1 is order_id
		placeholders = append(placeholders, fmt.Sprintf(
			"($1, $%d, $%d, $%d, $%d, $%d, $%d, $%d)",
			base, base+1, base+2, base+3, base+4, base+5, base+6,
		))
		args = append(args, a.TicketTierID, a.SeatMatrixID, a.FullName, a.NIKEnc, a.Email, a.Phone, a.DOB)
	}

	query := `
		INSERT INTO order_attendees (
			order_id, ticket_tier_id, event_seats_matrix_id, full_name, nik_enc, email, phone, dob
		) VALUES ` + strings.Join(placeholders, ", ")

	_, err := r.db.ExecContext(ctx, query, args...)
	return err
}

// ResolveSeatMatrixIDs maps each seat id to the event_seats_matrix row id
// tickets.event_seats_matrix_id actually references (not the same as the
// seat id itself). Scoped to the event, same as booking's ResolveSeatTiers,
// so a seat id from another event cannot resolve here either.
func (r *PostgresRepository) ResolveSeatMatrixIDs(ctx context.Context, eventID int, seatIDs []int) (map[int]int, error) {
	result := make(map[int]int, len(seatIDs))
	if len(seatIDs) == 0 {
		return result, nil
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT seat_id, id
		FROM event_seats_matrix
		WHERE event_id = $1 AND seat_id = ANY($2::int[])
	`, eventID, intArrayLiteral(seatIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var seatID, matrixID int
		if err := rows.Scan(&seatID, &matrixID); err != nil {
			return nil, err
		}
		result[seatID] = matrixID
	}
	return result, rows.Err()
}

// intArrayLiteral renders ids as a Postgres array literal for use with
// ANY($n::int[]). Mirrors internal/booking's helper of the same name —
// payment does not import booking beyond the narrow HoldReader interface,
// so this is kept local rather than exported from there.
func intArrayLiteral(ids []int) string {
	if len(ids) == 0 {
		return "{}"
	}
	var b strings.Builder
	b.WriteByte('{')
	for i, id := range ids {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString(strconv.Itoa(id))
	}
	b.WriteByte('}')
	return b.String()
}

// UpdateOrderStatus only updates the order row. Ticket issuance used to
// happen here too, in a second, SQL-only implementation that diverged from
// internal/ticket.GenerateTicketsForPaidOrder — it knew nothing about
// order_attendees (every ticket got the purchaser's own name/email) and
// generated secret_key as md5-hex instead of base32, which a base32 decoder
// silently truncates rather than rejects. Both callers that can mark an
// order paid now share the one Go implementation — see
// PaymentService.HandleMidtransWebhook, which calls it via the TicketIssuer
// interface after this returns.
func (r *PostgresRepository) UpdateOrderStatus(ctx context.Context, orderID string, status string, externalTransactionID string) error {
	query := `UPDATE orders SET status = $1, external_transaction_id = $2 WHERE id = $3`
	_, err := r.db.ExecContext(ctx, query, status, externalTransactionID, orderID)
	if err != nil {
		return err
	}

	return nil
}

func (r *PostgresRepository) GetOrderByID(ctx context.Context, orderID string) (*Order, error) {
	order := &Order{}
	query := `SELECT id, purchaser_id, event_id, order_type, gross_amount, status, payment_provider FROM orders WHERE id = $1`
	err := r.db.QueryRowContext(ctx, query, orderID).Scan(
		&order.ID, &order.PurchaserID, &order.EventID, &order.OrderType,
		&order.GrossAmount, &order.Status, &order.PaymentProvider,
	)
	if err != nil {
		return nil, err
	}
	return order, nil
}

func (r *PostgresRepository) GetOrderDetailsForMail(ctx context.Context, orderID string) (*OrderMailDetails, error) {
	details := &OrderMailDetails{TicketCode: orderID}
	query := `
		SELECT 
			u.email,
			e.event_name,
			TO_CHAR(e.event_start, 'DD Month YYYY') || ' • ' || COALESCE(v.name, 'Gelora Bung Karno'),
			COALESCE((SELECT tt.name FROM tickets t JOIN ticket_tiers tt ON t.ticket_tier_id = tt.id WHERE t.order_id = $1 LIMIT 1), 'General Admission')
		FROM orders o
		JOIN users u ON o.purchaser_id = u.id
		JOIN events e ON o.event_id = e.id
		LEFT JOIN venues v ON e.venue_id = v.id
		WHERE o.id = $1
	`
	err := r.db.QueryRowContext(ctx, query, orderID).Scan(
		&details.PurchaserEmail,
		&details.EventTitle,
		&details.DateVenue,
		&details.TicketTier,
	)
	if err != nil {
		return nil, err
	}

	// One row per issued ticket, so the caller can address the e-ticket
	// email to each attendee separately rather than sending everyone the
	// purchaser's own link (plan decision 24).
	rows, err := r.db.QueryContext(ctx, `
		SELECT id::text, attendee_email FROM tickets WHERE order_id = $1 ORDER BY created_at ASC
	`, orderID)
	if err != nil {
		return nil, fmt.Errorf("failed to load tickets for mail: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var t OrderMailTicket
		if err := rows.Scan(&t.TicketID, &t.AttendeeEmail); err != nil {
			return nil, err
		}
		details.Tickets = append(details.Tickets, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return details, nil
}

func (r *PostgresRepository) GetUserForPayment(ctx context.Context, userID int) (string, string, error) {
	var email, fullName string
	query := `
		SELECT u.email, COALESCE(up.full_name, 'Ticket Purchaser')
		FROM users u
		LEFT JOIN user_profiles up ON u.id = up.user_id
		WHERE u.id = $1
	`
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&email, &fullName)
	if err != nil {
		return "", "", err
	}
	return email, fullName, nil
}
