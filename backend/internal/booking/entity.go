package booking

import (
	"encoding/json"
	"time"
)

// TicketTier is the public-facing ticket tier shape for buyers - only tiers
// currently on sale (public visibility, within the sales window) are ever
// returned by Repository.ListTicketTiers.
type TicketTier struct {
	ID                int     `json:"ticket_tier_id"`
	EventID           int     `json:"event_id"`
	Name              string  `json:"name"`
	Description       string  `json:"description"`
	Price             float64 `json:"price"`
	QuotaRemaining    int     `json:"quota_remaining"`
	MaxPerTransaction int     `json:"max_per_transaction"`
}

// Seat is a single seat's live state for one event, derived from
// event_seats_matrix.current_state (not seats.seat_status, which describes
// the seat's physical/venue-level condition independent of any event).
//
// PosX/PosY are the seat's coordinates within its venue layout. They are nil
// for seats that exist relationally but were never placed in the venue
// editor; renderers skip those rather than drawing them at the origin.
type Seat struct {
	SeatID int      `json:"seat_id"`
	Row    string   `json:"row"`
	Number string   `json:"number"`
	Status string   `json:"status"` // "available" | "sold" | "held" | "blocked"
	PosX   *float64 `json:"pos_x"`
	PosY   *float64 `json:"pos_y"`
}

// SeatTier groups every assigned seat an event sells under one ticket tier.
// Tier is the only grouping a seat has: the venue layout is an untiered,
// reusable template, and the tier assignment lives per-seat in
// event_seats_matrix for this event alone.
type SeatTier struct {
	TicketTierID int     `json:"ticket_tier_id"`
	Name         string  `json:"name"`
	Price        float64 `json:"price"`
	// Color drives the seat fill on the buyer's map. Nil when the organizer
	// has not chosen one; renderers fall back to a neutral palette.
	Color *string `json:"color"`
	Seats []Seat  `json:"seats"`
}

// SeatMapLayout carries the event's bound venue layout: the decorative
// geometry blob (stage, facilities, blueprint reference, zone outlines) that
// sits behind the seats. Nil when the event has no layout bound.
type SeatMapLayout struct {
	LayoutID int             `json:"layout_id"`
	Geometry json.RawMessage `json:"geometry"`
}

// SeatMap is the full buyer-facing seating payload for one event: the
// layout backdrop, the tiers with their assigned seats, and any tiers sold
// as general admission (no assigned seats). A tier appears in exactly one of
// Tiers or GaTiers, never both.
type SeatMap struct {
	Layout  *SeatMapLayout `json:"layout"`
	Tiers   []*SeatTier    `json:"tiers"`
	GaTiers []*TicketTier  `json:"ga_tiers"`
}

// HoldRequest holds either SeatIDs (assigned seating) or Quantity (general
// admission) - never both.
//
// Assigned seating carries NO ticket_tier_id. Seats may span several tiers in
// one hold, and each seat's tier is resolved server-side from
// event_seats_matrix. That is not just convenience: when the client named the
// tier, nothing cross-checked that the seats belonged to it, so a request could
// pair a cheap tier with another tier's seats and be charged the cheap price.
//
// General admission has no seats to derive a tier from, so it still names one,
// and remains one tier per hold.
type HoldRequest struct {
	EventID int   `json:"event_id"`
	SeatIDs []int `json:"seat_ids,omitempty"`
	// General admission only; ignored when SeatIDs is set.
	TicketTierID int `json:"ticket_tier_id,omitempty"`
	Quantity     int `json:"quantity,omitempty"`
}

// SeatAssignment pairs a seat with the tier it was painted with on this event.
type SeatAssignment struct {
	SeatID       int
	TicketTierID int
}

type Hold struct {
	HoldToken string    `json:"hold_token"`
	ExpiresAt time.Time `json:"expires_at"`
}

// HoldSeat is one seat inside a hold, labelled the way the buyer saw it on the
// map. Empty for general-admission holds.
type HoldSeat struct {
	SeatID int    `json:"seat_id"`
	Row    string `json:"row"`
	Number string `json:"number"`
}

