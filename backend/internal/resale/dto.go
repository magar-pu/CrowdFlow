package resale

import (
	"fmt"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────
// Request DTOs
// ─────────────────────────────────────────────────────────────────────────

// CreateListingRequest captures the incoming payload for creating a new
// resale listing. The seller_id is extracted from JWT claims, not from
// the request body.
type CreateListingRequest struct {
	TicketID     string  `json:"ticket_id"`
	ListingPrice float64 `json:"listing_price"`
}

// ─────────────────────────────────────────────────────────────────────────
// Response DTOs
// ─────────────────────────────────────────────────────────────────────────

// ResaleListingListResponse is the slim card payload returned when browsing
// the resale marketplace grid. Mirrors the frontend's ResaleListing interface.
type ResaleListingListResponse struct {
	ID               string  `json:"listing_id"`
	EventID          int     `json:"event_id"`
	EventTitle       string  `json:"event_title"`
	EventCategory    string  `json:"event_category"`
	CoverImageURL    string  `json:"cover_image_url"`
	TicketCount      int     `json:"ticket_count"`
	IsVIP            bool    `json:"is_vip"`
	EventDateLabel   string  `json:"event_date_label"`
	VenueLabel       string  `json:"venue_label"`
	OriginalPrice    float64 `json:"original_face_value"`
	ListingPrice     float64 `json:"resale_price_per_ticket"`
	IsVerified       bool    `json:"is_verified"`
	Status           string  `json:"status"`
}

// ResaleListingDetailResponse is the full payload returned for a single
// listing detail page.
type ResaleListingDetailResponse struct {
	ID               string    `json:"listing_id"`
	EventID          int       `json:"event_id"`
	EventTitle       string    `json:"event_title"`
	EventCategory    string    `json:"event_category"`
	CoverImageURL    string    `json:"cover_image_url"`
	TicketCount      int       `json:"ticket_count"`
	IsVIP            bool      `json:"is_vip"`
	EventDateLabel   string    `json:"event_date_label"`
	VenueLabel       string    `json:"venue_label"`
	OriginalPrice    float64   `json:"original_face_value"`
	ListingPrice     float64   `json:"resale_price_per_ticket"`
	IsVerified       bool      `json:"is_verified"`
	Status           string    `json:"status"`
	SellerName       string    `json:"seller_name"`
	TierName         string    `json:"tier_name"`
	CreatedAt        time.Time `json:"created_at"`
	ExpiresAt        time.Time `json:"expires_at"`
}

// ─────────────────────────────────────────────────────────────────────────
// Mapper functions
// ─────────────────────────────────────────────────────────────────────────

// MapToListResponse translates the internal ResaleListing domain entity
// into the slim browsing-surface DTO.
func MapToListResponse(l *ResaleListing) *ResaleListingListResponse {
	if l == nil {
		return nil
	}
	return &ResaleListingListResponse{
		ID:             l.ID,
		EventID:        l.EventID,
		EventTitle:     l.EventName,
		EventCategory:  mapEventCategory(l.EventTypeID),
		CoverImageURL:  l.CoverImageURL,
		TicketCount:    1, // each listing is for a single ticket
		IsVIP:          false,
		EventDateLabel: formatEventDate(l.EventStart),
		VenueLabel:     fmt.Sprintf("%s, %s", l.VenueName, l.VenueCity),
		OriginalPrice:  l.OriginalTicketPrice,
		ListingPrice:   l.ListingPrice,
		IsVerified:     true, // all listings on CrowdFlow are verified
		Status:         l.Status,
	}
}

// MapToDetailResponse translates the internal ResaleListing domain entity
// into the full detail page DTO.
func MapToDetailResponse(l *ResaleListing) *ResaleListingDetailResponse {
	if l == nil {
		return nil
	}
	return &ResaleListingDetailResponse{
		ID:             l.ID,
		EventID:        l.EventID,
		EventTitle:     l.EventName,
		EventCategory:  mapEventCategory(l.EventTypeID),
		CoverImageURL:  l.CoverImageURL,
		TicketCount:    1,
		IsVIP:          false,
		EventDateLabel: formatEventDate(l.EventStart),
		VenueLabel:     fmt.Sprintf("%s, %s", l.VenueName, l.VenueCity),
		OriginalPrice:  l.OriginalTicketPrice,
		ListingPrice:   l.ListingPrice,
		IsVerified:     true,
		Status:         l.Status,
		SellerName:     l.SellerName,
		TierName:       l.TierName,
		CreatedAt:      l.CreatedAt,
		ExpiresAt:      l.ExpiresAt,
	}
}

// formatEventDate produces a human-readable date label like "Oct 24, 2026 • 8:00 PM"
func formatEventDate(t time.Time) string {
	return t.Format("Jan 02, 2006 • 3:04 PM")
}

// mapEventCategory maps an event_type_id to its display category string,
// mirroring the mapping in event/dto.go.
func mapEventCategory(id int) string {
	switch id {
	case 1:
		return "Concert"
	case 2:
		return "Festival"
	case 3:
		return "Sports"
	case 4:
		return "Conference"
	case 5:
		return "Exhibition"
	case 6:
		return "Community"
	case 7:
		return "Workshop"
	default:
		return "Other"
	}
}
