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

func (s *EventService) ListEvents() ([]*Event, error) {
	return s.repo.GetAll()
}

func (s *EventService) GetEventDetails(id string) (*Event, error) {
	if id == "" {
		return nil, errors.New("event ID cannot be empty")
	}
	return s.repo.GetByID(id)
}

func (s *EventService) CreateEvent(event *Event) error {
	if event.Title == "" {
		return errors.New("event title is required")
	}
	if event.TotalSeats <= 0 {
		return errors.New("total seats must be greater than zero")
	}
	if event.VenueName == "" {
		return errors.New("venue name is required")
	}
	return s.repo.Create(event)
}
