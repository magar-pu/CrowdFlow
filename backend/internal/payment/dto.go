package payment

type CreateOrderRequest struct {
	EventID       int    `json:"event_id"`
	PaymentMethod string `json:"payment_method"` // "virtual_account", "qris", "credit_card"

	// HoldToken identifies the seat/GA hold this order is paying for. It is the
	// authority on what is being bought and at what price — see
	// CreateMidtransTransaction. Required.
	HoldToken string `json:"hold_token"`

	// CartItems is DISPLAY DATA ONLY and is never used to compute money.
	//
	// It used to be summed directly into gross_amount, which meant a crafted
	// request could name its own price: {"unit_face_value": 1} bought a
	// Rp 5.000.000 ticket for Rp 1. Prices now come from the hold, resolved
	// server-side from ticket_tiers. Kept on the request because the client
	// still sends it and removing it would be a breaking API change, but
	// nothing in the payment path may read it for value.
	CartItems []CartItem `json:"cart_items"`

	// Attendees is the identity captured at checkout for every ticket the
	// hold contains — one entry per held seat, or per unit of quantity for
	// general admission. Required: an order without a matching attendee for
	// every ticket is rejected, see resolveAttendees.
	Attendees []AttendeeInput `json:"attendees"`
}

// AttendeeInput is one ticket's worth of attendee capture, as submitted by
// the checkout form. NIK arrives in plaintext over the request body (HTTPS)
// and is encrypted before it ever reaches the database or a log line — see
// resolveAttendees and internal/nik.
type AttendeeInput struct {
	// SeatID identifies which held seat this attendee is for. Nil for a
	// general-admission ticket, which has no seat to attach to.
	SeatID       *int   `json:"seat_id,omitempty"`
	TicketTierID int    `json:"ticket_tier_id"`
	FullName     string `json:"full_name"`
	NIK          string `json:"nik"`
	Email        string `json:"email"`
	Phone        string `json:"phone"`
	// DOB is yyyy-mm-dd.
	DOB string `json:"dob"`
}

type CartItem struct {
	CartItemID         string  `json:"cart_item_id"`
	TicketCategoryID   string  `json:"ticket_category_id"`
	TicketCategoryName string  `json:"ticket_category_name"`
	SaleChannel        string  `json:"sale_channel"`
	UnitFaceValue      float64 `json:"unit_face_value"`
	Quantity           int     `json:"quantity"`
	Currency           string  `json:"currency"`
}

type CreateOrderResponse struct {
	OrderID   string `json:"order_id"`
	SnapToken string `json:"snap_token"`
}