// HoldItem is one tier's worth of a hold: its seats, or its GA quantity.
type HoldItem struct {
	TicketTierID int     `json:"ticket_tier_id"`
	TierName     string  `json:"tier_name"`
	UnitPrice    float64 `json:"unit_price"`
	Quantity     int     `json:"quantity"`
	// Empty for a general-admission item.
	Seats []HoldSeat `json:"seats"`
}

// HoldDetail is everything checkout needs to render what the buyer is about to
// pay for, resolved server-side from the hold token.
//
// Checkout used to build its cart from a hardcoded mock, so the seats a buyer
// picked were discarded on navigation. Prices come from ticket_tiers here
// rather than from the client, so a tampered query string cannot change what is
// charged.
//
// Items is one entry per tier: a seated hold may span tiers.
type HoldDetail struct {
	HoldToken  string     `json:"hold_token"`
	EventID    int        `json:"event_id"`
	EventTitle string     `json:"event_title"`
	Items      []HoldItem `json:"items"`
	ExpiresAt  time.Time  `json:"expires_at"`
}

type Repository interface {
	ListTicketTiers(eventID int) ([]*TicketTier, error)
	GetSeatMap(eventID int) (*SeatMap, error)

	// IsAssignedSeating reports whether the tier sells specific seats
	// (event_seats_matrix rows exist for it) as opposed to general admission.
	IsAssignedSeating(ticketTierID int) (bool, error)

	// GetMaxPerOrder returns the tier's per-order ticket cap
	// (ticket_tiers.max_ticket_per_user). Zero or less means uncapped.
	GetMaxPerOrder(ticketTierID int) (int, error)

	// IsEventOnSale reports whether the event itself is visible to buyers:
	// approved by an auditor, published by its organizer, and not archived.
	IsEventOnSale(eventID int) (bool, error)

	// IsTierBookable reports whether the tier's event is currently on sale:
	// approved by an auditor, published by its organizer, and not archived.
	// Resolved from the TIER, not the client-supplied event_id.
	IsTierBookable(ticketTierID int) (bool, error)

	// AcquireSeatHolds attempts to lock every seat in seatIDs under holdToken.
	// All-or-nothing: if any seat is already held/sold, everything acquired
	// during this call is released before returning ok=false.
	AcquireSeatHolds(eventID int, seatIDs []int, holdToken string, ttl time.Duration) (ok bool, err error)
	ReleaseSeatHolds(eventID int, seatIDs []int, holdToken string) error

	// AcquireGAHold atomically decrements the tier's live remaining-capacity
	// counter (seeded from allocation_limit - tickets_sold on first use).
	AcquireGAHold(ticketTierID int, quantity int) (ok bool, err error)
	ReleaseGAHold(ticketTierID int, quantity int) error

	// Hold metadata lets DELETE /api/booking/holds/{token} release a hold
	// knowing only the token - it looks up what to release rather than
	// requiring the caller to resend the original HoldRequest.
	StoreHoldMetadata(holdToken string, req HoldRequest, ttl time.Duration) error
	GetHoldMetadata(holdToken string) (*HoldRequest, error)
	DeleteHoldMetadata(holdToken string) error

	// GetHoldTTL reports how long the hold has left, read from the metadata
	// key's own expiry so it cannot drift from when the lock actually lapses.
	GetHoldTTL(holdToken string) (time.Duration, error)

	// DescribeHold resolves a hold's tiers, event and seat labels from the
	// database. Prices are read here, never taken from the client.
	DescribeHold(req *HoldRequest) (*HoldDetail, error)

	// ResolveSeatTiers maps each seat to the tier it was painted with on this
	// event. Seats that do not belong to the event are simply absent from the
	// result, which is how the caller detects them.
	ResolveSeatTiers(eventID int, seatIDs []int) ([]SeatAssignment, error)
}

type Service interface {
	ListTicketTiers(eventID int) ([]*TicketTier, error)
	GetSeatMap(eventID int) (*SeatMap, error)
	CreateHold(req HoldRequest) (*Hold, error)
	GetHold(holdToken string) (*HoldDetail, error)
	ReleaseHold(holdToken string) error
}
