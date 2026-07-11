package event

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) GetAll(limit, offset int) ([]*Event, error) {
	rows, err := r.db.Query(`
		SELECT 
			e.id, e.venue_id, e.organizer_id, e.event_name, COALESCE(e.description, ''), e.event_start, e.event_end, 
			e.entertainment_tax_rate, e.entertainment_tax_passed_to_buyer, e.status, e.created_at, e.updated_at, 
			e.event_type_id, COALESCE(e.cover_image_url, ''),
			v.id, COALESCE(v.name, ''), COALESCE(v.address, ''), COALESCE(v.city, ''), COALESCE(v.province, ''), COALESCE(v.total_capacity, 0),
			u.id, COALESCE(up.full_name, ''), COALESCE(up.avatar_pic, '')
		FROM events e
		LEFT JOIN venues v ON e.venue_id = v.id
		LEFT JOIN users u ON e.organizer_id = u.id
		LEFT JOIN user_profiles up ON u.id = up.user_id
		WHERE e.status = 'approved'
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
		
		var vID sql.NullInt64
		var vName sql.NullString
		var vAddress sql.NullString
		var vCity sql.NullString
		var vProvince sql.NullString
		var vCapacity sql.NullInt64
		
		var oID sql.NullInt64
		var oName sql.NullString
		var oAvatar sql.NullString

		err := rows.Scan(
			&e.ID, &e.VenueID, &e.OrganizerID, &e.EventName, &e.Description, &e.EventStart, &e.EventEnd,
			&e.EntertainmentTaxRate, &e.EntertainmentTaxPassedToBuyer, &e.Status, &e.CreatedAt, &e.UpdatedAt,
			&eventTypeID, &coverImageURL,
			&vID, &vName, &vAddress, &vCity, &vProvince, &vCapacity,
			&oID, &oName, &oAvatar,
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

		if vID.Valid {
			e.Venue = &Venue{
				ID:            int(vID.Int64),
				Name:          vName.String,
				Address:       vAddress.String,
				City:          vCity.String,
				Province:      vProvince.String,
				TotalCapacity: int(vCapacity.Int64),
			}
		}

		if oID.Valid {
			e.Organizer = &Organizer{
				ID:        int(oID.Int64),
				Name:      oName.String,
				AvatarURL: oAvatar.String,
			}
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
	
	var vID sql.NullInt64
	var vName sql.NullString
	var vAddress sql.NullString
	var vCity sql.NullString
	var vProvince sql.NullString
	var vCapacity sql.NullInt64
	
	var oID sql.NullInt64
	var oName sql.NullString
	var oAvatar sql.NullString

	err := r.db.QueryRow(`
		SELECT 
			e.id, e.venue_id, e.organizer_id, e.event_name, COALESCE(e.description, ''), e.event_start, e.event_end, 
			e.entertainment_tax_rate, e.entertainment_tax_passed_to_buyer, e.status, e.created_at, e.updated_at, 
			e.event_type_id, COALESCE(e.cover_image_url, ''),
			v.id, COALESCE(v.name, ''), COALESCE(v.address, ''), COALESCE(v.city, ''), COALESCE(v.province, ''), COALESCE(v.total_capacity, 0),
			u.id, COALESCE(up.full_name, ''), COALESCE(up.avatar_pic, '')
		FROM events e
		LEFT JOIN venues v ON e.venue_id = v.id
		LEFT JOIN users u ON e.organizer_id = u.id
		LEFT JOIN user_profiles up ON u.id = up.user_id
		WHERE e.id = $1
	`, id).Scan(
		&e.ID, &e.VenueID, &e.OrganizerID, &e.EventName, &e.Description, &e.EventStart, &e.EventEnd,
		&e.EntertainmentTaxRate, &e.EntertainmentTaxPassedToBuyer, &e.Status, &e.CreatedAt, &e.UpdatedAt,
		&eventTypeID, &coverImageURL,
		&vID, &vName, &vAddress, &vCity, &vProvince, &vCapacity,
		&oID, &oName, &oAvatar,
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

	if vID.Valid {
		e.Venue = &Venue{
			ID:            int(vID.Int64),
			Name:          vName.String,
			Address:       vAddress.String,
			City:          vCity.String,
			Province:      vProvince.String,
			TotalCapacity: int(vCapacity.Int64),
		}
	}

	if oID.Valid {
		e.Organizer = &Organizer{
			ID:        int(oID.Int64),
			Name:      oName.String,
			AvatarURL: oAvatar.String,
		}
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

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// 1. Begin Database Transaction
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() // Rollback is ignored if transaction is committed
	// 2. Insert into events table
	eventQuery := `
		INSERT INTO events (
			venue_id, organizer_id, event_name, description, event_start, event_end,
			entertainment_tax_rate, entertainment_tax_passed_to_buyer, status,
			event_type_id, cover_image_url
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at, updated_at`
	err = tx.QueryRowContext(ctx, eventQuery,
		event.VenueID, event.OrganizerID, event.EventName, event.Description, event.EventStart, event.EventEnd,
		event.EntertainmentTaxRate, event.EntertainmentTaxPassedToBuyer, event.Status,
		eventTypeID, event.CoverImageURL,
	).Scan(&event.ID, &event.CreatedAt, &event.UpdatedAt)
	if err != nil {
		return err
	}
	// 3. Grant the creator the Event Organizer role (role_id = 3) scoped to this event
	roleQuery := `
		INSERT INTO user_roles (user_id, event_id, role_id)
		VALUES ($1, $2, 3)`
	_, err = tx.ExecContext(ctx, roleQuery, event.OrganizerID, event.ID)
	if err != nil {
		return err
	}
	// 4. Commit transaction
	return tx.Commit()
}

func (r *PostgresRepository) ListVenues() ([]*Venue, error) {
	rows, err := r.db.Query(`
		SELECT id, name, address, city, province, total_capacity
		FROM venues
		ORDER BY name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var venues []*Venue
	for rows.Next() {
		var v Venue
		if err := rows.Scan(&v.ID, &v.Name, &v.Address, &v.City, &v.Province, &v.TotalCapacity); err != nil {
			return nil, err
		}
		venues = append(venues, &v)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return venues, nil
}

func (r *PostgresRepository) ListEventTypes() ([]*EventType, error) {
	rows, err := r.db.Query(`
		SELECT id, event_type
		FROM event_types
		ORDER BY id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var eventTypes []*EventType
	for rows.Next() {
		var t EventType
		if err := rows.Scan(&t.ID, &t.EventType); err != nil {
			return nil, err
		}
		eventTypes = append(eventTypes, &t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return eventTypes, nil
}



