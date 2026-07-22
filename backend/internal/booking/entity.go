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

// SeatSection groups the seats belonging to one event_sections row (a
// venue_sections row scoped to this specific event) together with the
// ticket tier that prices it.
//
// Shape and Color are the section's decorative geometry from the venue
// layout. Both are nil for tag-only sections that group seats commercially
// without occupying an area on the map.
type SeatSection struct {
	EventSectionID int             `json:"event_section_id"`
	SectionID      int             `json:"section_id"`
	Name           string          `json:"name"`
	TicketTierID   int             `json:"ticket_tier_id"`
	Price          float64         `json:"price"`
	Shape          json.RawMessage `json:"shape,omitempty"`
	Color          *string         `json:"color"`
	Seats          []Seat          `json:"seats"`
}

// SeatMapLayout carries the event's bound venue layout: the decorative
// geometry blob (stage, facilities, blueprint reference) that sits behind
// the sections. Nil when the event has no layout bound.
type SeatMapLayout struct {
	LayoutID int             `json:"layout_id"`
	Geometry json.RawMessage `json:"geometry"`
}

// SeatMap is the full buyer-facing seating payload for one event: the
// layout backdrop, the priced sections with their seats, and any tiers sold
// as general admission (no assigned seats). A tier appears in exactly one of
// Sections or GaTiers, never both.
type SeatMap struct {
	Layout   *SeatMapLayout `json:"layout"`
	Sections []*SeatSection `json:"sections"`
	GaTiers  []*TicketTier  `json:"ga_tiers"`
}

// HoldRequest holds either SeatIDs (assigned seating) or Quantity (general
// admission) for a single ticket tier - never both. Which mode applies is
// determined by whether the tier has any assigned seats in event_seats_matrix.
type HoldRequest struct {
	EventID      int   `json:"event_id"`
	TicketTierID int   `json:"ticket_tier_id"`
	SeatIDs      []int `json:"seat_ids,omitempty"`
	Quantity     int   `json:"quantity,omitempty"`
}

type Hold struct {
	HoldToken string    `json:"hold_token"`
	ExpiresAt time.Time `json:"expires_at"`
}

type Repository interface {
	ListTicketTiers(eventID int) ([]*TicketTier, error)
	GetSeatMap(eventID int) (*SeatMap, error)

	// IsAssignedSeating reports whether the tier sells specific seats
	// (event_seats_matrix rows exist for it) as opposed to general admission.
	IsAssignedSeating(ticketTierID int) (bool, error)

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
}

type Service interface {
	ListTicketTiers(eventID int) ([]*TicketTier, error)
	GetSeatMap(eventID int) (*SeatMap, error)
	CreateHold(req HoldRequest) (*Hold, error)
	ReleaseHold(holdToken string) error
}
