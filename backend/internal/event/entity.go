package event

import "time"

type Venue struct {
	ID            int       `json:"venue_id"`
	Name          string    `json:"name"`
	Address       string    `json:"address"`
	City          string    `json:"city"`
	Province      string    `json:"province"`
	PostalCode    string    `json:"postal_code"`
	TotalCapacity int       `json:"total_capacity"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type Organizer struct {
	ID        int    `json:"organizer_id"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
}

type EventType struct {
	ID        int    `json:"event_type_id"`
	EventType string `json:"event_type"`
}

type Event struct {
	ID                            int       `json:"event_id"`
	VenueID                       int       `json:"venue_id"`
	OrganizerID                   int       `json:"organizer_id"`
	EventName                     string    `json:"title"` // Mapped to 'title' for frontend
	Description                   string    `json:"description"`
	EventStart                    time.Time `json:"starts_at"` // Mapped to 'starts_at' for frontend
	EventEnd                      time.Time `json:"ends_at"`   // Mapped to 'ends_at' for frontend
	EntertainmentTaxRate          float64   `json:"entertainment_tax_rate"`
	EntertainmentTaxPassedToBuyer bool      `json:"entertainment_tax_passed_to_buyer"`
	Status                        string    `json:"status"` // "draft", "pending_review", "approved", "rejected"
	CreatedAt                     time.Time `json:"created_at"`
	UpdatedAt                     time.Time `json:"updated_at"`
	EventTypeID                   int       `json:"event_type_id"`
	CoverImageURL                 string    `json:"cover_image_url"`
	LayoutID                      *int      `json:"layout_id"` // bound venue layout; nil = none
	// PublishedAt is the organizer's decision to go on sale, distinct from the
	// auditor's `status`. nil means withdrawn or never published, which hides
	// the event from buyers even while it stays 'approved'.
	PublishedAt *time.Time `json:"published_at"`
	// GoogleMapsURL is the organizer's own map link for this event (0029).
	// Empty means none set — clients fall back to a name+address search.
	GoogleMapsURL string `json:"google_maps_url"`
	// StartingPrice is the cheapest ticket tier for this event (MIN of
	// ticket_tiers.price). nil when the event has no tiers yet, which is
	// distinct from a genuine price of 0 — callers must not conflate them.
	StartingPrice *float64   `json:"starting_price"`
	// RecentSales is the number of tickets sold on paid orders in the last 7
	// days. It is the only sales-velocity signal the public listing exposes,
	// and it is what "trending" actually means here — there is no other one.
	RecentSales int        `json:"recent_sales"`
	Venue       *Venue     `json:"venue,omitempty"`
	Organizer   *Organizer `json:"organizer,omitempty"`
}

// EventSort names an ordering for the public event listing.
//
// The public query previously had no ORDER BY at all, so row order was whatever
// Postgres happened to return and LIMIT/OFFSET paging could duplicate or skip
// events between pages. Every ordering below ends in e.id so paging is stable.
type EventSort string

const (
	// SortNewest orders by creation time. It is the default because the
	// /events browse page shares this endpoint and expects the full catalogue.
	SortNewest EventSort = "newest"
	// SortUpcoming orders by start time and hides events that have already
	// finished.
	SortUpcoming EventSort = "upcoming"
	// SortTrending orders by RecentSales.
	SortTrending EventSort = "trending"
)

// ParseEventSort maps a query-string value onto a known sort, falling back to
// SortNewest for anything unrecognised. All user input must pass through here:
// the sort selects one of a fixed set of SQL fragments and is never
// interpolated into the query.
func ParseEventSort(s string) EventSort {
	switch EventSort(s) {
	case SortUpcoming:
		return SortUpcoming
	case SortTrending:
		return SortTrending
	default:
		return SortNewest
	}
}

type Repository interface {
	GetAll(limit, offset int, sort EventSort) ([]*Event, error)
	GetAllAdmin(limit, offset int) ([]*Event, error)
	GetByID(id int) (*Event, error)
	Create(event *Event) error
	Update(event *Event) error
	SetEventLayout(eventID int, layoutID *int) error
	ListVenues() ([]*Venue, error)
	ListEventTypes() ([]*EventType, error)
}

type Service interface {
	ListEvents(limit, offset int, sort EventSort) ([]*Event, error)
	GetAllAdminEvents(limit, offset int) ([]*Event, error)
	GetEventDetails(id int) (*Event, error)
	CreateEvent(event *Event) error
	UpdateEvent(event *Event) error
	BindEventLayout(eventID int, layoutID *int) error
	PublishEvent(id int) error
	ListVenues() ([]*Venue, error)
	ListEventTypes() ([]*EventType, error)
}
