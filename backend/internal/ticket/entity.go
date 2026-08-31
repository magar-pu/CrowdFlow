package ticket

import (
	"time"
)

type Ticket struct {
	ID               string `json:"id"`
	OrderID          string `json:"orderId"`
	EventID          int    `json:"eventId"`
	EventName        string `json:"eventName"`
	TicketTierID     int    `json:"ticketTierId"`
	TierName         string `json:"tierName"`
	AttendeeFullName string `json:"attendeeFullName"`
	AttendeeEmail    string `json:"attendeeEmail"`
	AttendeePhone    string `json:"attendeePhone,omitempty"`
	// NIK is deliberately absent here: this struct backs the buyer-facing
	// "my tickets" list/detail (GetUserTickets/GetTicketByID, both scoped to
	// the requesting purchaser), and decrypted NIK is for the organizer and
	// the ticketman at the gate only — see plan decision 23.
	TicketStatus  string     `json:"ticketStatus"`
	SeatLabel     string     `json:"seatLabel"`
	UnitPrice     float64    `json:"unitPrice"`
	EventStart    *time.Time `json:"eventStart,omitempty"`
	VenueName     string     `json:"venueName,omitempty"`
	VenueCity     string     `json:"venueCity,omitempty"`
	CoverImageURL string     `json:"coverImageUrl,omitempty"`
	SecretKey     string     `json:"secretKey,omitempty"`
	EventEndTime  string     `json:"eventEndTime,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

type CompletePaymentRequest struct {
	OrderID string `json:"orderId"`
}

type CompletePaymentResponse struct {
	OrderID      string `json:"orderId"`
	Status       string `json:"status"`
	TicketsCount int    `json:"ticketsCount"`
	Message      string `json:"message"`
}

// OrderAccessTicket is one row of the order-level booking overview
// (GET /order-access/{orderId}) — deliberately no secret_key and no NIK,
// since this endpoint is reachable by anyone holding the order link and is
// meant only to let the purchaser see/jump to each attendee's own ticket
// page. NIK stays behind organizer/ticketman-only paths (plan decision 23).
type OrderAccessTicket struct {
	TicketID         string `json:"ticketId"`
	AttendeeFullName string `json:"attendeeFullName"`
	TierName         string `json:"tierName"`
	SeatLabel        string `json:"seatLabel"`
	TicketStatus     string `json:"ticketStatus"`
}

// OrderAccessResponse backs GET /order-access/{orderId} — the purchaser's
// overview page. Link-as-credential, no JWT: the order UUID (122-bit,
// gen_random_uuid()) is itself the access control (plan decision 4 and the
// "link-forwarding gap" mitigations section).
type OrderAccessResponse struct {
	OrderID       string              `json:"orderId"`
	OrderIDShort  string              `json:"orderIdShort"`
	PurchaserName string              `json:"purchaserName"`
	EventName     string              `json:"eventName"`
	EventStart    *time.Time          `json:"eventStart,omitempty"`
	VenueName     string              `json:"venueName,omitempty"`
	VenueCity     string              `json:"venueCity,omitempty"`
	CoverImageURL string              `json:"coverImageUrl,omitempty"`
	Tickets       []OrderAccessTicket `json:"tickets"`
}

// TicketAccessResponse backs GET /order-access/{orderId}/tickets/{ticketId}
// — the single-attendee page that actually drives DigitalTicketCard. Scoped
// to one ticket only, so per-attendee links can't be used to enumerate the
// rest of the order (see plan decision 4: "per-ticket links exist
// specifically so attendees don't see each other's NIK" — this endpoint
// still never returns NIK either way). PurchaserName/OrderIDShort are
// carried through for the M7 on-page watermark.
type TicketAccessResponse struct {
	TicketID         string `json:"ticketId"`
	OrderID          string `json:"orderId"`
	OrderIDShort     string `json:"orderIdShort"`
	PurchaserName    string `json:"purchaserName"`
	EventID          int    `json:"eventId"`
	EventName        string `json:"eventName"`
	TierName         string `json:"tierName"`
	AttendeeFullName string `json:"attendeeFullName"`
	AttendeeEmail    string `json:"attendeeEmail"`
	SeatLabel        string `json:"seatLabel"`
	TicketStatus     string `json:"ticketStatus"`
	SecretKey        string `json:"secretKey"`
	EventEndTime     string `json:"eventEndTime"`
}

// RotateSecretResponse backs every "rotate this ticket's secret" endpoint
// (purchaser via order-access, organizer, admin — M3/M4). It deliberately
// does NOT echo the new secret_key back: rotation is a write, not a read,
// and the only sanctioned way to fetch a secret is the existing GET
// order-access endpoints, so a caller that just rotated re-fetches from
// there like anyone else. See ticket.go's RotateSecret doc comment for what
// rotation does and does not touch.
type RotateSecretResponse struct {
	TicketID string `json:"ticketId"`
	Rotated  bool   `json:"rotated"`
}
