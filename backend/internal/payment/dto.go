package payment

type CreateOrderRequest struct {
	EventID       int        `json:"event_id"`
	PaymentMethod string     `json:"payment_method"` // "virtual_account", "qris", "credit_card"
	CartItems     []CartItem `json:"cart_items"`
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
