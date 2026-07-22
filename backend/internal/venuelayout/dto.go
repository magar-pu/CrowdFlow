package venuelayout

import (
	"encoding/json"
	"time"
)

// LayoutDetail is the full read shape returned by GET /layouts/{id}: the layout
// header (with its decorative geometry, including zone outlines) plus every seat
// belonging to it. The venue editor reads its whole state from this one document.
type LayoutDetail struct {
	Layout
	Seats []*Seat `json:"seats"`
}

// CreateLayoutRequest is the body of POST /venues/{id}/layouts. The new layout
// is claimed by the caller (owner_user_id = caller) and starts empty; seats and
// geometry arrive via a subsequent PUT save.
type CreateLayoutRequest struct {
	Name       string `json:"name"`
	Visibility string `json:"visibility"` // "public" | "event_exclusive"; defaults to "public"
}

// SaveLayoutRequest is the body of PUT /venues/{id}/layouts/{lid} - the whole
// editor state in one document. Seats diff against what is stored: an element
// with a non-nil ID is updated; a nil ID is inserted; a stored row absent from
// the payload is deleted (subject to the in-use guard).
//
// Zone outlines are decoration and travel inside Geometry, alongside the stage
// and facilities - they are not rows and need no diffing.
type SaveLayoutRequest struct {
	Name       string          `json:"name"`
	Visibility string          `json:"visibility"`
	Geometry   json.RawMessage `json:"geometry"`

	// ExpectedUpdatedAt is the updated_at the client loaded. The save is
	// rejected with 409 if the layout changed since (optimistic locking).
	ExpectedUpdatedAt time.Time `json:"expected_updated_at"`

	Seats []SeatInput `json:"seats"`
}

// SeatInput is one seat in a save payload. Key is the client's stable handle,
// used to build seat_id_map in the response; ID is the real DB id when the seat
// already exists.
type SeatInput struct {
	Key    string   `json:"key"`
	ID     *int     `json:"id"`
	Row    string   `json:"row"`
	Number string   `json:"number"`
	PosX   *float64 `json:"pos_x"`
	PosY   *float64 `json:"pos_y"`
}

// SaveLayoutResponse returns the persisted layout plus the map the client uses
// to reconcile its temporary ids to real DB ids. Only newly-inserted seats
// appear in the map (updates already had real ids).
type SaveLayoutResponse struct {
	Layout    *LayoutDetail  `json:"layout"`
	SeatIDMap map[string]int `json:"seat_id_map"` // client key -> new DB id
}
