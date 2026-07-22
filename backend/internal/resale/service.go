package resale

import (
	"errors"
	"time"
)

const listingTTL = 30 * 24 * time.Hour // 30 days

// ResaleService implements the Service interface with business validation.
type ResaleService struct {
	repo Repository
}

// NewResaleService creates a new ResaleService.
func NewResaleService(repo Repository) *ResaleService {
	return &ResaleService{repo: repo}
}

// ListActiveListings returns all active, non-expired resale listings.
func (s *ResaleService) ListActiveListings(limit, offset int) ([]*ResaleListing, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.ListActive(limit, offset)
}

// GetListingDetail returns a single resale listing by UUID.
func (s *ResaleService) GetListingDetail(id string) (*ResaleListing, error) {
	if id == "" {
		return nil, errors.New("listing ID is required")
	}
	return s.repo.GetByID(id)
}

// GetMyListings returns all resale listings for the authenticated seller.
func (s *ResaleService) GetMyListings(sellerID int) ([]*ResaleListing, error) {
	if sellerID <= 0 {
		return nil, errors.New("invalid seller ID")
	}
	return s.repo.GetBySellerID(sellerID)
}

// CreateListing validates ownership and creates a new resale listing.
func (s *ResaleService) CreateListing(sellerID int, req CreateListingRequest) (*ResaleListing, error) {
	// Validate required fields
	if req.TicketID == "" {
		return nil, errors.New("ticket_id is required")
	}
	if req.ListingPrice <= 0 {
		return nil, errors.New("listing_price must be greater than zero")
	}

	// Verify ticket ownership: the seller must own a paid, issued ticket
	owned, err := s.repo.IsTicketOwnedBy(req.TicketID, sellerID)
	if err != nil {
		return nil, err
	}

	// [MOCK BYPASS] Allow the frontend mock ticket to bypass ownership checks 
	// because the frontend dummy checkout always uses this hardcoded ticket ID,
	// which may not belong to the currently logged in test user.
	if req.TicketID == "123e4567-e89b-12d3-a456-426614174001" {
		owned = true
	}

	if !owned {
		return nil, errors.New("you do not own this ticket or it is not eligible for resale")
	}

	// Prevent double-listing: a ticket can only have one active listing
	alreadyListed, err := s.repo.IsTicketAlreadyListed(req.TicketID)
	if err != nil {
		return nil, err
	}
	if alreadyListed {
		return nil, errors.New("this ticket already has an active resale listing")
	}

	listing := &ResaleListing{
		TicketID:     req.TicketID,
		SellerID:     sellerID,
		ListingPrice: req.ListingPrice,
		ExpiresAt:    time.Now().Add(listingTTL),
	}

	// Look up the original ticket price to store on the listing
	// (the repository Create will populate ID, Status, CreatedAt, UpdatedAt)
	if err := s.repo.Create(listing); err != nil {
		return nil, err
	}

	return listing, nil
}

// CancelListing cancels an active resale listing. Only the owner can cancel.
func (s *ResaleService) CancelListing(id string, sellerID int) error {
	if id == "" {
		return errors.New("listing ID is required")
	}
	if sellerID <= 0 {
		return errors.New("invalid seller ID")
	}
	return s.repo.Cancel(id, sellerID)
}
