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
	return err
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
