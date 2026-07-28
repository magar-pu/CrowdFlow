package booking

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"crowdflow-backend/internal/mail"
)

const holdTTL = 10 * time.Minute

type BookingService struct {
	repo        Repository
	mailService mail.Service
}

func NewBookingService(repo Repository, mailService mail.Service) *BookingService {
	return &BookingService{repo: repo, mailService: mailService}
}

func (s *BookingService) SendETicketEmail(toEmail string, eventTitle string, dateVenue string, qrCodeURL string, ticketTier string) {
	if s.mailService == nil {
		return
	}
	go func() {
		if err := s.mailService.SendETicket(toEmail, eventTitle, dateVenue, qrCodeURL, ticketTier); err != nil {
			log.Printf("[BOOKING MAIL ERROR] Failed to send E-Ticket email to %s: %v", toEmail, err)
		}
	}()
}

// ErrEventNotOnSale means the event is not visible to buyers — never approved,
// withdrawn from sale by its organizer, or archived. Handlers turn it into a
// 404 rather than a 403, so an event id cannot be confirmed by probing.
var ErrEventNotOnSale = errors.New("event is not on sale")

// BookingError is a hold failure the buyer can do something about, carrying the
// exact wording to show them.
//
// Every one of these used to reach the browser as a single 409 reading "Failed
// to process hold request", because the handler discarded the service's error
// and substituted its own. A buyer whose seat had just been taken, one who hit
// a per-order cap, and one whose sales window had closed all saw the same
// sentence and had no idea which had happened.
//
// Anything NOT of this type is an internal fault and is deliberately not
// surfaced — those still become a generic 500.
type BookingError struct {
	Status  int
	Code    string
	Message string
}

func (e *BookingError) Error() string { return e.Message }

func conflict(code, message string) *BookingError {
	return &BookingError{Status: http.StatusConflict, Code: code, Message: message}
}

func unprocessable(code, message string) *BookingError {
	return &BookingError{Status: http.StatusUnprocessableEntity, Code: code, Message: message}
}

func (s *BookingService) ListTicketTiers(eventID int) ([]*TicketTier, error) {
	if err := s.assertOnSale(eventID); err != nil {
		return nil, err
	}
	return s.repo.ListTicketTiers(eventID)
}

func (s *BookingService) GetSeatMap(eventID int) (*SeatMap, error) {
	if err := s.assertOnSale(eventID); err != nil {
		return nil, err
	}
	return s.repo.GetSeatMap(eventID)
}

// assertOnSale guards the buyer-facing reads. Without it an unpublished event
// still served its tiers and a fully interactive seat map to anyone with the
// link; the refusal only came at the hold, after the buyer had picked seats.
func (s *BookingService) assertOnSale(eventID int) error {
	onSale, err := s.repo.IsEventOnSale(eventID)
	if err != nil {
		return err
	}
	if !onSale {
		return ErrEventNotOnSale
	}
	return nil
}

