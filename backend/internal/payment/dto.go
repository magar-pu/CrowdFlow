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
