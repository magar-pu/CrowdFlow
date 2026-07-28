package payment

import (
	"context"
	"database/sql"
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

func (r *PostgresRepository) UpdateOrderStatus(ctx context.Context, orderID string, status string, externalTransactionID string) error {
	query := `UPDATE orders SET status = $1, external_transaction_id = $2 WHERE id = $3`
	_, err := r.db.ExecContext(ctx, query, status, externalTransactionID, orderID)
	if err != nil {
		return err
	}

	if status == "paid" {
		// Auto-generate ticket for paid order if missing
		genQuery := `
			INSERT INTO tickets (order_id, ticket_tier_id, attendee_full_name, attendee_email, ticket_status, unit_price, secret_key, created_at, updated_at)
			SELECT 
				o.id, 
				COALESCE(
					(SELECT id FROM ticket_tiers WHERE event_id = o.event_id LIMIT 1),
					(SELECT id FROM ticket_tiers LIMIT 1),
					1
				), 
				COALESCE(up.full_name, 'Ticket Holder'), 
				u.email, 
				'issued'::ticket_status, 
				o.net_amount, 
				md5(random()::text), 
				NOW(), 
				NOW()
			FROM orders o 
			JOIN users u ON o.purchaser_id = u.id 
			LEFT JOIN user_profiles up ON u.id = up.user_id 
			WHERE o.id = $1 AND NOT EXISTS (SELECT 1 FROM tickets t WHERE t.order_id = o.id)
			ON CONFLICT DO NOTHING
		`
		_, _ = r.db.ExecContext(ctx, genQuery, orderID)
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
