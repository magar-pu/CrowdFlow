package event

import "time"

type Event struct {
	ID                            int       `json:"event_id"`
	VenueID                       int       `json:"venue_id"`
	OrganizerID                   int       `json:"organizer_id"`
	EventName                     string    `json:"event_name"`
	Description                   string    `json:"description"`
	EventStart                    time.Time `json:"event_start"`
	EventEnd                      time.Time `json:"event_end"`
	EntertainmentTaxRate          float64   `json:"entertainment_tax_rate"`
	EntertainmentTaxPassedToBuyer bool      `json:"entertainment_tax_passed_to_buyer"`
	Status                        string    `json:"status"` // "draft", "pending_review", "approved", "rejected"
	CreatedAt                     time.Time `json:"created_at"`
	UpdatedAt                     time.Time `json:"updated_at"`
	EventTypeID                   int       `json:"event_type_id"`
	CoverImageURL                 string    `json:"cover_image_url"`
}

type Repository interface {
	GetAll() ([]*Event, error)
	GetByID(id int) (*Event, error)
	Create(event *Event) error
}

type Service interface {
	ListEvents() ([]*Event, error)
	GetEventDetails(id int) (*Event, error)
	CreateEvent(event *Event) error
	PublishEvent(id int) error
}

