package event

import (
	"errors"
	"sync"
	"time"
)

type InMemoryRepository struct {
	mu     sync.RWMutex
	events map[int]*Event
}

func NewInMemoryRepository() *InMemoryRepository {
	repo := &InMemoryRepository{
		events: make(map[int]*Event),
	}

	// Seed some initial event data
	_ = repo.Create(&Event{
		ID:          1,
		EventName:   "Grand Symphony Orchestra",
		Description: "A beautiful classical orchestra concert under the stars.",
		VenueID:     1,
		EventStart:  time.Now().AddDate(0, 1, 0),
		EventEnd:    time.Now().AddDate(0, 1, 1),
		Status:      "approved",
	})
	_ = repo.Create(&Event{
		ID:          2,
		EventName:   "Rock & Roll Arena Tour",
		Description: "Experience live rock and roll performance with cutting-edge visual effects.",
		VenueID:     2,
		EventStart:  time.Now().AddDate(0, 2, 15),
		EventEnd:    time.Now().AddDate(0, 2, 16),
		Status:      "approved",
	})

	return repo
}

func (r *InMemoryRepository) GetAll() ([]*Event, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	list := make([]*Event, 0, len(r.events))
	for _, val := range r.events {
		list = append(list, val)
	}
	return list, nil
}

func (r *InMemoryRepository) GetByID(id int) (*Event, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	evt, exists := r.events[id]
	if !exists {
		return nil, errors.New("event not found")
	}
	return evt, nil
}

func (r *InMemoryRepository) Create(event *Event) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if event.ID == 0 {
		return errors.New("event must have a valid ID")
	}
	r.events[event.ID] = event
	return nil
}

