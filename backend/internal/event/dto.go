package event

import (
	"fmt"
	"time"
)

// CreateEventRequest holds incoming payload data for event creation
type CreateEventRequest struct {
	VenueID                       int       `json:"venue_id"`
	OrganizerID                   int       `json:"organizer_id"`
	EventName                     string    `json:"title"`
	Description                   string    `json:"description"`
	EventStart                    time.Time `json:"starts_at"`
	EventEnd                      time.Time `json:"ends_at"`
	EntertainmentTaxRate          float64   `json:"entertainment_tax_rate"`
	EntertainmentTaxPassedToBuyer bool      `json:"entertainment_tax_passed_to_buyer"`
	EventTypeID                   int       `json:"event_type_id"`
}

// UpdateEventRequest holds incoming payload data for editing an existing
// event's core details. No OrganizerID (ownership doesn't change) and no
// cover image (still multipart-only, unchanged by this JSON endpoint).
type UpdateEventRequest struct {
	VenueID                       int       `json:"venue_id"`
	EventName                     string    `json:"title"`
	Description                   string    `json:"description"`
	EventStart                    time.Time `json:"starts_at"`
	EventEnd                      time.Time `json:"ends_at"`
	EntertainmentTaxRate          float64   `json:"entertainment_tax_rate"`
	EntertainmentTaxPassedToBuyer bool      `json:"entertainment_tax_passed_to_buyer"`
	EventTypeID                   int       `json:"event_type_id"`
}

// BindLayoutRequest binds an event to a venue layout. A null layout_id unbinds
// (clears) the event's current layout.
type BindLayoutRequest struct {
	LayoutID *int `json:"layout_id"`
}

// VenueResponse defines a cleaned venue data payload for API outputs (hides raw audit timestamps)
type VenueResponse struct {
	ID            int    `json:"venue_id"`
	Name          string `json:"name"`
	Address       string `json:"address"`
	City          string `json:"city"`
	Province      string `json:"province"`
	TotalCapacity int    `json:"total_capacity"`
}

// EventTypeResponse defines a cleaned event-type payload for API outputs
type EventTypeResponse struct {
	ID        int    `json:"event_type_id"`
	EventType string `json:"event_type"`
}

// OrganizerResponse defines a cleaned organizer payload for API outputs
type OrganizerResponse struct {
	ID         int    `json:"organizer_id"`
	Name       string `json:"name"`
	AvatarURL  string `json:"avatar_url"`
	ProfileURL string `json:"profile_url"`
}

// EventListResponse defines a optimized payload returned on event discovery list query (excludes description and tax rate)
type EventListResponse struct {
	ID            int                `json:"event_id"`
	Title         string             `json:"title"`
	EventStart    time.Time          `json:"starts_at"`
	EventEnd      time.Time          `json:"ends_at"`
	Category      string             `json:"category"`
	CoverImageURL string             `json:"cover_image_url"`
	Venue         *VenueResponse     `json:"venue,omitempty"`
	Organizer     *OrganizerResponse `json:"organizer,omitempty"`
}

// EventDetailResponse defines a complete payload returned on single event details query (includes description and tax rate)
type EventDetailResponse struct {
	ID                            int                `json:"event_id"`
	Title                         string             `json:"title"`
	Description                   string             `json:"description"`
	EventStart                    time.Time          `json:"starts_at"`
	EventEnd                      time.Time          `json:"ends_at"`
	Category                      string             `json:"category"`
	EventTypeID                   int                `json:"event_type_id"` // real FK, unlike Category which is a lossy display string
	Status                        string             `json:"status"`
	EntertainmentTaxRate          float64            `json:"entertainment_tax_rate"`
	EntertainmentTaxPassedToBuyer bool               `json:"entertainment_tax_passed_to_buyer"`
	CoverImageURL                 string             `json:"cover_image_url"`
	LayoutID                      *int               `json:"layout_id"` // bound venue layout; null = none
	Venue                         *VenueResponse     `json:"venue,omitempty"`
	Organizer                     *OrganizerResponse `json:"organizer,omitempty"`
}

// MapVenue translates standard Venue domain entity to VenueResponse DTO
func MapVenue(v *Venue) *VenueResponse {
	if v == nil {
		return nil
	}
	return &VenueResponse{
		ID:            v.ID,
		Name:          v.Name,
		Address:       v.Address,
		City:          v.City,
		Province:      v.Province,
		TotalCapacity: v.TotalCapacity,
	}
}

// MapOrganizer translates standard Organizer domain entity to OrganizerResponse DTO
func MapOrganizer(o *Organizer) *OrganizerResponse {
	if o == nil {
		return nil
	}
	return &OrganizerResponse{
		ID:         o.ID,
		Name:       o.Name,
		AvatarURL:  o.AvatarURL,
		ProfileURL: fmt.Sprintf("/organizers/%d", o.ID),
	}
}

// MapEventType translates standard EventType domain entity to EventTypeResponse DTO
func MapEventType(t *EventType) *EventTypeResponse {
	if t == nil {
		return nil
	}
	return &EventTypeResponse{
		ID:        t.ID,
		EventType: t.EventType,
	}
}

// MapEventToList translates standard Event domain entity to EventListResponse DTO
func MapEventToList(e *Event) *EventListResponse {
	if e == nil {
		return nil
	}
	return &EventListResponse{
		ID:            e.ID,
		Title:         e.EventName,
		EventStart:    e.EventStart,
		EventEnd:      e.EventEnd,
		Category:      mapCategory(e.EventTypeID),
		CoverImageURL: e.CoverImageURL,
		Venue:         MapVenue(e.Venue),
		Organizer:     MapOrganizer(e.Organizer),
	}
}

// MapEventToDetail translates standard Event domain entity to EventDetailResponse DTO
func MapEventToDetail(e *Event) *EventDetailResponse {
	if e == nil {
		return nil
	}
	return &EventDetailResponse{
		ID:                            e.ID,
		Title:                         e.EventName,
		Description:                   e.Description,
		EventStart:                    e.EventStart,
		EventEnd:                      e.EventEnd,
		Category:                      mapCategory(e.EventTypeID),
		EventTypeID:                   e.EventTypeID,
		Status:                        e.Status,
		EntertainmentTaxRate:          e.EntertainmentTaxRate,
		EntertainmentTaxPassedToBuyer: e.EntertainmentTaxPassedToBuyer,
		CoverImageURL:                 e.CoverImageURL,
		LayoutID:                      e.LayoutID,
		Venue:                         MapVenue(e.Venue),
		Organizer:                     MapOrganizer(e.Organizer),
	}
}

func mapCategory(id int) string {
	switch id {
	case 1:
		return "concert"
	case 2:
		return "festival"
	case 3:
		return "sport"
	case 4:
		return "conference"
	case 5:
		return "exhibition"
	case 6:
		return "community"
	case 7:
		return "workshop_seminar"
	default:
		return "other"
	}
}