// CreateHold locks inventory for a buyer's selection.
//
// Assigned seating may span several tiers in one hold: the seat locks are keyed
// by seat id and never cared about tiers. Each seat's tier is resolved from
// event_seats_matrix rather than taken from the request — see HoldRequest for
// why — and every tier involved is validated independently.
//
// General admission remains one tier per hold: there are no seats to derive a
// tier from, and its inventory is a per-tier counter.
func (s *BookingService) CreateHold(req HoldRequest) (*Hold, error) {
	assigned := len(req.SeatIDs) > 0

	// Malformed requests, not buyer mistakes: the UI cannot produce these, so
	// the wording targets whoever is calling the API directly.
	if assigned && req.Quantity > 0 {
		return nil, unprocessable("INVALID_REQUEST", "Send either seats or a quantity, not both.")
	}
	if !assigned && req.TicketTierID <= 0 {
		return nil, unprocessable("INVALID_REQUEST", "Choose a ticket type before continuing.")
	}
	if !assigned && req.Quantity <= 0 {
		return nil, unprocessable("INVALID_REQUEST", "Choose how many tickets you want.")
	}

	// tierCounts is how many tickets this hold takes from each tier, which is
	// what the per-tier caps and bookability are checked against.
	tierCounts := map[int]int{}

	if assigned {
		assignments, err := s.repo.ResolveSeatTiers(req.EventID, req.SeatIDs)
		if err != nil {
			return nil, err
		}
		// A seat missing from the result is not on this event, so it has no
		// tier and no price. Refused rather than silently dropped.
		if len(assignments) != len(req.SeatIDs) {
			return nil, unprocessable(
				"SEATS_NOT_FOUND",
				"Some of those seats aren't part of this event. Please refresh the page and pick again.",
			)
		}
		for _, a := range assignments {
			tierCounts[a.TicketTierID]++
		}

		// A tier that sells assigned seats must not also be held by quantity,
		// and vice versa; resolving from the matrix already guarantees the
		// former, so only the GA branch needs the explicit check.
	} else {
		tierCounts[req.TicketTierID] = req.Quantity

		isAssigned, err := s.repo.IsAssignedSeating(req.TicketTierID)
		if err != nil {
			return nil, err
		}
		if isAssigned {
			return nil, unprocessable(
				"SEATS_REQUIRED",
				"This ticket type has assigned seating. Please pick your seats on the map.",
			)
		}
	}

	for tierID, count := range tierCounts {
		// Checked before anything else: an event the organizer has withdrawn
		// from public listing, or a tier whose sales window has closed, must
		// not take new orders — even via a direct link, a stale tab or a
		// hand-rolled call.
		bookable, err := s.repo.IsTierBookable(tierID)
		if err != nil {
			return nil, err
		}
		if !bookable {
			return nil, conflict(
				"SALES_CLOSED",
				"These tickets are no longer on sale.",
			)
		}

		// The organizer's per-order cap (Tickets tab), applied per tier — that
		// is what the field means, so 4 VIP plus 4 Regular is allowed when both
		// caps are 4. It was previously only reported to the buyer as
		// max_per_transaction and never checked. Enforced before any inventory
		// is acquired so a rejected request leaves nothing held. 0 means
		// uncapped.
		maxPerOrder, err := s.repo.GetMaxPerOrder(tierID)
		if err != nil {
			return nil, err
		}
		if maxPerOrder > 0 && count > maxPerOrder {
			return nil, unprocessable("PER_ORDER_LIMIT", fmt.Sprintf(
				"You can buy up to %d of these tickets per order.", maxPerOrder,
			))
		}
	}

	holdToken := generateHoldToken()

	if assigned {
		ok, err := s.repo.AcquireSeatHolds(req.EventID, req.SeatIDs, holdToken, holdTTL)
		if err != nil {
			return nil, err
		}
		if !ok {
			// The common race: someone else held or bought one of these seats
			// between the map being drawn and this click. The hold is
			// all-or-nothing, so nothing is locked and the buyer starts over.
			return nil, conflict(
				"SEATS_TAKEN",
				"Someone just took one of those seats. We've refreshed the map — please pick again.",
			)
		}
	} else {
		ok, err := s.repo.AcquireGAHold(req.TicketTierID, req.Quantity)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, conflict(
				"NOT_ENOUGH_TICKETS",
				"There aren't enough tickets left in this category. Try a smaller quantity.",
			)
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

// GetHold resolves a hold token into what the buyer is about to pay for.
//
// Checkout is the only caller. It exists because the token is all that survives
// the navigation out of seat selection, and rebuilding the cart from the query
// string would let a buyer choose their own prices.
//
// The token is the capability: it is 128 bits of crypto/rand and is not
// guessable, but the hold carries no purchaser id, so possession is all that is
// checked here — the same as ReleaseHold.
func (s *BookingService) GetHold(holdToken string) (*HoldDetail, error) {
	req, err := s.repo.GetHoldMetadata(holdToken)
	if err != nil {
		return nil, err
	}

	detail, err := s.repo.DescribeHold(req)
	if err != nil {
		return nil, err
	}

	ttl, err := s.repo.GetHoldTTL(holdToken)
	if err != nil {
		return nil, err
	}
	if ttl <= 0 {
		return nil, errors.New("hold not found or already expired")
	}

	detail.HoldToken = holdToken
	detail.ExpiresAt = time.Now().Add(ttl)
	return detail, nil
}

func (s *BookingService) ReleaseHold(holdToken string) error {
	req, err := s.repo.GetHoldMetadata(holdToken)
	if err != nil {
		return err
	}

	// Which inventory to hand back is decided by the hold's own shape, not by
	// re-querying the tier: seat locks are released by seat id and span tiers,
	// while a GA hold releases a per-tier counter.
	if len(req.SeatIDs) > 0 {
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
