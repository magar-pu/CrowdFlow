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
	// Tickets is one row per issued ticket on the order, for addressing the
	// e-ticket email to each attendee separately (plan decision 24) — the
	// whole point of the per-ticket booking link is that attendees on the
	// same order never see each other's details, so the purchaser-level
	// email and any attendee-level emails must be distinct sends, not one
	// email cc'd or bcc'd to everyone.
	Tickets []OrderMailTicket
}

// OrderMailTicket is one issued ticket's addressing info for e-ticket
// dispatch: which attendee it belongs to (if their email differs from the
// purchaser's) and which ticket-level booking link to send them.
type OrderMailTicket struct {
	TicketID      string
	AttendeeEmail string
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

// Attendee is one order_attendees row, written at order creation and later
// read by internal/ticket.GenerateTicketsForPaidOrder to issue the matching
// ticket. NIKEnc is already AES-GCM ciphertext by the time it reaches the
// repository — see resolveAttendees, the only place plaintext NIK exists in
// this package.
type Attendee struct {
	// SeatMatrixID is nil for general admission.
	SeatMatrixID *int
	TicketTierID int
	FullName     string
	NIKEnc       []byte
	Email        string
	Phone        string
	DOB          time.Time
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

// TicketIssuer issues tickets for an order that has just been marked paid.
// The one implementation is ticket.TicketService.IssueForPaidOrder, wired in
// from main.go the same way mailService is — this narrow interface exists so
// payment does not import the whole internal/ticket surface (and so neither
// package needs to import the other; internal/ticket does not depend on
// internal/payment at all).
//
// Both callers that can mark an order paid — the buyer-triggered
// POST /orders/complete-payment (ticket.TicketService.CompletePayment) and
// this package's Midtrans webhook (HandleMidtransWebhook) — go through this
// single implementation. There used to be a second, SQL-only issuance query
// inside UpdateOrderStatus that diverged from it: it never wrote
// order_attendees data and generated secret_key as md5-hex instead of
// base32. That query is gone; see the comment on UpdateOrderStatus.
type TicketIssuer interface {
	// IssueForPaidOrder issues one ticket per order_attendees row for
	// orderID and returns how many tickets exist for the order afterward
	// (including any issued by an earlier, idempotent call).
	IssueForPaidOrder(orderID string) (int, error)
}

type Repository interface {
	CreateOrder(ctx context.Context, order *Order) error

	// CreateOrderItems writes the per-tier breakdown of an order. Called in the
	// same request as CreateOrder, from the hold — never from the client's cart.
	CreateOrderItems(ctx context.Context, orderID string, items []OrderItem) error

	// CreateOrderAttendees writes the per-ticket identity captured at
	// checkout. Called in the same request as CreateOrder/CreateOrderItems.
	CreateOrderAttendees(ctx context.Context, orderID string, attendees []Attendee) error

	// ResolveSeatMatrixIDs maps seat ids (event_seats_matrix.seat_id) to the
	// event_seats_matrix row id for this event, so attendee capture can bind
	// to the same row tickets.event_seats_matrix_id references.
	ResolveSeatMatrixIDs(ctx context.Context, eventID int, seatIDs []int) (map[int]int, error)
	UpdateOrderStatus(ctx context.Context, orderID string, status string, externalTransactionID string) error
	GetOrderByID(ctx context.Context, orderID string) (*Order, error)
	GetOrderDetailsForMail(ctx context.Context, orderID string) (*OrderMailDetails, error)
	GetUserForPayment(ctx context.Context, userID int) (email string, fullName string, err error)
}

type Service interface {
	CreateMidtransTransaction(ctx context.Context, userID int, req *CreateOrderRequest) (*CreateOrderResponse, error)
	HandleMidtransWebhook(ctx context.Context, payload map[string]interface{}) error
}
