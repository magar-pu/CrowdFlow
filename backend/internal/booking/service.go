package booking

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"
)

const holdTTL = 10 * time.Minute

type BookingService struct {
	repo Repository
}

func NewBookingService(repo Repository) *BookingService {
	return &BookingService{repo: repo}
}

func (s *BookingService) ListTicketTiers(eventID int) ([]*TicketTier, error) {
	return s.repo.ListTicketTiers(eventID)
}

func (s *BookingService) GetSeatMap(eventID int) (*SeatMap, error) {
	return s.repo.GetSeatMap(eventID)
}

func (s *BookingService) CreateHold(req HoldRequest) (*Hold, error) {
	if req.TicketTierID <= 0 {
		return nil, errors.New("ticket_tier_id is required")
	}

	// Checked before anything else: an event the organizer has withdrawn from
	// public listing must not take new orders, even via a direct link or a
	// hand-rolled API call.
	bookable, err := s.repo.IsTierBookable(req.TicketTierID)
	if err != nil {
		return nil, err
	}
	if !bookable {
		return nil, errors.New("this event is not currently on sale")
	}

	assigned, err := s.repo.IsAssignedSeating(req.TicketTierID)
	if err != nil {
		return nil, err
	}

	requested := req.Quantity
	if assigned {
		if len(req.SeatIDs) == 0 {
			return nil, errors.New("seat_ids is required for assigned-seating tiers")
		}
		if req.Quantity > 0 {
			return nil, errors.New("quantity must not be set for assigned-seating tiers")
		}
		requested = len(req.SeatIDs)
	} else {
		if req.Quantity <= 0 {
			return nil, errors.New("quantity is required for general admission tiers")
		}
		if len(req.SeatIDs) > 0 {
			return nil, errors.New("seat_ids must not be set for general admission tiers")
		}
	}

	// The organizer's per-order cap (Tickets tab). It was previously only
	// reported to the buyer as max_per_transaction and never checked, so the
	// setting had no effect. Enforced before any inventory is acquired so a
	// rejected request leaves nothing held. A cap of 0 means uncapped.
	maxPerOrder, err := s.repo.GetMaxPerOrder(req.TicketTierID)
	if err != nil {
		return nil, err
	}
	if maxPerOrder > 0 && requested > maxPerOrder {
		return nil, fmt.Errorf("this ticket type is limited to %d per order", maxPerOrder)
	}

	holdToken := generateHoldToken()

	if assigned {
		ok, err := s.repo.AcquireSeatHolds(req.EventID, req.SeatIDs, holdToken, holdTTL)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, errors.New("one or more selected seats are no longer available")
		}
	} else {
		ok, err := s.repo.AcquireGAHold(req.TicketTierID, req.Quantity)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, errors.New("not enough tickets remaining in this tier")
		}
	}

	if err := s.repo.StoreHoldMetadata(holdToken, req, holdTTL); err != nil {
		// Best-effort rollback of the acquired inventory if we can't record
		// how to release it later.
		if assigned {
			_ = s.repo.ReleaseSeatHolds(req.EventID, req.SeatIDs, holdToken)
		} else {
			_ = s.repo.ReleaseGAHold(req.TicketTierID, req.Quantity)
		}
		return nil, err
	}

	return &Hold{HoldToken: holdToken, ExpiresAt: time.Now().Add(holdTTL)}, nil
}

func (s *BookingService) ReleaseHold(holdToken string) error {
	req, err := s.repo.GetHoldMetadata(holdToken)
	if err != nil {
		return err
	}

	assigned, err := s.repo.IsAssignedSeating(req.TicketTierID)
	if err != nil {
		return err
	}

	if assigned {
		if err := s.repo.ReleaseSeatHolds(req.EventID, req.SeatIDs, holdToken); err != nil {
			return err
		}
	} else {
		if err := s.repo.ReleaseGAHold(req.TicketTierID, req.Quantity); err != nil {
			return err
		}
	}

	return s.repo.DeleteHoldMetadata(holdToken)
}

func generateHoldToken() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
