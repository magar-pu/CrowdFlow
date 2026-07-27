package payment

import (
	"context"
	"time"
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

type Repository interface {
	CreateOrder(ctx context.Context, order *Order) error
	UpdateOrderStatus(ctx context.Context, orderID string, status string, externalTransactionID string) error
	GetOrderByID(ctx context.Context, orderID string) (*Order, error)
	GetOrderDetailsForMail(ctx context.Context, orderID string) (*OrderMailDetails, error)
}

type Service interface {
	CreateMidtransTransaction(ctx context.Context, userID int, req *CreateOrderRequest) (*CreateOrderResponse, error)
	HandleMidtransWebhook(ctx context.Context, payload map[string]interface{}) error
}
