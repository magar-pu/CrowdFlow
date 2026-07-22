package ticket

import (
	"time"
)

type Ticket struct {
	ID                 string    `json:"id"`
	OrderID            string    `json:"orderId"`
	EventID            int       `json:"eventId"`
	EventName          string    `json:"eventName"`
	TicketTierID       int       `json:"ticketTierId"`
	TierName           string    `json:"tierName"`
	AttendeeFullName   string    `json:"attendeeFullName"`
	AttendeeEmail      string    `json:"attendeeEmail"`
	AttendeePhone      string    `json:"attendeePhone,omitempty"`
	AttendeeNik        string    `json:"attendeeNik,omitempty"`
	TicketStatus       string    `json:"ticketStatus"`
	SeatLabel          string    `json:"seatLabel"`
	UnitPrice          float64   `json:"unitPrice"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

type TicketToken struct {
	ID          int       `json:"id"`
	TicketID    string    `json:"ticketId"`
	SecureToken string    `json:"secureToken"`
	TimeWindow  int64     `json:"timeWindow"`
	Version     int       `json:"version"`
	IsCurrent   bool      `json:"isCurrent"`
	IssuedAt    time.Time `json:"issuedAt"`
	ExpiredAt   time.Time `json:"expiredAt"`
}

type TicketQRResponse struct {
	TicketID         string `json:"ticketId"`
	SecureToken      string `json:"secureToken"`
	TimeWindow       int64  `json:"timeWindow"`
	RefreshInSeconds int    `json:"refreshInSeconds"`
	ExpiredAt        string `json:"expiredAt"`
}

type CompletePaymentRequest struct {
	OrderID string `json:"orderId"`
}

type CompletePaymentResponse struct {
	OrderID      string   `json:"orderId"`
	Status       string   `json:"status"`
	TicketsCount int      `json:"ticketsCount"`
	Message      string   `json:"message"`
}
