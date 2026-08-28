package payment

import (
	"context"
	"database/sql"
	"fmt"
	"log"
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

func (r *PostgresRepository) UpdateOrderStatus(ctx context.Context, orderID string, status string, externalTransactionID string) error {
	query := `UPDATE orders SET status = $1, external_transaction_id = $2 WHERE id = $3`
	_, err := r.db.ExecContext(ctx, query, status, externalTransactionID, orderID)
	if err != nil {
		return err
	}

	if status == "paid" {
		// Issue one ticket per ticket bought, against the tier it was actually
		// bought from, by expanding order_items.
		//
		// This previously inserted exactly ONE row per order regardless of
		// quantity, and picked the tier with
		//   COALESCE((SELECT id FROM ticket_tiers WHERE event_id = o.event_id
		//             LIMIT 1),
		//            (SELECT id FROM ticket_tiers LIMIT 1), 1)
		// — an arbitrary tier of the right event, falling back to an arbitrary
		// tier of ANY event, falling back to the literal id 1. A buyer of four
		// tickets got one, and it could be attributed to a different event
		// entirely. generate_series expands each order_items row into its
		// quantity, and unit_price is the price that tier actually sold for
		// rather than the whole order's net_amount.
		genQuery := `
			INSERT INTO tickets (order_id, ticket_tier_id, attendee_full_name, attendee_email, ticket_status, unit_price, secret_key, created_at, updated_at)
			SELECT
				o.id,
				oi.ticket_tier_id,
				COALESCE(up.full_name, 'Ticket Holder'),
				u.email,
				'issued'::ticket_status,
				oi.unit_price,
				md5(random()::text || clock_timestamp()::text),
				NOW(),
				NOW()
			FROM orders o
			JOIN order_items oi ON oi.order_id = o.id
			JOIN users u ON o.purchaser_id = u.id
			LEFT JOIN user_profiles up ON u.id = up.user_id
			CROSS JOIN generate_series(1, oi.quantity)
			WHERE o.id = $1 AND NOT EXISTS (SELECT 1 FROM tickets t WHERE t.order_id = o.id)
			ON CONFLICT DO NOTHING
		`
		if _, err := r.db.ExecContext(ctx, genQuery, orderID); err != nil {
			// Previously discarded with `_, _ =`. A buyer who has paid and
			// received no ticket is the worst failure this system has, so it
			// must at least reach the log. Returning the error here would tell
			// Midtrans the webhook failed and invite a retry that re-runs the
			// (idempotent) insert, which is the behaviour we want.
			log.Printf("[PAYMENT TICKET ERROR] order %s marked paid but ticket issuance failed: %v", orderID, err)
			return fmt.Errorf("ticket issuance failed for order %s: %w", orderID, err)
		}
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
