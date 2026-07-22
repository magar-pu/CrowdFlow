package event

import "time"

type Venue struct {
	ID            int       `json:"venue_id"`
	Name          string    `json:"name"`
	Address       string    `json:"address"`
	City          string    `json:"city"`
	Province      string    `json:"province"`
	TotalCapacity int       `json:"total_capacity"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type Organizer struct {
	ID        int    `json:"organizer_id"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
}

type EventType struct {
	ID        int    `json:"event_type_id"`
	EventType string `json:"event_type"`
}

type Event struct {
	ID                            int        `json:"event_id"`
	VenueID                       int        `json:"venue_id"`
	OrganizerID                   int        `json:"organizer_id"`
	EventName                     string     `json:"title"` // Mapped to 'title' for frontend
	Description                   string     `json:"description"`
	EventStart                    time.Time  `json:"starts_at"` // Mapped to 'starts_at' for frontend
	EventEnd                      time.Time  `json:"ends_at"`   // Mapped to 'ends_at' for frontend
	EntertainmentTaxRate          float64    `json:"entertainment_tax_rate"`
	EntertainmentTaxPassedToBuyer bool       `json:"entertainment_tax_passed_to_buyer"`
	Status                        string     `json:"status"` // "draft", "pending_review", "approved", "rejected"
	CreatedAt                     time.Time  `json:"created_at"`
	UpdatedAt                     time.Time  `json:"updated_at"`
	EventTypeID                   int        `json:"event_type_id"`
	CoverImageURL                 string     `json:"cover_image_url"`
	LayoutID                      *int       `json:"layout_id"` // bound venue layout; nil = none
	Venue                         *Venue     `json:"venue,omitempty"`
	Organizer                     *Organizer `json:"organizer,omitempty"`
}

type Repository interface {
	GetAll(limit, offset int) ([]*Event, error)
	GetByID(id int) (*Event, error)
	Create(event *Event) error
	Update(event *Event) error
	SetEventLayout(eventID int, layoutID *int) error
	ListVenues() ([]*Venue, error)
	ListEventTypes() ([]*EventType, error)
}

type Service interface {
	ListEvents(limit, offset int) ([]*Event, error)
	GetEventDetails(id int) (*Event, error)
	CreateEvent(event *Event) error
	UpdateEvent(event *Event) error
	BindEventLayout(eventID int, layoutID *int) error
	PublishEvent(id int) error
	ListVenues() ([]*Venue, error)
	ListEventTypes() ([]*EventType, error)
}


