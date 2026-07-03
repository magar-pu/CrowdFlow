package event

import (
	"database/sql"
	"errors"
)

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) GetAll(limit, offset int) ([]*Event, error) {
	rows, err := r.db.Query(`
		SELECT id, venue_id, organizer_id, event_name, COALESCE(description, ''), event_start, event_end, 
		       entertainment_tax_rate, entertainment_tax_passed_to_buyer, status, created_at, updated_at, 
		       event_type_id, COALESCE(cover_image_url, '') 
		FROM events
		WHERE status = 'approved'
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*Event
	for rows.Next() {
		var e Event
		var eventTypeID sql.NullInt64
		var coverImageURL sql.NullString
		err := rows.Scan(
			&e.ID, &e.VenueID, &e.OrganizerID, &e.EventName, &e.Description, &e.EventStart, &e.EventEnd,
			&e.EntertainmentTaxRate, &e.EntertainmentTaxPassedToBuyer, &e.Status, &e.CreatedAt, &e.UpdatedAt,
			&eventTypeID, &coverImageURL,
		)
		if err != nil {
			return nil, err
		}
		if eventTypeID.Valid {
			e.EventTypeID = int(eventTypeID.Int64)
		}
		if coverImageURL.Valid {
			e.CoverImageURL = coverImageURL.String
		}
		events = append(events, &e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return events, nil
}

func (r *PostgresRepository) GetByID(id int) (*Event, error) {
	var e Event
	var eventTypeID sql.NullInt64
	var coverImageURL sql.NullString
	err := r.db.QueryRow(`
		SELECT id, venue_id, organizer_id, event_name, COALESCE(description, ''), event_start, event_end, 
		       entertainment_tax_rate, entertainment_tax_passed_to_buyer, status, created_at, updated_at, 
		       event_type_id, COALESCE(cover_image_url, '') 
		FROM events 
		WHERE id = $1
	`, id).Scan(
		&e.ID, &e.VenueID, &e.OrganizerID, &e.EventName, &e.Description, &e.EventStart, &e.EventEnd,
		&e.EntertainmentTaxRate, &e.EntertainmentTaxPassedToBuyer, &e.Status, &e.CreatedAt, &e.UpdatedAt,
		&eventTypeID, &coverImageURL,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("event not found")
		}
		return nil, err
	}
	if eventTypeID.Valid {
		e.EventTypeID = int(eventTypeID.Int64)
	}
	if coverImageURL.Valid {
		e.CoverImageURL = coverImageURL.String
	}
	return &e, nil
}

func (r *PostgresRepository) Create(event *Event) error {
	var eventTypeID *int
	if event.EventTypeID > 0 {
		eventTypeID = &event.EventTypeID
	}
	if event.Status == "" {
		event.Status = "draft"
	}

	err := r.db.QueryRow(`
		INSERT INTO events (
			venue_id, organizer_id, event_name, description, event_start, event_end, 
			entertainment_tax_rate, entertainment_tax_passed_to_buyer, status, 
			event_type_id, cover_image_url
		) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
		RETURNING id, created_at, updated_at
	`, 
		event.VenueID, event.OrganizerID, event.EventName, event.Description, event.EventStart, event.EventEnd,
		event.EntertainmentTaxRate, event.EntertainmentTaxPassedToBuyer, event.Status,
		eventTypeID, event.CoverImageURL,
	).Scan(&event.ID, &event.CreatedAt, &event.UpdatedAt)
	
	return err
}


