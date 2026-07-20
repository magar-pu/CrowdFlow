package venuelayout

import (
	"encoding/json"
	"time"
)

// LayoutDetail is the full read shape returned by GET /layouts/{id}: the layout
// header (with its decorative geometry) plus every seat and section belonging to
// it. The venue editor reads its whole state from this one document.
type LayoutDetail struct {
	Layout
	Sections []*Section `json:"sections"`
	Seats    []*Seat    `json:"seats"`
}

// CreateLayoutRequest is the body of POST /venues/{id}/layouts. The new layout
// is claimed by the caller (owner_user_id = caller) and starts empty; seats and
// geometry arrive via a subsequent PUT save.
type CreateLayoutRequest struct {
	Name       string `json:"name"`
	Visibility string `json:"visibility"` // "public" | "event_exclusive"; defaults to "public"
}

// SaveLayoutRequest is the body of PUT /venues/{id}/layouts/{lid} - the whole
// editor state in one document. Seats and sections both diff against what is
// stored: an element with a non-nil ID is updated; a nil ID is inserted; a
// stored row absent from the payload is deleted (subject to in-use guards).
type SaveLayoutRequest struct {
	Name       string          `json:"name"`
	Visibility string          `json:"visibility"`
	Geometry   json.RawMessage `json:"geometry"`

	// ExpectedUpdatedAt is the updated_at the client loaded. The save is
	// rejected with 409 if the layout changed since (optimistic locking).
	ExpectedUpdatedAt time.Time `json:"expected_updated_at"`

	Sections []SectionInput `json:"sections"`
	Seats    []SeatInput    `json:"seats"`
}

// SectionInput is one section in a save payload. Key is the client's stable
// handle (used to resolve SeatInput.SectionKey and to build section_id_map in
// the response); ID is the real DB id when the section already exists.
type SectionInput struct {
	Key         string          `json:"key"`
	ID          *int            `json:"id"`
	SectionName string          `json:"section_name"`
	Color       *string         `json:"color"`
	Shape       json.RawMessage `json:"shape,omitempty"`
}

// SeatInput is one seat in a save payload. SectionKey references a SectionInput
// in the SAME payload (real or temp) - or is nil for a section-free seat.
type SeatInput struct {
	Key        string   `json:"key"`
	ID         *int     `json:"id"`
	SectionKey *string  `json:"section_key"`
	Row        string   `json:"row"`
	Number     string   `json:"number"`
	PosX       *float64 `json:"pos_x"`
	PosY       *float64 `json:"pos_y"`
}

// SaveLayoutResponse returns the persisted layout plus the maps the client uses
// to reconcile its temporary ids to real DB ids. Only newly-inserted rows
// appear in the maps (updates already had real ids).
type SaveLayoutResponse struct {
	Layout       *LayoutDetail  `json:"layout"`
	SectionIDMap map[string]int `json:"section_id_map"` // client key -> new DB id
	SeatIDMap    map[string]int `json:"seat_id_map"`    // client key -> new DB id
}
