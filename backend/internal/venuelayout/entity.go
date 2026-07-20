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
	ErrNotFound  = errors.New("venue layout not found")
	ErrForbidden = errors.New("not allowed to access this venue layout")
)

// Layout is one saved seat-map plan for a venue. The decorative geometry
// (stage, facilities, blueprint ref, section shapes) lives in Geometry as an
// opaque JSONB document; per-seat positions are stored relationally on seats.
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

// Seat is one physical seat's identity, position and (optional) section tag.
// The canonical identity is the integer ID - the same value orders, tickets and
// the scanner already reference. Row/Number are display labels only.
type Seat struct {
	ID        int      `json:"id"`
	SectionID *int     `json:"section_id"`
	Row       string   `json:"row"`
	Number    string   `json:"number"`
	PosX      *float64 `json:"pos_x"`
	PosY      *float64 `json:"pos_y"`
}

// Section is the commercial/decorative grouping a seat can be tagged with.
// Shape is optional decorative geometry; it may be null for pure tag sections.
type Section struct {
	ID    int             `json:"id"`
	Name  string          `json:"section_name"`
	Color *string         `json:"color"`
	Shape json.RawMessage `json:"shape,omitempty"`
}

type Repository interface {
	// ListLayouts returns the venue's layouts the user may pick: every public
	// layout plus the user's own event-exclusive ones. Summary only (no seats).
	ListLayouts(ctx context.Context, venueID, userID int) ([]*Layout, error)

	// GetLayout loads a single layout with its seats and sections, or
	// ErrNotFound if no such layout exists. Access is enforced in the service.
	GetLayout(ctx context.Context, layoutID int) (*LayoutDetail, error)
}

type Service interface {
	ListLayouts(ctx context.Context, venueID, userID int) ([]*Layout, error)
	GetLayout(ctx context.Context, layoutID, userID int) (*LayoutDetail, error)
}
