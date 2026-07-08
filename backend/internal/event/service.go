package event

import (
	"errors"
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

func (s *EventService) PublishEvent(id int) error {
	if id <= 0 {
		return errors.New("event ID must be greater than zero")
	}
	// Stub implementation for authorization middleware testing
	return nil
}

