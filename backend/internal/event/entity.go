package event

import "time"

type Event struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	VenueName   string    `json:"venue_name"`
	TotalSeats  int       `json:"total_seats"`
	EventDate   time.Time `json:"event_date"`
}

type Repository interface {
	GetAll() ([]*Event, error)
	GetByID(id string) (*Event, error)
	Create(event *Event) error
}

type Service interface {
	ListEvents() ([]*Event, error)
	GetEventDetails(id string) (*Event, error)
	CreateEvent(event *Event) error
}
