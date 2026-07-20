package resale

import "time"

// ResaleListing maps to the ticket_resale_listings table row, enriched with
// joined data from tickets, events, venues, ticket_tiers, and users for
// display on the marketplace browsing surface.
type ResaleListing struct {
	ID                  string    `json:"id"`
	TicketID            string    `json:"ticket_id"`
	SellerID            int       `json:"seller_id"`
	BuyerID             *int      `json:"buyer_id,omitempty"`
	OriginalTicketPrice float64   `json:"original_ticket_price"`
	ListingPrice        float64   `json:"listing_price"`
	ResaleOrderID       *string   `json:"resale_order_id,omitempty"`
	Status              string    `json:"status"` // "active", "sold", "expired", "cancelled"
	CreatedAt           time.Time `json:"created_at"`
	ExpiresAt           time.Time `json:"expires_at"`
	UpdatedAt           time.Time `json:"updated_at"`

	// Joined fields for display (populated by repository queries)
	EventID       int       `json:"event_id"`
	EventName     string    `json:"event_name"`
	EventStart    time.Time `json:"event_start"`
	EventEnd      time.Time `json:"event_end"`
	EventTypeID   int       `json:"event_type_id"`
	CoverImageURL string    `json:"cover_image_url"`
	VenueName     string    `json:"venue_name"`
	VenueCity     string    `json:"venue_city"`
	TierName      string    `json:"tier_name"`
	SellerName    string    `json:"seller_name"`
}

// Repository defines the data-access contract for resale listings.
type Repository interface {
	ListActive(limit, offset int) ([]*ResaleListing, error)
	GetByID(id string) (*ResaleListing, error)
	GetBySellerID(sellerID int) ([]*ResaleListing, error)
	Create(listing *ResaleListing) error
	Cancel(id string, sellerID int) error
	IsTicketOwnedBy(ticketID string, userID int) (bool, error)
	IsTicketAlreadyListed(ticketID string) (bool, error)
}

// Service defines the business-logic contract for resale listings.
type Service interface {
	ListActiveListings(limit, offset int) ([]*ResaleListing, error)
	GetListingDetail(id string) (*ResaleListing, error)
	GetMyListings(sellerID int) ([]*ResaleListing, error)
	CreateListing(sellerID int, req CreateListingRequest) (*ResaleListing, error)
	CancelListing(id string, sellerID int) error
}
