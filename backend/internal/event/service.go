package event

import (
	"errors"
)

// ErrEventNotFound and ErrEventLocked let handlers distinguish an update
// rejected because the event doesn't exist from one rejected because it's
// mid-review, instead of both collapsing into a generic 422.
var (
	ErrEventNotFound       = errors.New("event not found")
	ErrEventLocked         = errors.New("event details cannot be changed while pending review")
	ErrLayoutVenueMismatch = errors.New("layout does not belong to this event's venue")
)

type EventService struct {
	repo Repository
}

func NewEventService(repo Repository) *EventService {
	return &EventService{repo: repo}
}

func (s *EventService) ListEvents(limit, offset int) ([]*Event, error) {
	return s.repo.GetAll(limit, offset)
}

func (s *EventService) GetEventDetails(id int) (*Event, error) {
	if id <= 0 {
		return nil, errors.New("event ID must be greater than zero")
	}
	return s.repo.GetByID(id)
}

func (s *EventService) CreateEvent(event *Event) error {
	if event.EventName == "" {
		return errors.New("event name is required")
	}
	if event.VenueID <= 0 {
		return errors.New("valid venue ID is required")
	}
	if event.OrganizerID <= 0 {
		return errors.New("valid organizer ID is required")
	}
	return s.repo.Create(event)
}

func (s *EventService) UpdateEvent(event *Event) error {
	if event.ID <= 0 {
		return errors.New("event ID must be greater than zero")
	}
	if event.EventName == "" {
		return errors.New("event name is required")
	}
	if event.VenueID <= 0 {
		return errors.New("valid venue ID is required")
	}
	return s.repo.Update(event)
}

// BindEventLayout binds an event to a venue layout (or unbinds it when layoutID
// is nil). Venue-membership of the layout is enforced in the repository.
func (s *EventService) BindEventLayout(eventID int, layoutID *int) error {
	if eventID <= 0 {
		return errors.New("event ID must be greater than zero")
	}
	if layoutID != nil && *layoutID <= 0 {
		return errors.New("layout ID must be greater than zero")
	}
	return s.repo.SetEventLayout(eventID, layoutID)
}

func (s *EventService) PublishEvent(id int) error {
	if id <= 0 {
		return errors.New("event ID must be greater than zero")
	}
	// Stub implementation for authorization middleware testing
	return nil
}

func (s *EventService) ListVenues() ([]*Venue, error) {
	return s.repo.ListVenues()
}

func (s *EventService) ListEventTypes() ([]*EventType, error) {
	return s.repo.ListEventTypes()
}

