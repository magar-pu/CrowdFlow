package payment

import (
	"context"
	"time"

	"crowdflow-backend/internal/booking"
)

// Order represents the database entity for the orders table.
type Order struct {
	ID                     string    `json:"id"`
	PurchaserID            int       `json:"purchaser_id"`
	EventID                int       `json:"event_id"`
	OrderType              string    `json:"order_type"`
	TicketFaceValueTotal   float64   `json:"ticket_face_value_total"`
	PlatformFeeRate        float64   `json:"platform_fee_rate"`
	PlatformFee            float64   `json:"platform_fee"`
	PlatformFeePPN         float64   `json:"platform_fee_ppn"`
	GatewayFee             float64   `json:"gateway_fee"`
	GatewayFeePPN          float64   `json:"gateway_fee_ppn"`
	PPNRate                float64   `json:"ppn_rate"`
	EntertainmentTaxRate   float64   `json:"entertainment_tax_rate"`
	EntertainmentTaxAmount float64   `json:"entertainment_tax_amount"`
	GrossAmount            float64   `json:"gross_amount"`
	NetAmount              float64   `json:"net_amount"`
	PaymentProvider        string    `json:"payment_provider"`
	PaymentType            string    `json:"payment_type"`
	ExternalTransactionID  string    `json:"external_transaction_id"`
	Status                 string    `json:"status"`
	ExpiresAt              time.Time `json:"expires_at"`
}

type OrderMailDetails struct {
	PurchaserEmail string
	EventTitle     string
	DateVenue      string
	TicketTier     string
	TicketCode     string
}

// OrderItem is one tier's line on an order, written from the hold at order
// creation. Populating order_items is what makes it possible to issue the right
// number of tickets against the right tier when payment settles: before this,
// ticket issuance had to guess the tier with a LIMIT 1 over the whole table.
type OrderItem struct {
	TicketTierID int
	Quantity     int
	UnitPrice    float64
	Subtotal     float64
}

// HoldReader resolves a hold token to what the buyer is actually entitled to
// buy, with prices read from ticket_tiers server-side.
//
// Deliberately a narrow interface owned by this package rather than an import
// of booking.Service: payment only ever needs to read a hold, and depending on
// the whole booking surface would make the coupling two-way and the service
// harder to test. *booking.BookingService satisfies it as-is.
type HoldReader interface {
	GetHold(holdToken string) (*booking.HoldDetail, error)
}

type Repository interface {
	CreateOrder(ctx context.Context, order *Order) error

	// CreateOrderItems writes the per-tier breakdown of an order. Called in the
	// same request as CreateOrder, from the hold — never from the client's cart.
	CreateOrderItems(ctx context.Context, orderID string, items []OrderItem) error
	UpdateOrderStatus(ctx context.Context, orderID string, status string, externalTransactionID string) error
	GetOrderByID(ctx context.Context, orderID string) (*Order, error)
	GetOrderDetailsForMail(ctx context.Context, orderID string) (*OrderMailDetails, error)
	GetUserForPayment(ctx context.Context, userID int) (email string, fullName string, err error)
}

type Service interface {
	CreateMidtransTransaction(ctx context.Context, userID int, req *CreateOrderRequest) (*CreateOrderResponse, error)
	HandleMidtransWebhook(ctx context.Context, payload map[string]interface{}) error
}
