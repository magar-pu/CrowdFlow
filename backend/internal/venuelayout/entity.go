package venuelayout

import (
	"context"
	"encoding/json"
	"errors"
	"time"
)

// Sentinel errors let the service signal HTTP-meaningful outcomes without the
// handler having to know about SQL or ownership rules.
var (
	ErrNotFound     = errors.New("venue layout not found")
	ErrForbidden    = errors.New("not allowed to access this venue layout")
	ErrStale        = errors.New("venue layout was modified since it was loaded")
	ErrSeatInUse    = errors.New("cannot delete a seat that is already in use for an event")
	ErrInvalidInput = errors.New("invalid venue layout payload")
)

// Layout is one saved seat-map plan for a venue - a REUSABLE TEMPLATE of pure
// geometry. The decorative geometry (stage, facilities, blueprint ref, zone
// outlines) lives in Geometry as an opaque JSONB document; per-seat positions
// are stored relationally on seats.
//
// A template carries no ticket tiers and no colouring: tier grouping is
// event-scoped and per-seat (event_seats_matrix), so one template can serve
// many events with entirely different pricing.
type Layout struct {
	ID            int             `json:"id"`
	VenueID       int             `json:"venue_id"`
	Name          string          `json:"name"`
	SchemaVersion int             `json:"schema_version"`
	Geometry      json.RawMessage `json:"geometry"`
	Visibility    string          `json:"visibility"` // "public" | "event_exclusive"
	OwnerUserID   *int            `json:"owner_user_id"`
	Status        string          `json:"status"` // "draft" | "published" | "archived"
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

// Seat is one physical seat's identity and position. The canonical identity is
// the integer ID - the same value orders, tickets and the scanner already
// reference. Row/Number are display labels only.
//
// A seat has no grouping of its own: which ticket tier sells it is decided per
// event in event_seats_matrix, never on the template.
type Seat struct {
	ID     int      `json:"id"`
	Row    string   `json:"row"`
	Number string   `json:"number"`
	PosX   *float64 `json:"pos_x"`
	PosY   *float64 `json:"pos_y"`
}

type Repository interface {
	// ListLayouts returns the venue's layouts the user may pick: every public
	// layout plus the user's own event-exclusive ones. Summary only (no seats).
	ListLayouts(ctx context.Context, venueID, userID int) ([]*Layout, error)

	// GetLayout loads a single layout with its seats and sections, or
	// ErrNotFound if no such layout exists. Access is enforced in the service.
	GetLayout(ctx context.Context, layoutID int) (*LayoutDetail, error)

	// CreateLayout inserts a new empty layout owned by ownerUserID.
	CreateLayout(ctx context.Context, venueID, ownerUserID int, req CreateLayoutRequest) (*Layout, error)

	// SaveLayout persists the whole editor state in one transaction: it locks
	// the layout, enforces ownership and the optimistic-lock check, then diffs
	// seats (insert/update/delete) and returns the id map. It may return
	// ErrNotFound, ErrForbidden, ErrStale or ErrSeatInUse.
	SaveLayout(ctx context.Context, venueID, layoutID, userID int, req SaveLayoutRequest) (*SaveLayoutResponse, error)
}

type Service interface {
	ListLayouts(ctx context.Context, venueID, userID int) ([]*Layout, error)
	GetLayout(ctx context.Context, layoutID, userID int) (*LayoutDetail, error)
	CreateLayout(ctx context.Context, venueID, ownerUserID int, req CreateLayoutRequest) (*Layout, error)
	SaveLayout(ctx context.Context, venueID, layoutID, userID int, req SaveLayoutRequest) (*SaveLayoutResponse, error)
}
