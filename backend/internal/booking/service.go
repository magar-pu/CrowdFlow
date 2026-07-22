package booking

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
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

	assigned, err := s.repo.IsAssignedSeating(req.TicketTierID)
	if err != nil {
		return nil, err
	}

	if assigned {
		if len(req.SeatIDs) == 0 {
			return nil, errors.New("seat_ids is required for assigned-seating tiers")
		}
		if req.Quantity > 0 {
			return nil, errors.New("quantity must not be set for assigned-seating tiers")
		}
	} else {
		if req.Quantity <= 0 {
			return nil, errors.New("quantity is required for general admission tiers")
		}
		if len(req.SeatIDs) > 0 {
			return nil, errors.New("seat_ids must not be set for general admission tiers")
		}
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
